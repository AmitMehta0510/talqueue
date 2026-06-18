import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { PlacementDriveApplicationStatus, CollegeOfferPolicy } from "@prisma/client";
import { processPlacementSelection } from "services/placementLockService";

interface CreatePlacementDriveData {
  driveTitle: string;
  companyId: string;
  targetCollegeId: string;
  driveType?: "PLACEMENT" | "INTERNSHIP";
  driveDate?: string;
  applyDeadline?: string;
  roles?: string[];
  stipendMin?: number;
  stipendMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  minCgpa?: number;
  maxBacklogs?: number;
  eligibleBranches?: string[];
  eligibleYears?: number[];
  isDreamCompany?: boolean;
  ppoOffered?: boolean;
  description?: string;
  internshipDurationMonths?: number;
}

interface UpdatePlacementDriveData extends Partial<CreatePlacementDriveData> {
  status?: "UPCOMING" | "ONGOING" | "CLOSED";
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Verify user has company admin access or work experience
const assertCompanyAccess = async (userId: string, companyId: string) => {
  const [exp, admin] = await Promise.all([
    prisma.experience.findFirst({
      where: { userId, companyId },
      select: { id: true },
    }),
    prisma.companyAdmin.findFirst({
      where: { userId, companyId },
      select: { id: true },
    }),
  ]);
  if (!exp && !admin) {
    throw new AppError(
      "You can only post drives for companies you are part of.",
      403,
    );
  }
};

export const isCollegeAdminOrCdcr = async (userId: string, collegeId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });
  const roleNames = new Set((user?.roles || []).map((ur) => ur.role?.name).filter(Boolean));
  if (roleNames.has("PLATFORM_ADMIN") || roleNames.has("SUPER_ADMIN") || roleNames.has("ADMIN")) {
    return true;
  }

  const collegeAdmin = await prisma.collegeAdmin.findFirst({
    where: { userId, collegeId },
    select: { id: true },
  });
  if (collegeAdmin) return true;

  const cdcrMember = await prisma.cdcrMember.findFirst({
    where: { userId, collegeId },
    select: { id: true },
  });
  if (cdcrMember) return true;

  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// ELIGIBILITY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  missingFields: string[];
}

/**
 * Checks whether a student meets the hard-lock eligibility criteria for a drive.
 * Does NOT check offer hoarding — that is a separate policy concern.
 */
export const checkDriveEligibility = async (
  userId: string,
  driveId: string,
): Promise<EligibilityResult> => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: {
      id: true,
      status: true,
      applyDeadline: true,
      minCgpa: true,
      maxBacklogs: true,
      eligibleBranches: true,
      eligibleYears: true,
      targetCollegeId: true,
      college: {
        select: {
          allowBacklogsUpTo: true,
        },
      },
    },
  });

  if (!drive) throw new AppError("Drive not found", 404);

  const reasons: string[] = [];
  const missingFields: string[] = [];

  // ── Status check ──────────────────────────────────────────────────────────
  if (drive.status === "CLOSED") {
    reasons.push("This drive is no longer accepting applications.");
  }

  // ── Deadline check ────────────────────────────────────────────────────────
  if (drive.applyDeadline && new Date() > drive.applyDeadline) {
    reasons.push(`Application deadline has passed (${drive.applyDeadline.toLocaleDateString()}).`);
  }

  // ── Fetch student's Education record for this college ─────────────────────
  const education = await prisma.education.findFirst({
    where: {
      userId,
      collegeId: drive.targetCollegeId,
    },
    select: {
      cgpa: true,
      backlogs: true,
      currentYear: true,
      collegeEmailVerified: true, // Q4: email-verified students bypass hard locks
      department: {
        select: {
          name: true,
          standardDepartment: { select: { name: true } },
        },
      },
    },
  });

  // ── Q4: Email Domain Auto-Verification Bypass ─────────────────────────────
  // If the student has verified their college email for this college, they are
  // provably enrolled — skip CGPA, branch, year, and backlog hard-lock checks.
  const isEmailVerified = education?.collegeEmailVerified === true;
  if (isEmailVerified) {
    // Only status & deadline checks apply; return early
    return {
      eligible: reasons.length === 0,
      reasons,
      missingFields,
    };
  }

  // ── CGPA check ────────────────────────────────────────────────────────────

  if (drive.minCgpa !== null && drive.minCgpa !== undefined) {
    if (education?.cgpa === null || education?.cgpa === undefined) {
      missingFields.push("cgpa");
      reasons.push(`Minimum CGPA of ${drive.minCgpa} required. Please update your education profile with your CGPA.`);
    } else if (education.cgpa < drive.minCgpa) {
      reasons.push(`Your CGPA (${education.cgpa}) is below the minimum required (${drive.minCgpa}).`);
    }
  }

  // ── Backlog check ─────────────────────────────────────────────────────────
  // Use drive-level maxBacklogs override, fall back to college-level policy
  const maxAllowedBacklogs = drive.maxBacklogs ?? drive.college.allowBacklogsUpTo;
  if (maxAllowedBacklogs === 0) {
    if ((education?.backlogs ?? 0) > 0) {
      reasons.push(`This drive requires zero active backlogs. You have ${education?.backlogs ?? 0} backlog(s).`);
    }
  } else if (maxAllowedBacklogs !== null) {
    if ((education?.backlogs ?? 0) > maxAllowedBacklogs) {
      reasons.push(`This drive allows up to ${maxAllowedBacklogs} backlog(s). You have ${education?.backlogs ?? 0}.`);
    }
  }

  // ── Branch check ──────────────────────────────────────────────────────────
  if (drive.eligibleBranches.length > 0) {
    const studentBranch = education?.department?.standardDepartment?.name ?? education?.department?.name;
    if (!studentBranch) {
      missingFields.push("department");
      reasons.push(`This drive is restricted to: ${drive.eligibleBranches.join(", ")}. Please update your education profile with your department.`);
    } else {
      const normalizedStudentBranch = studentBranch.toLowerCase().trim();
      const isEligibleBranch = drive.eligibleBranches.some(
        (branch) => branch.toLowerCase().trim() === normalizedStudentBranch,
      );
      if (!isEligibleBranch) {
        reasons.push(`Your branch (${studentBranch}) is not eligible. Eligible branches: ${drive.eligibleBranches.join(", ")}.`);
      }
    }
  }

  // ── Year of study check ───────────────────────────────────────────────────
  if (drive.eligibleYears.length > 0) {
    if (education?.currentYear === null || education?.currentYear === undefined) {
      missingFields.push("currentYear");
      reasons.push(`This drive is open to Year ${drive.eligibleYears.join("/")} students. Please update your current year of study.`);
    } else if (!drive.eligibleYears.includes(education.currentYear)) {
      reasons.push(`Your current year (Year ${education.currentYear}) is not eligible. Eligible years: Year ${drive.eligibleYears.join(", ")}.`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    missingFields,
  };
};

/**
 * Checks offer hoarding policy — whether a student is locked out of applying
 * due to already having received a placement offer from this college.
 */
const checkOfferHoardingPolicy = async (
  userId: string,
  drive: { targetCollegeId: string; isDreamCompany: boolean; id: string },
  collegePolicy: CollegeOfferPolicy,
): Promise<void> => {
  if (collegePolicy === "OPEN") return;

  if (collegePolicy === "ONE_OFFER_LOCK") {
    // If the drive is a dream company drive, allow it regardless
    if (drive.isDreamCompany) return;

    // Check if student already has a SELECTED application for this college
    const existingOffer = await prisma.placementDriveApplication.findFirst({
      where: {
        userId,
        status: PlacementDriveApplicationStatus.SELECTED,
        drive: { targetCollegeId: drive.targetCollegeId },
        NOT: { driveId: drive.id },
      },
      select: { id: true, drive: { select: { driveTitle: true } } },
    });

    if (existingOffer) {
      throw new AppError(
        `You have already received a placement offer from this college. Your college's policy (ONE_OFFER_LOCK) does not allow applying to additional drives once selected.`,
        403,
      );
    }
  }

  if (collegePolicy === "DREAM_EXCEPTION") {
    // Like ONE_OFFER_LOCK but only dream company drives are exempted
    // Non-dream drives: still block if already selected
    if (!drive.isDreamCompany) {
      const existingOffer = await prisma.placementDriveApplication.findFirst({
        where: {
          userId,
          status: PlacementDriveApplicationStatus.SELECTED,
          drive: { targetCollegeId: drive.targetCollegeId },
          NOT: { driveId: drive.id },
        },
        select: { id: true },
      });

      if (existingOffer) {
        throw new AppError(
          `You have already received a placement offer. You can only apply to dream company drives at this point (college policy: DREAM_EXCEPTION).`,
          403,
        );
      }
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DRIVE CRUD
// ─────────────────────────────────────────────────────────────────────────────

// CREATE DRIVE
export const createPlacementDrive = async (
  userId: string,
  data: CreatePlacementDriveData,
) => {
  const isTpoOrCdcr = await isCollegeAdminOrCdcr(userId, data.targetCollegeId);
  if (!isTpoOrCdcr) {
    await assertCompanyAccess(userId, data.companyId);
  }

  const college = await prisma.college.findUnique({
    where: { id: data.targetCollegeId },
    select: { id: true, name: true },
  });
  if (!college) throw new AppError("Target college not found", 404);

  return prisma.placementDrive.create({
    data: {
      driveTitle: data.driveTitle,
      companyId: data.companyId,
      targetCollegeId: data.targetCollegeId,
      postedById: userId,
      driveType: data.driveType ?? "PLACEMENT",
      driveDate: data.driveDate ? new Date(data.driveDate) : null,
      applyDeadline: data.applyDeadline ? new Date(data.applyDeadline) : null,
      roles: data.roles || [],
      stipendMin: data.stipendMin,
      stipendMax: data.stipendMax,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      currency: data.currency || "INR",
      internshipDurationMonths: data.internshipDurationMonths,
      minCgpa: data.minCgpa,
      maxBacklogs: data.maxBacklogs,
      eligibleBranches: data.eligibleBranches || [],
      eligibleYears: data.eligibleYears || [],
      isDreamCompany: data.isDreamCompany ?? false,
      ppoOffered: data.ppoOffered ?? false,
      description: data.description,
    },
    include: {
      company: {
        select: { id: true, name: true, logoUrl: true, slug: true },
      },
      college: {
        select: { id: true, name: true },
      },
    },
  });
};

// GET DRIVES FOR A COLLEGE (student view)
export const getDrivesForCollege = async (
  collegeId: string,
  page = 1,
  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);
  return prisma.placementDrive.findMany({
    where: {
      targetCollegeId: collegeId,
      status: { not: "CLOSED" },
    },
    include: {
      company: {
        select: { id: true, name: true, logoUrl: true, slug: true, verified: true },
      },
    },
    orderBy: [{ status: "asc" }, { driveDate: "asc" }],
    skip: (page - 1) * safeLimit,
    take: safeLimit,
  });
};

// GET ALL DRIVES FOR A COLLEGE (including closed — for admins/TPO)
export const getAllDrivesForCollege = async (collegeId: string) => {
  return prisma.placementDrive.findMany({
    where: { targetCollegeId: collegeId },
    include: {
      company: {
        select: { id: true, name: true, logoUrl: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// GET MY POSTED DRIVES (recruiter view)
export const getMyPostedDrives = async (userId: string) => {
  return prisma.placementDrive.findMany({
    where: { postedById: userId },
    include: {
      company: {
        select: { id: true, name: true, logoUrl: true, slug: true },
      },
      college: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// UPDATE DRIVE
export const updatePlacementDrive = async (
  userId: string,
  driveId: string,
  data: UpdatePlacementDriveData,
) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: { id: true, targetCollegeId: true, postedById: true },
  });
  if (!drive) throw new AppError("Drive not found", 404);

  const isTpoOrCdcr = await isCollegeAdminOrCdcr(userId, drive.targetCollegeId);
  const isAuthorized = drive.postedById === userId || isTpoOrCdcr;
  if (!isAuthorized) {
    throw new AppError("Unauthorized to modify this placement drive", 403);
  }

  return prisma.placementDrive.update({
    where: { id: driveId },
    data: {
      driveTitle: data.driveTitle,
      driveDate: data.driveDate ? new Date(data.driveDate) : undefined,
      applyDeadline: data.applyDeadline ? new Date(data.applyDeadline) : undefined,
      status: data.status,
      driveType: data.driveType,
      roles: data.roles,
      stipendMin: data.stipendMin,
      stipendMax: data.stipendMax,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      internshipDurationMonths: data.internshipDurationMonths,
      minCgpa: data.minCgpa,
      maxBacklogs: data.maxBacklogs,
      eligibleBranches: data.eligibleBranches,
      eligibleYears: data.eligibleYears,
      isDreamCompany: data.isDreamCompany,
      ppoOffered: data.ppoOffered,
      description: data.description,
    },
    include: {
      company: {
        select: { id: true, name: true, logoUrl: true, slug: true },
      },
      college: {
        select: { id: true, name: true },
      },
    },
  });
};

// CLOSE DRIVE
export const closePlacementDrive = async (userId: string, driveId: string) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: { id: true, targetCollegeId: true, postedById: true },
  });
  if (!drive) throw new AppError("Drive not found", 404);

  const isTpoOrCdcr = await isCollegeAdminOrCdcr(userId, drive.targetCollegeId);
  const isAuthorized = drive.postedById === userId || isTpoOrCdcr;
  if (!isAuthorized) {
    throw new AppError("Unauthorized to close this placement drive", 403);
  }

  return prisma.placementDrive.update({
    where: { id: driveId },
    data: { status: "CLOSED" },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────

// APPLY TO DRIVE — with full eligibility engine + offer hoarding enforcement
export const applyToDrive = async (userId: string, driveId: string, note?: string) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: {
      id: true,
      status: true,
      postedById: true,
      driveTitle: true,
      targetCollegeId: true,
      isDreamCompany: true,
      applyDeadline: true,
      minCgpa: true,
      maxBacklogs: true,
      eligibleBranches: true,
      eligibleYears: true,
      company: { select: { name: true } },
      college: {
        select: {
          offerPolicy: true,
          allowBacklogsUpTo: true,
        },
      },
    },
  });
  if (!drive) throw new AppError("Drive not found", 404);
  if (drive.status === "CLOSED") throw new AppError("This placement drive is no longer accepting applications", 400);

  // ── Deadline check ────────────────────────────────────────────────────────
  if (drive.applyDeadline && new Date() > drive.applyDeadline) {
    throw new AppError("The application deadline for this drive has passed.", 400);
  }

  // ── Prevent double-apply ──────────────────────────────────────────────────
  const existing = await prisma.placementDriveApplication.findUnique({
    where: { driveId_userId: { driveId, userId } },
    select: { id: true },
  });
  if (existing) throw new AppError("You have already applied to this drive", 409);

  // ── ELIGIBILITY HARD-LOCK ENGINE ──────────────────────────────────────────
  const eligibility = await checkDriveEligibility(userId, driveId);
  if (!eligibility.eligible) {
    throw new AppError(
      `You are not eligible for this drive: ${eligibility.reasons.join(" | ")}`,
      403,
    );
  }

  // ── OFFER HOARDING POLICY CHECK ───────────────────────────────────────────
  await checkOfferHoardingPolicy(
    userId,
    { targetCollegeId: drive.targetCollegeId, isDreamCompany: drive.isDreamCompany, id: drive.id },
    drive.college.offerPolicy,
  );

  // ── CREATE APPLICATION ────────────────────────────────────────────────────
  const application = await prisma.placementDriveApplication.create({
    data: {
      driveId,
      userId,
      note,
      status: PlacementDriveApplicationStatus.APPLIED,
    },
  });

  // ── Notify the drive poster (recruiter/TPO) ───────────────────────────────
  if (drive.postedById !== userId) {
    await prisma.notification.create({
      data: {
        userId: drive.postedById,
        actorId: userId,
        type: "PLACEMENT_DRIVE_APPLIED",
        title: "New Placement Drive Application",
        message: `A student applied to your placement drive: ${drive.driveTitle}`,
        actionUrl: `/placement-drives/${driveId}/applicants`,
      },
    });
  }

  return application;
};

// GET MY DRIVE APPLICATIONS (student view)
export const getMyDriveApplications = async (userId: string) => {
  return prisma.placementDriveApplication.findMany({
    where: { userId },
    include: {
      drive: {
        include: {
          company: { select: { id: true, name: true, logoUrl: true, slug: true } },
          college: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });
};

// GET APPLICANTS FOR A DRIVE (recruiter / TPO view)
export const getDriveApplicants = async (userId: string, driveId: string) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: { id: true, postedById: true, targetCollegeId: true },
  });
  if (!drive) throw new AppError("Drive not found", 404);

  const isTpoOrCdcr = await isCollegeAdminOrCdcr(userId, drive.targetCollegeId);
  const isAuthorized = drive.postedById === userId || isTpoOrCdcr;
  if (!isAuthorized) throw new AppError("Unauthorized to view applicants", 403);

  return prisma.placementDriveApplication.findMany({
    where: { driveId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          profile: { select: { fullName: true, avatarUrl: true, headline: true } },
          educations: {
            where: { collegeId: drive.targetCollegeId },
            select: { cgpa: true, backlogs: true, currentYear: true, department: { select: { name: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { appliedAt: "asc" },
  });
};

// UPDATE APPLICATION STATUS (recruiter / TPO)
export const updateApplicationStatus = async (
  actorId: string,
  applicationId: string,
  status: PlacementDriveApplicationStatus,
  offerPackage?: number,
) => {
  const application = await prisma.placementDriveApplication.findUnique({
    where: { id: applicationId },
    include: {
      drive: {
        select: {
          id: true,
          postedById: true,
          targetCollegeId: true,
          driveTitle: true,
          companyId: true,
          salaryMax: true,
          salaryMin: true,
        },
      },
    },
  });
  if (!application) throw new AppError("Application not found", 404);

  const isTpoOrCdcr = await isCollegeAdminOrCdcr(actorId, application.drive.targetCollegeId);
  const isCompanyAdmin = await prisma.companyAdmin.findFirst({
    where: { userId: actorId, companyId: application.drive.companyId },
    select: { id: true },
  });
  const isDrivePoster = application.drive.postedById === actorId;
  if (!isTpoOrCdcr && !isCompanyAdmin && !isDrivePoster) {
    throw new AppError("Unauthorized to update application status", 403);
  }

  let updated;
  if (status === PlacementDriveApplicationStatus.SELECTED) {
    const offerPkg = offerPackage ?? application.drive.salaryMax ?? application.drive.salaryMin ?? 0;
    const lockResult = await processPlacementSelection(application.userId, application.drive.id, offerPkg);
    updated = lockResult.application;
  } else {
    updated = await prisma.placementDriveApplication.update({
      where: { id: applicationId },
      data: { status },
    });
  }

  // Notify the student
  const statusLabel: Record<PlacementDriveApplicationStatus, string> = {
    APPLIED: "Applied",
    SHORTLISTED: "Shortlisted",
    INTERVIEW_R1: "Round 1 Interview",
    INTERVIEW_R2: "Round 2 Interview",
    INTERVIEW_R3: "Round 3 Interview",
    PPO_OFFERED: "PPO Offered",
    SELECTED: "Selected 🎉",
    REJECTED: "Not Selected",
    WITHDRAWN: "Withdrawn",
  };

  await prisma.notification.create({
    data: {
      userId: application.userId,
      actorId,
      type: "PLACEMENT_DRIVE_APPLIED",
      title: "Placement Drive Application Update",
      message: `Your application for "${application.drive.driveTitle}" has been updated: ${statusLabel[status] ?? status}.`,
      actionUrl: `/jobs`,
    },
  });

  return updated;
};

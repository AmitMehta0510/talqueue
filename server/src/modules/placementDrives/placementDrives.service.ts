import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { PlacementDriveApplicationStatus, CollegeOfferPolicy, Prisma } from "@prisma/client";
import { processPlacementSelection } from "services/placementLockService";
import { createNotification, createNotificationsBulk } from "modules/notificatios/notifications.service";
import { enqueueEmail } from "services/mailQueue";

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
  const [user, collegeAdmin, tpoRecord, cdcrMember] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
    }),
    prisma.collegeAdmin.findFirst({
      where: { userId, collegeId },
      select: { id: true },
    }),
    prisma.collegeTpo.findFirst({
      where: { userId, collegeId },
      select: { id: true },
    }),
    prisma.cdcrMember.findFirst({
      where: { userId, collegeId },
      select: { id: true },
    }),
  ]);

  const roleNames = new Set((user?.roles || []).map((ur) => ur.role?.name).filter(Boolean));
  if (roleNames.has("PLATFORM_ADMIN") || roleNames.has("SUPER_ADMIN") || roleNames.has("ADMIN")) {
    return true;
  }

  if (collegeAdmin) return true;
  if (tpoRecord) return true;
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
      department: {
        select: {
          name: true,
          standardDepartment: { select: { name: true } },
        },
      },
    },
  });


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
export const getAllDrivesForCollege = async (
  collegeId: string,
  page = 1,
  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);
  return prisma.placementDrive.findMany({
    where: { targetCollegeId: collegeId },
    include: {
      company: {
        select: { id: true, name: true, logoUrl: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * safeLimit,
    take: safeLimit,
  });
};

// PRIVATE HELPER TO CHECK OWNERSHIP OR COLLEGE ADMIN/CDCR ACCESS
const assertDriveOwnershipOrAdminAccess = async (
  userId: string,
  driveId: string,
  unauthorizedMessage = "Unauthorized to modify this placement drive",
) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: { id: true, targetCollegeId: true, postedById: true },
  });
  if (!drive) throw new AppError("Drive not found", 404);

  const isTpoOrCdcr = await isCollegeAdminOrCdcr(userId, drive.targetCollegeId);
  const isAuthorized = drive.postedById === userId || isTpoOrCdcr;
  if (!isAuthorized) {
    throw new AppError(unauthorizedMessage, 403);
  }
  return drive;
};

// GET MY POSTED DRIVES (recruiter view)
export const getMyPostedDrives = async (
  userId: string,
  page = 1,
  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);
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
    skip: (page - 1) * safeLimit,
    take: safeLimit,
  });
};

// UPDATE DRIVE
export const updatePlacementDrive = async (
  userId: string,
  driveId: string,
  data: UpdatePlacementDriveData,
) => {
  await assertDriveOwnershipOrAdminAccess(userId, driveId, "Unauthorized to modify this placement drive");

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
  await assertDriveOwnershipOrAdminAccess(userId, driveId, "Unauthorized to close this placement drive");

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
  let application;
  try {
    application = await prisma.placementDriveApplication.create({
      data: {
        driveId,
        userId,
        note,
        status: PlacementDriveApplicationStatus.APPLIED,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002" || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw new AppError("You have already applied to this drive", 409);
    }
    throw error;
  }

  // ── Notify the drive poster (recruiter/TPO) ───────────────────────────────
  if (drive.postedById !== userId) {
    setImmediate(async () => {
      try {
        await createNotification({
          userId: drive.postedById,
          actorId: userId,
          type: "PLACEMENT_DRIVE_APPLIED",
          title: "New Placement Drive Application",
          message: `A student applied to your placement drive: ${drive.driveTitle}`,
          actionUrl: `/placement-drives/${driveId}/applicants`,
        });

        // Query emails to send async notifications
        const [studentUser, recruiterUser] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
          prisma.user.findUnique({ where: { id: drive.postedById }, select: { email: true } }),
        ]);

        if (studentUser?.email) {
          await enqueueEmail(
            studentUser.email,
            `Application submitted for ${drive.driveTitle}`,
            `<p>Your application has been successfully submitted for the campus placement drive: <strong>${drive.driveTitle}</strong> at ${drive.company.name}.</p>`
          );
        }

        if (recruiterUser?.email) {
          await enqueueEmail(
            recruiterUser.email,
            `New applicant for ${drive.driveTitle}`,
            `<p>A student has applied to your placement drive <strong>${drive.driveTitle}</strong>. You can review their profile on the recruiter console.</p>`
          );
        }
      } catch (err) {
        console.error("Failed to process apply notifications/emails:", err);
      }
    });
  }

  return application;
};

// GET MY DRIVE APPLICATIONS (student view)
export const getMyDriveApplications = async (
  userId: string,
  page = 1,
  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);
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
    skip: (page - 1) * safeLimit,
    take: safeLimit,
  });
};

// GET APPLICANTS FOR A DRIVE (recruiter / TPO view)
export const getDriveApplicants = async (
  userId: string,
  driveId: string,
  page = 1,
  limit = 20,
) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: { id: true, postedById: true, targetCollegeId: true },
  });
  if (!drive) throw new AppError("Drive not found", 404);

  const isTpoOrCdcr = await isCollegeAdminOrCdcr(userId, drive.targetCollegeId);
  const isAuthorized = drive.postedById === userId || isTpoOrCdcr;
  if (!isAuthorized) throw new AppError("Unauthorized to view applicants", 403);

  const safeLimit = Math.min(limit, 50);
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
    skip: (page - 1) * safeLimit,
    take: safeLimit,
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

  setImmediate(async () => {
    try {
      // Notify the student
      await createNotification({
        userId: application.userId,
        actorId,
        type: "PLACEMENT_STATUS_UPDATE",
        title: "Placement Drive Update",
        message: `Your application for "${application.drive.driveTitle}" status: ${statusLabel[status] ?? status}.`,
        actionUrl: `/placements`,
      });

      // Notify all TPO / college admins for this college
      const collegeAdmins = await prisma.collegeAdmin.findMany({
        where: { collegeId: application.drive.targetCollegeId },
        select: { userId: true },
      });
      const cdcrMembers = await prisma.cdcrMember.findMany({
        where: { collegeId: application.drive.targetCollegeId },
        select: { userId: true },
      });
      const adminIds = [
        ...collegeAdmins.map((a) => a.userId),
        ...cdcrMembers.map((m) => m.userId),
      ].filter((id) => id !== application.userId);

      if (adminIds.length > 0) {
        await createNotificationsBulk(
          adminIds.map((adminUserId) => ({
            userId: adminUserId,
            actorId,
            type: "PLACEMENT_STATUS_UPDATE" as any,
            title: "Drive Application Updated",
            message: `A student's application for "${application.drive.driveTitle}" is now: ${statusLabel[status] ?? status}.`,
            actionUrl: `/tpo/placements`,
          }))
        );
      }

      // Send milestone emails (not for every status to avoid spam)
      const emailMilestones: PlacementDriveApplicationStatus[] = [
        PlacementDriveApplicationStatus.SHORTLISTED,
        PlacementDriveApplicationStatus.INTERVIEW_R1,
        PlacementDriveApplicationStatus.INTERVIEW_R2,
        PlacementDriveApplicationStatus.INTERVIEW_R3,
        PlacementDriveApplicationStatus.PPO_OFFERED,
        PlacementDriveApplicationStatus.SELECTED,
        PlacementDriveApplicationStatus.REJECTED,
      ];

      if (emailMilestones.includes(status)) {
        const studentUser = await prisma.user.findUnique({
          where: { id: application.userId },
          select: { email: true, profile: { select: { fullName: true } } },
        });

        if (studentUser?.email) {
          const isSelected = status === PlacementDriveApplicationStatus.SELECTED;
          const isRejected = status === PlacementDriveApplicationStatus.REJECTED;
          const subject = isSelected
            ? `🎉 Congratulations! You've been Selected — ${application.drive.driveTitle}`
            : isRejected
            ? `Application Update — ${application.drive.driveTitle}`
            : `${statusLabel[status]}: ${application.drive.driveTitle}`;

          await enqueueEmail(
            studentUser.email,
            subject,
            `<p>Dear ${studentUser.profile?.fullName || "Candidate"},</p>
             <p>Your application for <strong>${application.drive.driveTitle}</strong> has been updated to: <strong>${statusLabel[status] ?? status}</strong>.</p>
             ${isSelected ? "<p>Congratulations! Please check your placement dashboard for next steps.</p>" : ""}
             ${isRejected ? "<p>Thank you for your participation. We encourage you to apply to other opportunities.</p>" : ""}
             <p>View your placement dashboard: <a href="/placements">My Placements</a></p>`
          );
        }
      }
    } catch (err) {
      console.error("Failed to process status update notifications/emails:", err);
    }
  });

  return updated;
};

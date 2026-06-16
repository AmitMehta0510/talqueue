import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

interface CreatePlacementDriveData {
  driveTitle: string;
  companyId: string;
  targetCollegeId: string;
  driveDate?: string;
  applyDeadline?: string;
  roles?: string[];
  stipendMin?: number;
  stipendMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  minCgpa?: number;
  eligibleBranches?: string[];
  eligibleYears?: number[];
  description?: string;
}

interface UpdatePlacementDriveData extends Partial<CreatePlacementDriveData> {
  status?: "UPCOMING" | "ONGOING" | "CLOSED";
}

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
      driveDate: data.driveDate ? new Date(data.driveDate) : null,
      applyDeadline: data.applyDeadline ? new Date(data.applyDeadline) : null,
      roles: data.roles || [],
      stipendMin: data.stipendMin,
      stipendMax: data.stipendMax,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      currency: data.currency || "INR",
      minCgpa: data.minCgpa,
      eligibleBranches: data.eligibleBranches || [],
      eligibleYears: data.eligibleYears || [],
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

// GET ALL DRIVES FOR A COLLEGE (including closed â€” for admins/TPO)
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
      roles: data.roles,
      stipendMin: data.stipendMin,
      stipendMax: data.stipendMax,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      minCgpa: data.minCgpa,
      eligibleBranches: data.eligibleBranches,
      eligibleYears: data.eligibleYears,
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STUDENT APPLICATIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// APPLY TO DRIVE (one-click)
export const applyToDrive = async (userId: string, driveId: string, note?: string) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: {
      id: true,
      status: true,
      postedById: true,
      driveTitle: true,
      targetCollegeId: true,
      company: { select: { name: true } },
    },
  });
  if (!drive) throw new AppError("Drive not found", 404);
  if (drive.status === "CLOSED") throw new AppError("This placement drive is no longer accepting applications", 400);

  // Prevent double-apply (@@unique constraint also guards this, but give a nice error)
  const existing = await prisma.placementDriveApplication.findUnique({
    where: { driveId_userId: { driveId, userId } },
    select: { id: true },
  });
  if (existing) throw new AppError("You have already applied to this drive", 409);

  const application = await prisma.placementDriveApplication.create({
    data: { driveId, userId, note, status: "APPLIED" },
  });

  // Notify the drive poster (recruiter/TPO)
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
  status: string,
) => {
  const application = await prisma.placementDriveApplication.findUnique({
    where: { id: applicationId },
    include: {
      drive: { select: { postedById: true, targetCollegeId: true, driveTitle: true, companyId: true } },
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

  const updated = await prisma.placementDriveApplication.update({
    where: { id: applicationId },
    data: { status },
  });

  // Notify the student
  await prisma.notification.create({
    data: {
      userId: application.userId,
      actorId,
      type: "PLACEMENT_DRIVE_APPLIED",
      title: "Placement Drive Application Update",
      message: `Your application status for "${application.drive.driveTitle}" has been updated to ${status}.`,
      actionUrl: `/jobs`,
    },
  });

  return updated;
};


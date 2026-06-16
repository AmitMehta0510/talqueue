import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { isCollegeAdminOrCdcr } from "modules/placementDrives/placementDrives.service";

interface SendInviteData {
  companyId: string;
  collegeId: string;
  initiatedBy?: "COMPANY_TO_COLLEGE" | "COLLEGE_TO_COMPANY";
  driveTitle: string;
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
  message?: string;
}

const assertCompanyAccess = async (userId: string, companyId: string) => {
  const [exp, admin] = await Promise.all([
    prisma.experience.findFirst({ where: { userId, companyId }, select: { id: true } }),
    prisma.companyAdmin.findFirst({ where: { userId, companyId }, select: { id: true } }),
  ]);
  if (!exp && !admin) {
    throw new AppError("You can only send invites on behalf of companies you are part of.", 403);
  }
};

// SEND INVITE
export const sendInvite = async (actorId: string, data: SendInviteData) => {
  const direction = data.initiatedBy || "COMPANY_TO_COLLEGE";

  if (direction === "COMPANY_TO_COLLEGE") {
    // Recruiter sends invite to a college â†’ validate recruiter has company access
    await assertCompanyAccess(actorId, data.companyId);
  } else {
    // College TPO invites a company â†’ validate TPO/CDCR
    const isTpoOrCdcr = await isCollegeAdminOrCdcr(actorId, data.collegeId);
    if (!isTpoOrCdcr) {
      throw new AppError("Only college admins or CDCR members can invite companies.", 403);
    }
  }

  // Validate company and college exist
  const [company, college] = await Promise.all([
    prisma.company.findUnique({ where: { id: data.companyId }, select: { id: true, name: true } }),
    prisma.college.findUnique({ where: { id: data.collegeId }, select: { id: true, name: true } }),
  ]);
  if (!company) throw new AppError("Company not found", 404);
  if (!college) throw new AppError("College not found", 404);

  const invite = await prisma.placementDriveInvite.create({
    data: {
      companyId: data.companyId,
      collegeId: data.collegeId,
      initiatedBy: direction,
      driveTitle: data.driveTitle,
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
      message: data.message,
      createdById: actorId,
    },
    include: {
      company: { select: { id: true, name: true, logoUrl: true } },
      college: { select: { id: true, name: true } },
      createdBy: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
    },
  });

  // Notify the target side's admins
  if (direction === "COMPANY_TO_COLLEGE") {
    // Notify all college admins for this college
    const collegeAdmins = await prisma.collegeAdmin.findMany({
      where: { collegeId: data.collegeId },
      select: { userId: true },
    });
    await Promise.all(
      collegeAdmins.map((ca) =>
        prisma.notification.create({
          data: {
            userId: ca.userId,
            actorId,
            type: "PLACEMENT_DRIVE_INVITE",
            title: "Campus Drive Invitation",
            message: `${company.name} has invited your college for a placement drive: "${data.driveTitle}".`,
            actionUrl: `/colleges`,
          },
        }),
      ),
    );
  } else {
    // Notify company admins
    const companyAdmins = await prisma.companyAdmin.findMany({
      where: { companyId: data.companyId },
      select: { userId: true },
    });
    await Promise.all(
      companyAdmins.map((ca) =>
        prisma.notification.create({
          data: {
            userId: ca.userId,
            actorId,
            type: "PLACEMENT_DRIVE_INVITE",
            title: "Campus Drive Request",
            message: `${college.name} has invited your company to conduct a placement drive: "${data.driveTitle}".`,
            actionUrl: `/recruiter`,
          },
        }),
      ),
    );
  }

  return invite;
};

// LIST INVITES FOR A COLLEGE (TPO view â€” incoming COMPANY_TO_COLLEGE)
export const listInvitesForCollege = async (actorId: string, collegeId: string) => {
  const isTpoOrCdcr = await isCollegeAdminOrCdcr(actorId, collegeId);
  if (!isTpoOrCdcr) throw new AppError("Unauthorized", 403);

  return prisma.placementDriveInvite.findMany({
    where: {
      collegeId,
      initiatedBy: "COMPANY_TO_COLLEGE",
    },
    include: {
      company: { select: { id: true, name: true, logoUrl: true, slug: true, type: true } },
      college: { select: { id: true, name: true } },
      createdBy: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
      placementDrive: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// LIST INVITES SENT BY COMPANY (recruiter view â€” their outgoing invites)
export const listInvitesSentByCompany = async (actorId: string, companyId: string) => {
  await assertCompanyAccess(actorId, companyId);

  return prisma.placementDriveInvite.findMany({
    where: { companyId },
    include: {
      company: { select: { id: true, name: true, logoUrl: true } },
      college: { select: { id: true, name: true } },
      createdBy: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
      placementDrive: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// RESPOND TO INVITE (ACCEPT / REJECT)
export const respondToInvite = async (
  actorId: string,
  inviteId: string,
  action: "ACCEPT" | "REJECT",
) => {
  const invite = await prisma.placementDriveInvite.findUnique({
    where: { id: inviteId },
    include: {
      company: { select: { id: true, name: true } },
      college: { select: { id: true, name: true } },
    },
  });
  if (!invite) throw new AppError("Invite not found", 404);
  if (invite.status !== "PENDING") throw new AppError("This invite has already been resolved.", 400);

  // Determine who is allowed to respond
  let isAuthorized = false;
  if (invite.initiatedBy === "COMPANY_TO_COLLEGE") {
    // TPO/CDCR responds on behalf of college
    isAuthorized = await isCollegeAdminOrCdcr(actorId, invite.collegeId);
  } else {
    // Company admin responds on behalf of company
    const admin = await prisma.companyAdmin.findFirst({
      where: { userId: actorId, companyId: invite.companyId },
      select: { id: true },
    });
    isAuthorized = !!admin;
  }
  if (!isAuthorized) throw new AppError("Unauthorized to respond to this invite", 403);

  let placementDriveId: string | undefined;

  if (action === "ACCEPT") {
    // Auto-create the placement drive from the invite data
    const drive = await prisma.placementDrive.create({
      data: {
        driveTitle: invite.driveTitle,
        companyId: invite.companyId,
        targetCollegeId: invite.collegeId,
        postedById: actorId,
        driveDate: invite.driveDate,
        applyDeadline: invite.applyDeadline,
        roles: invite.roles,
        stipendMin: invite.stipendMin,
        stipendMax: invite.stipendMax,
        salaryMin: invite.salaryMin,
        salaryMax: invite.salaryMax,
        currency: invite.currency,
        minCgpa: invite.minCgpa,
        eligibleBranches: invite.eligibleBranches,
        eligibleYears: invite.eligibleYears,
        description: invite.description,
        status: "UPCOMING",
      },
    });
    placementDriveId = drive.id;
  }

  const updated = await prisma.placementDriveInvite.update({
    where: { id: inviteId },
    data: {
      status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
      reviewedAt: new Date(),
      ...(placementDriveId ? { placementDriveId } : {}),
    },
    include: {
      company: { select: { id: true, name: true, logoUrl: true } },
      college: { select: { id: true, name: true } },
      placementDrive: { select: { id: true, status: true, driveTitle: true } },
    },
  });

  // Notify the invite creator
  const notifMsg =
    action === "ACCEPT"
      ? `Your placement drive invite for "${invite.driveTitle}" was accepted! The drive is now live.`
      : `Your placement drive invite for "${invite.driveTitle}" was declined.`;

  await prisma.notification.create({
    data: {
      userId: invite.createdById,
      actorId,
      type: "PLACEMENT_DRIVE_INVITE",
      title: action === "ACCEPT" ? "Drive Invite Accepted" : "Drive Invite Declined",
      message: notifMsg,
      actionUrl: action === "ACCEPT" ? `/jobs` : `/recruiter`,
    },
  });

  return updated;
};

// WITHDRAW INVITE (creator cancels a pending invite)
export const withdrawInvite = async (actorId: string, inviteId: string) => {
  const invite = await prisma.placementDriveInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, createdById: true, status: true, driveTitle: true },
  });
  if (!invite) throw new AppError("Invite not found", 404);
  if (invite.createdById !== actorId) throw new AppError("Only the invite creator can withdraw it.", 403);
  if (invite.status !== "PENDING") throw new AppError("Only pending invites can be withdrawn.", 400);

  return prisma.placementDriveInvite.update({
    where: { id: inviteId },
    data: { status: "WITHDRAWN" },
  });
};


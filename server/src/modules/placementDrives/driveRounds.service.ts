import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { isCollegeAdminOrCdcr } from "./placementDrives.service";
import { PlacementDriveApplicationStatus } from "@prisma/client";

interface CreateRoundData {
  roundType: string; // "APTITUDE_TEST" | "GROUP_DISCUSSION" | "TECHNICAL_INTERVIEW" | "HR_INTERVIEW" | "FINAL"
  scheduledAt?: string;
  venue?: string;
  meetLink?: string;
  durationMin?: number;
  maxSlots?: number;
  notes?: string;
}

interface UpdateRoundData extends Partial<CreateRoundData> {}

// Auth helper for round modifications
const assertRoundManagementAccess = async (actorId: string, driveId: string) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: { postedById: true, targetCollegeId: true, companyId: true },
  });
  if (!drive) throw new AppError("Placement drive not found", 404);

  const isTpoOrCdcr = await isCollegeAdminOrCdcr(actorId, drive.targetCollegeId);
  const isCompanyAdmin = await prisma.companyAdmin.findFirst({
    where: { userId: actorId, companyId: drive.companyId },
    select: { id: true },
  });
  const isDrivePoster = drive.postedById === actorId;

  if (!isTpoOrCdcr && !isCompanyAdmin && !isDrivePoster) {
    throw new AppError("Unauthorized to manage drive rounds", 403);
  }
  return drive;
};

export const createRound = async (actorId: string, driveId: string, data: CreateRoundData) => {
  await assertRoundManagementAccess(actorId, driveId);

  // Determine next round number
  const roundsCount = await prisma.placementDriveRound.count({
    where: { driveId },
  });
  const roundNumber = roundsCount + 1;

  const round = await prisma.placementDriveRound.create({
    data: {
      driveId,
      roundNumber,
      roundType: data.roundType,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      venue: data.venue || null,
      meetLink: data.meetLink || null,
      durationMin: data.durationMin || null,
      maxSlots: data.maxSlots || null,
      notes: data.notes || null,
    },
  });

  return round;
};

export const updateRound = async (actorId: string, roundId: string, data: UpdateRoundData) => {
  const round = await prisma.placementDriveRound.findUnique({
    where: { id: roundId },
    select: { driveId: true },
  });
  if (!round) throw new AppError("Round not found", 404);

  await assertRoundManagementAccess(actorId, round.driveId);

  const updated = await prisma.placementDriveRound.update({
    where: { id: roundId },
    data: {
      roundType: data.roundType,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      venue: data.venue,
      meetLink: data.meetLink,
      durationMin: data.durationMin,
      maxSlots: data.maxSlots,
      notes: data.notes,
    },
  });

  return updated;
};

export const deleteRound = async (actorId: string, roundId: string) => {
  const round = await prisma.placementDriveRound.findUnique({
    where: { id: roundId },
    select: { driveId: true },
  });
  if (!round) throw new AppError("Round not found", 404);

  await assertRoundManagementAccess(actorId, round.driveId);

  await prisma.placementDriveRound.delete({
    where: { id: roundId },
  });

  return { success: true };
};

export const getRoundsForDrive = async (driveId: string) => {
  const rounds = await prisma.placementDriveRound.findMany({
    where: { driveId },
    orderBy: { roundNumber: "asc" },
    include: {
      shortlistedApplications: {
        include: {
          application: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  profile: {
                    select: {
                      fullName: true,
                      avatarUrl: true,
                      resumeUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return rounds;
};

export const shortlistForRound = async (
  actorId: string,
  roundId: string,
  applicationIds: string[],
  updateStatus?: PlacementDriveApplicationStatus,
) => {
  const round = await prisma.placementDriveRound.findUnique({
    where: { id: roundId },
    include: {
      drive: {
        select: {
          id: true,
          driveTitle: true,
          targetCollegeId: true,
          companyId: true,
          postedById: true,
        },
      },
    },
  });
  if (!round) throw new AppError("Round not found", 404);

  await assertRoundManagementAccess(actorId, round.drive.id);

  // Bulk insert to shortlist table (skipping existing ones to avoid unique constraints violation)
  const shortlistsToCreate = [];
  for (const appId of applicationIds) {
    const existing = await prisma.placementDriveRoundShortlist.findUnique({
      where: {
        roundId_applicationId: {
          roundId,
          applicationId: appId,
        },
      },
    });
    if (!existing) {
      shortlistsToCreate.push({
        roundId,
        applicationId: appId,
      });
    }
  }

  if (shortlistsToCreate.length > 0) {
    await prisma.placementDriveRoundShortlist.createMany({
      data: shortlistsToCreate,
    });
  }

  // Update application status if specified
  if (updateStatus) {
    await prisma.placementDriveApplication.updateMany({
      where: {
        id: { in: applicationIds },
      },
      data: {
        status: updateStatus,
      },
    });

    // Notify all advanced students
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

    const applications = await prisma.placementDriveApplication.findMany({
      where: { id: { in: applicationIds } },
      select: { userId: true },
    });

    if (applications.length > 0) {
      await prisma.notification.createMany({
        data: applications.map((app) => ({
          userId: app.userId,
          actorId,
          type: "PLACEMENT_DRIVE_APPLIED",
          title: `Shortlisted for ${round.roundType}`,
          message: `Congratulations! You have been advanced to ${statusLabel[updateStatus] ?? updateStatus} for "${round.drive.driveTitle}".`,
          actionUrl: `/jobs`,
        })),
      });
    }
  }

  return { success: true, count: shortlistsToCreate.length };
};

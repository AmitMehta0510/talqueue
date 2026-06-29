import prisma from "shared/database/prisma";
import { checkDriveEligibility } from "modules/placementDrives/placementDrives.service";
import { createNotification } from "modules/notificatios/notifications.service";
import { NotificationType } from "@prisma/client";

/**
 * Automatically checks and dispatches match alerts (in-app notifications and simulated
 * SMS/WhatsApp updates) to all students qualifying for a newly published placement drive.
 *
 * @param driveId - Target placement drive UUID.
 * @returns List of matching student user IDs who received notifications.
 */
export async function dispatchDriveMatchAlerts(driveId: string): Promise<string[]> {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: {
      id: true,
      driveTitle: true,
      minCgpa: true,
      targetCollegeId: true,
      college: { select: { name: true } },
    },
  });

  if (!drive) return [];

  // Query all student users who are registered under this college
  const students = await prisma.user.findMany({
    where: {
      primaryRole: "STUDENT",
      educations: {
        some: {
          collegeId: drive.targetCollegeId,
        },
      },
    },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  const notifiedStudentIds: string[] = [];

  for (const student of students) {
    try {
      const eligibility = await checkDriveEligibility(student.id, drive.id);
      if (eligibility.eligible) {
        // 1. Dispatch official in-app alert
        await createNotification({
          userId: student.id,
          type: NotificationType.PLACEMENT_DRIVE_INVITE,
          title: "Eligible Campus Drive Published",
          message: `New Eligible Campus Drive: "${drive.driveTitle}" is now open for applications at ${drive.college.name}. CGPA cutoff: ${drive.minCgpa || "None"}.`,
          actionUrl: `/placement-drives/${drive.id}`,
        });

        // 2. Dispatch simulated WhatsApp / SMS alert trigger
        console.log(
          `[WhatsApp Alert] Sent to student "${student.profile?.fullName || student.email}": ` +
          `You qualify for the new "${drive.driveTitle}" campus drive at ${drive.college.name}! Apply on the platform now.`
        );

        notifiedStudentIds.push(student.id);
      }
    } catch (err) {
      console.error(`[Drive Alerts] Failed to process eligibility checks for student=${student.id}:`, err);
    }
  }

  return notifiedStudentIds;
}

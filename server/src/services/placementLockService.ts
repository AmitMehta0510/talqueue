import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { PlacementDriveApplicationStatus } from "@prisma/client";
import { evaluatePolicyLock, isStudentLocked } from "./placementPolicyEngine";

/**
 * Atomic transaction to process student selection for a placement drive.
 * Enforces the student locking mechanism to prevent offer hoarding.
 */
export async function processPlacementSelection(
  studentId: string,
  driveId: string,
  offerPackage: number
) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch current application & drive & college details
    const application = await tx.placementDriveApplication.findUnique({
      where: { driveId_userId: { driveId, userId: studentId } },
      include: {
        drive: {
          include: {
            college: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError("Application not found", 404);
    }

    const college = application.drive.college;
    const collegeId = college.id;

    // 2. Pehle check karo ki kya student ka status pehle se kisi dusri live company application me 'PLACED_FREEZE' locked toh nahi hai.
    const lockCheck = await isStudentLocked(studentId, collegeId, tx);
    if (lockCheck.isLocked) {
      throw new AppError(`Student is already locked due to a prior selection freeze: ${lockCheck.reason}`, 400);
    }

    // 3. Evaluate college policies using PlacementPolicyEngine
    const evaluation = await evaluatePolicyLock(
      studentId,
      collegeId,
      offerPackage,
      application.drive,
      tx
    );

    // 4. Update status of the current application to SELECTED
    const updatedApp = await tx.placementDriveApplication.update({
      where: { id: application.id },
      data: { status: PlacementDriveApplicationStatus.SELECTED },
      include: {
        drive: {
          select: { id: true, driveTitle: true, targetCollegeId: true },
        },
      },
    });

    // 5. If the policy indicates we should freeze the student, update all other active applications to WITHDRAWN
    let locked = false;
    if (evaluation.shouldFreeze) {
      locked = true;
      await tx.placementDriveApplication.updateMany({
        where: {
          userId: studentId,
          status: {
            in: [
              PlacementDriveApplicationStatus.APPLIED,
              PlacementDriveApplicationStatus.SHORTLISTED,
              PlacementDriveApplicationStatus.INTERVIEW_R1,
              PlacementDriveApplicationStatus.INTERVIEW_R2,
              PlacementDriveApplicationStatus.INTERVIEW_R3,
            ],
          },
          NOT: { driveId },
        },
        data: {
          status: PlacementDriveApplicationStatus.WITHDRAWN,
        },
      });
    }

    return {
      application: updatedApp,
      locked,
      freezeReason: evaluation.shouldFreeze ? evaluation.reason : null,
    };
  }, {
    isolationLevel: "Serializable",
  });
}

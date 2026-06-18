import { Prisma, CollegeOfferPolicy, PlacementDriveApplicationStatus } from "@prisma/client";

export interface CollegePolicyConfig {
  dreamPolicyPackage: number;
  superDreamThreshold: number;
  maxOffersAllowed: number;
  minBatchPlacedPercentage: number;
}

export const DEFAULT_POLICY_CONFIG: CollegePolicyConfig = {
  dreamPolicyPackage: 1000000, // 10 LPA
  superDreamThreshold: 1500000, // 15 LPA
  maxOffersAllowed: 2,
  minBatchPlacedPercentage: 75, // 75%
};

// A registry of override configs per college if needed, otherwise fallback to default
export const COLLEGE_POLICY_REGISTRY: Record<string, Partial<CollegePolicyConfig>> = {};

export function getCollegePolicyConfig(collegeId: string): CollegePolicyConfig {
  const overrides = COLLEGE_POLICY_REGISTRY[collegeId] || {};
  return {
    ...DEFAULT_POLICY_CONFIG,
    ...overrides,
  };
}

export async function evaluatePolicyLock(
  studentId: string,
  collegeId: string,
  offerPackage: number,
  drive: { isDreamCompany: boolean },
  tx: Prisma.TransactionClient
): Promise<{ shouldFreeze: boolean; reason: string }> {
  // 1. Fetch college offer policy
  const college = await tx.college.findUnique({
    where: { id: collegeId },
    select: { offerPolicy: true },
  });

  if (!college) {
    return { shouldFreeze: false, reason: "College not found" };
  }

  const { offerPolicy } = college;

  // If the college policy is completely OPEN, do not freeze.
  if (offerPolicy === CollegeOfferPolicy.OPEN) {
    return { shouldFreeze: false, reason: "College policy is OPEN" };
  }

  const config = getCollegePolicyConfig(collegeId);

  // 2. Fetch existing offers (SELECTED applications)
  const existingOffers = await tx.placementDriveApplication.findMany({
    where: {
      userId: studentId,
      status: PlacementDriveApplicationStatus.SELECTED,
    },
    include: {
      drive: true,
    },
  });

  const totalOffersCount = existingOffers.length;

  // 3. Check max offers allowed constraint
  if (totalOffersCount + 1 >= config.maxOffersAllowed) {
    return {
      shouldFreeze: true,
      reason: `Student has reached the maximum allowed offers (${config.maxOffersAllowed}).`,
    };
  }

  // 4. Check Super Dream threshold
  if (offerPackage >= config.superDreamThreshold) {
    return {
      shouldFreeze: true,
      reason: `Offer package (${offerPackage}) meets or exceeds the Super Dream threshold of ${config.superDreamThreshold}.`,
    };
  }

  // 5. Calculate Batch Placement Percentage
  const totalStudents = await tx.education.count({
    where: { collegeId },
  });

  // Placed students: Students of this college who have at least one SELECTED application
  const placedStudentsCount = await tx.education.count({
    where: {
      collegeId,
      user: {
        placementDriveApplications: {
          some: {
            status: PlacementDriveApplicationStatus.SELECTED,
          },
        },
      },
    },
  });

  const batchPlacedPercentage = totalStudents > 0 ? (placedStudentsCount / totalStudents) * 100 : 0;

  if (batchPlacedPercentage >= config.minBatchPlacedPercentage) {
    return {
      shouldFreeze: true,
      reason: `Batch placement percentage (${batchPlacedPercentage.toFixed(2)}%) has crossed the threshold of ${config.minBatchPlacedPercentage}%. Freeze enforced.`,
    };
  }

  // 6. Check specific policies
  if (offerPolicy === CollegeOfferPolicy.ONE_OFFER_LOCK) {
    // Under ONE_OFFER_LOCK, if it is a dream company, we might exempt it.
    if (!drive.isDreamCompany) {
      return {
        shouldFreeze: true,
        reason: "College policy is ONE_OFFER_LOCK and this is not a dream company.",
      };
    }
  } else if (offerPolicy === CollegeOfferPolicy.DREAM_EXCEPTION) {
    // DREAM_EXCEPTION: student can apply/accept dream companies.
    // If the offer is not a dream company, they get locked.
    if (!drive.isDreamCompany && offerPackage < config.dreamPolicyPackage) {
      // If they get a non-dream offer below dreamPolicyPackage, they get locked immediately.
      return {
        shouldFreeze: true,
        reason: "Offer package is below dreamPolicyPackage for a non-dream company. Freeze enforced.",
      };
    }
  }

  return { shouldFreeze: false, reason: "No policy triggered a freeze" };
}

export async function isStudentLocked(
  studentId: string,
  collegeId: string,
  tx: Prisma.TransactionClient
): Promise<{ isLocked: boolean; reason: string | null }> {
  // If the college policy is completely OPEN, the student is never locked.
  const college = await tx.college.findUnique({
    where: { id: collegeId },
    select: { offerPolicy: true },
  });

  if (!college || college.offerPolicy === CollegeOfferPolicy.OPEN) {
    return { isLocked: false, reason: null };
  }

  // A student is considered locked if any of their SELECTED applications has already triggered a freeze lock.
  const selectedApplications = await tx.placementDriveApplication.findMany({
    where: {
      userId: studentId,
      status: PlacementDriveApplicationStatus.SELECTED,
    },
    include: {
      drive: true,
    },
  });

  if (selectedApplications.length === 0) {
    return { isLocked: false, reason: null };
  }

  const config = getCollegePolicyConfig(collegeId);

  // Check if any of the offers triggered a freeze lock
  for (const app of selectedApplications) {
    const packageVal = app.drive.salaryMax || app.drive.salaryMin || 0;
    
    if (selectedApplications.length >= config.maxOffersAllowed) {
      return { isLocked: true, reason: `Student has reached max offers allowed (${config.maxOffersAllowed}).` };
    }
    if (packageVal >= config.superDreamThreshold) {
      return { isLocked: true, reason: `Student already has a Super Dream offer (${packageVal}).` };
    }
    if (college.offerPolicy === CollegeOfferPolicy.ONE_OFFER_LOCK && !app.drive.isDreamCompany) {
      return { isLocked: true, reason: `Student is locked under ONE_OFFER_LOCK by drive: ${app.drive.driveTitle}.` };
    }
    if (college.offerPolicy === CollegeOfferPolicy.DREAM_EXCEPTION) {
      if (!app.drive.isDreamCompany && packageVal < config.dreamPolicyPackage) {
        return { isLocked: true, reason: `Student is locked under DREAM_EXCEPTION by drive: ${app.drive.driveTitle}.` };
      }
    }
  }

  return { isLocked: false, reason: null };
}

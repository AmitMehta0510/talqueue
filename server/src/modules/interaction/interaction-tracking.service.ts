import prisma from "shared/database/prisma";

const INTERACTION_WEIGHTS = {
  VIEW: 1,
  CLICK: 2,
  LIKE: 4,
  COMMENT: 5,
  SAVE: 6,
  SHARE: 8,
  APPLY: 10,
  OPEN_PROJECT: 5,
  OPEN_PROFILE: 3,
};

const DAY_MS = 1000 * 60 * 60 * 24;

export const trackInteraction = async (
  userId: string,

  data: {
    targetId: string;

    targetType:
      | "POST"
      | "PROJECT"
      | "HACKATHON"
      | "JOB"
      | "COMPANY"
      | "PROFILE"
      | "COLLEGE"
      | "TEAM";

    interactionType:
      | "VIEW"
      | "CLICK"
      | "LIKE"
      | "COMMENT"
      | "SAVE"
      | "SHARE"
      | "APPLY"
      | "OPEN_PROJECT"
      | "OPEN_PROFILE";

    duration?: number;

    metadata?: any;
  },
) => {
  //
  // Store interaction
  //
  const interaction = await prisma.feedInteraction.create({
    data: {
      userId,

      targetId: data.targetId,

      targetType: data.targetType,

      interactionType: data.interactionType,

      duration: data.duration,

      metadata: data.metadata,
    },
  });

  //
  // Update profile
  //
  updateUserInterestProfile(userId).catch(console.error);

  return interaction;
};

export const updateUserInterestProfile = async (userId: string) => {
  //
  // Recent interactions
  //
  const interactions = await prisma.feedInteraction.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 500,
  });

  //
  // Interest maps
  //
  const contentTypes: Record<string, number> = {};

  const interactionTypes: Record<string, number> = {};

  //
  // Weighted scoring
  //
  for (const interaction of interactions) {
    const weight = INTERACTION_WEIGHTS[interaction.interactionType] || 1;

    //
    // Freshness decay
    //
    const daysOld = Math.floor(
      (Date.now() - new Date(interaction.createdAt).getTime()) / DAY_MS,
    );

    //
    // Recent interactions stronger
    //
    const freshness = Math.max(1, 30 - daysOld);

    //
    // Final score
    //
    const score = weight * freshness;

    //
    // Content type
    //
    contentTypes[interaction.targetType] =
      (contentTypes[interaction.targetType] || 0) + score;

    //
    // Interaction type
    //
    interactionTypes[interaction.interactionType] =
      (interactionTypes[interaction.interactionType] || 0) + score;
  }

  //
  // Persist profile
  //
  await prisma.userInterestProfile.upsert({
    where: {
      userId,
    },

    update: {
      preferredContentTypes: contentTypes,

      preferredInteractionTypes: interactionTypes,

      updatedAt: new Date(),
    },

    create: {
      userId,

      preferredContentTypes: contentTypes,

      preferredInteractionTypes: interactionTypes,
    },
  });
};

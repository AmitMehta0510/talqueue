import prisma from "shared/database/prisma";

const INTERACTION_WEIGHTS: Record<string, number> = {
  VIEW: 1,

  CLICK: 2,

  LIKE: 4,

  COMMENT: 5,

  SAVE: 6,

  SHARE: 8,

  APPLY: 10,

  JOIN_COMMUNITY: 10,

  LEAVE_COMMUNITY: -5,

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
      | "COMMUNITY"
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
      | "JOIN_COMMUNITY"
      | "LEAVE_COMMUNITY"
      | "OPEN_PROJECT"
      | "OPEN_PROFILE";

    duration?: number;

    metadata?: any;
  },
) => {
  // STORE INTERACTION
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

  // LIGHTWEIGHT PROFILE UPDATE
  incrementInterestProfile(userId, data).catch(console.error);

  return interaction;
};

export const incrementInterestProfile = async (
  userId: string,

  data: {
    targetType: string;

    interactionType: string;
  },
) => {
  const weight = INTERACTION_WEIGHTS[data.interactionType] || 1;

  // GET EXISTING PROFILE
  const profile = await prisma.userInterestProfile.findUnique({
    where: {
      userId,
    },
  });

  const preferredContentTypes =
    (profile?.preferredContentTypes as Record<string, number>) || {};

  const preferredInteractionTypes =
    (profile?.preferredInteractionTypes as Record<string, number>) || {};

  // INCREMENT CONTENT TYPE
  preferredContentTypes[data.targetType] =
    (preferredContentTypes[data.targetType] || 0) + weight;

  //
  // INCREMENT INTERACTION TYPE
  preferredInteractionTypes[data.interactionType] =
    (preferredInteractionTypes[data.interactionType] || 0) + weight;

  // UPSERT
  await prisma.userInterestProfile.upsert({
    where: {
      userId,
    },

    update: {
      preferredContentTypes,

      preferredInteractionTypes,

      updatedAt: new Date(),
    },

    create: {
      userId,

      preferredContentTypes,

      preferredInteractionTypes,
    },
  });
};

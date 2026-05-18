import prisma from "shared/database/prisma";

export const trackRecommendationImpression = async (
  userId: string,

  data: {
    entityId: string;

    entityType: any;

    position?: number;

    clicked?: boolean;

    hidden?: boolean;
  },
) => {
  return prisma.recommendationImpression.create({
    data: {
      userId,

      entityId: data.entityId,

      entityType: data.entityType,

      position: data.position,

      clicked: data.clicked || false,

      hidden: data.hidden || false,
    },
  });
};

export const applyRecommendationMemoryPenalty = async (
  userId: string,

  entityId: string,

  entityType: any,

  score: number,
) => {
  const impressions = await prisma.recommendationImpression.count({
    where: {
      userId,

      entityId,

      entityType,

      clicked: false,
    },
  });

  //
  // Penalty multiplier
  //
  const penalty = impressions * 8;

  return Math.max(score - penalty, 0);
};

export const applyRecommendationMemoryBoost = async (
  userId: string,

  entityId: string,

  entityType: any,

  score: number,
) => {
  const clicks = await prisma.recommendationImpression.count({
    where: {
      userId,

      entityId,

      entityType,

      clicked: true,
    },
  });

  //
  // Boost
  //
  const boost = clicks * 12;

  return score + boost;
};

export const getRecommendationMemoryMap = async (userId: string) => {
  const impressions = await prisma.recommendationImpression.findMany({
    where: {
      userId,
    },

    take: 1000,
  });

  const memoryMap = new Map<
    string,
    {
      clicked: number;
      ignored: number;
    }
  >();

  for (const impression of impressions) {
    const key = `${impression.entityType}:${impression.entityId}`;

    const existing = memoryMap.get(key) || {
      clicked: 0,

      ignored: 0,
    };

    if (impression.clicked) {
      existing.clicked += 1;
    } else {
      existing.ignored += 1;
    }

    memoryMap.set(key, existing);
  }

  return memoryMap;
};

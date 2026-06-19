import prisma from "shared/database/prisma";

export type RecommendationMemory = {
  clicked: number;
  ignored: number;
};

export const applyMemoryScore = (
  memory: RecommendationMemory | undefined,

  score: number,
) => {
  if (!memory) {
    return score;
  }

  return score + memory.clicked * 12 - memory.ignored * 8;
};

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
  return prisma.recommendationImpression.upsert({
    where: {
      userId_entityType_entityId: {
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
    create: {
      userId,
      entityId: data.entityId,
      entityType: data.entityType,
      position: data.position,
      clicked: data.clicked || false,
      hidden: data.hidden || false,
      shownCount: 1,
    },
    update: {
      position: data.position !== undefined ? data.position : undefined,
      clicked: data.clicked !== undefined ? data.clicked : undefined,
      hidden: data.hidden !== undefined ? data.hidden : undefined,
      shownCount: {
        increment: 1,
      },
      lastShownAt: new Date(),
    },
  });
};

export const getRecommendationMemoryMap = async (userId: string) => {
  const impressions = await prisma.recommendationImpression.findMany({
    where: {
      userId,
    },

    take: 1000,
  });

  const memoryMap = new Map<string, RecommendationMemory>();

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

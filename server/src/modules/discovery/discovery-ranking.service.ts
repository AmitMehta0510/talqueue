import prisma from "shared/database/prisma";

export const applyRepetitionPrevention = async (
  userId: string,
  feed: any[],) => {
  const recentImpressions = await prisma.recommendationImpression.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 500,
  });

  const seenMap = new Map<string, number>();

  for (const impression of recentImpressions) {
    const key = `${impression.entityType}:${impression.entityId}`;

    seenMap.set(key, (seenMap.get(key) || 0) + 1);
  }

  return feed.map((item) => {
    const key = `${item.type}:${item.data.id}`;

    const impressions = seenMap.get(key) || 0;

    // Heavy decay
    const decay = impressions * 15;

    return {
      ...item,

      score: item.score - decay,
    };
  });
};

export const applyRecommendationFatiguePrevention = async (
  feed: any[]) => {
  const authorFrequency = new Map<string, number>();

  const companyFrequency = new Map<string, number>();

  return feed.map((item) => {
    let penalty = 0;

    // Same author spam
    const authorId = item.data?.authorId || item.data?.ownerId;

    if (authorId) {
      const count = (authorFrequency.get(authorId) || 0) + 1;

      authorFrequency.set(authorId, count);

      if (count > 2) {
        penalty += count * 10;
      }
    }

    // Same company spam
    const companyId = item.data?.companyId;

    if (companyId) {
      const count = (companyFrequency.get(companyId) || 0) + 1;

      companyFrequency.set(companyId, count);

      if (count > 2) {
        penalty += count * 8;
      }
    }
    return {
      ...item,

      score: item.score - penalty,
    };
  });
};

export const applyExplorationDiversity = async (feed: any[]) => {
  return feed.map((item, index) => {
    // Every 5th item gets diversity boost
    if (index % 5 === 0) {
      return {
        ...item,
        score: item.score + 35,
        explorationBoost: true,
      };
    }
    return item;
  });
};

export const applySmartReranking = async (
  userId: string,
  feed: any[],) => {
  // Repetition prevention
  let ranked = await applyRepetitionPrevention(userId, feed);

  // Fatigue prevention
  ranked = await applyRecommendationFatiguePrevention(ranked);

  // Diversity
  ranked = await applyExplorationDiversity(ranked);

  // Final ranking
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
};

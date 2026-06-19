export const applyRepetitionPrevention = (
  feed: any[],
  recentImpressions: { entityType: string; entityId: string }[],
) => {
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

export const applyRecommendationFatiguePrevention = (
  feed: any[],
) => {
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

export const applyExplorationDiversity = (feed: any[]) => {
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

export const applySmartReranking = (
  feed: any[],
  recentImpressions: { entityType: string; entityId: string }[],
) => {
  // Repetition prevention
  let ranked = applyRepetitionPrevention(feed, recentImpressions);

  // Fatigue prevention
  ranked = applyRecommendationFatiguePrevention(ranked);

  // Diversity
  ranked = applyExplorationDiversity(ranked);

  // Final ranking
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
};


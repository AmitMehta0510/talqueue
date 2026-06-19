import prisma from "shared/database/prisma";
import { generateFeedCandidates } from "./candidate-generator.service";

import { applyFeedDiversity } from "./feed-diversity.service";

import { applySmartReranking } from "./discovery-ranking.service";

import {
  buildRankedFeedItems,
  RankedFeedItem,
} from "modules/feed/feed-ranking.service";

import { buildFeedContext } from "./feed-context.service";

import {
  applyMemoryScore,
  getRecommendationMemoryMap,
  RecommendationMemory,
} from "./recommendation-memory.service";

const applyMemoryToItems = (
  items: RankedFeedItem[],

  memoryMap: Map<string, RecommendationMemory>,
) => {
  return items.map((item) => ({
    ...item,

    score: applyMemoryScore(
      memoryMap.get(`${item.type}:${(item.data as any).id}`),

      item.score,
    ),
  }));
};

export const getDiscoveryFeed = async (userId: string) => {
  // Pre-fetch all dependencies in a single parallel block
  const [context, candidates, memoryMap, recentImpressions] = await Promise.all([
    buildFeedContext(userId),
    generateFeedCandidates(userId),
    getRecommendationMemoryMap(userId),
    prisma.recommendationImpression.findMany({
      where: {
        userId,
      },
      select: {
        entityType: true,
        entityId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    }),
  ]);

  // Unified feed
  const feed: RankedFeedItem[] = [
    ...buildRankedFeedItems(
      candidates.posts,

      "POST",

      context,
    ),

    ...buildRankedFeedItems(
      candidates.projects,

      "PROJECT",

      context,
    ),

    ...buildRankedFeedItems(
      candidates.jobs,

      "JOB",

      context,
    ),

    ...buildRankedFeedItems(
      candidates.hackathons,

      "HACKATHON",

      context,
    ),
  ];

  const feedWithMemory = applyMemoryToItems(feed, memoryMap);

  // Ranking (now fully synchronous)
  const ranked = applySmartReranking(feedWithMemory, recentImpressions);

  // Diversity
  const diversified = await applyFeedDiversity(ranked);

  return diversified.slice(0, 60);
};


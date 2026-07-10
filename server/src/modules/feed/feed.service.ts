import { buildRankedFeedItems } from "./feed-ranking.service";
import { applyAiFeedRanking } from "./feed-ai-ranking.service";
import { buildFeedContext } from "modules/discovery/feed-context.service";
import { generateFeedCandidates } from "modules/discovery/candidate-generator.service";

export const getPersonalizedFeedV2 = async (
  userId: string,
  cursor?: string,
  limit = 60,
) => {
  const context = await buildFeedContext(userId);

  const preFetched = {
    followingIds: context.followingIds,
    affinityUserIds: Array.from(context.affinityMap.keys()),
    skillNames: context.skillNames,
    collegeId: null, // Will be fetched inside generateFeedCandidates if not present or needed
  };

  const candidates = await generateFeedCandidates(
    userId,
    "personalized",
    preFetched,
    { cursor, limit },
  );

  // BUILD FEED
  const feed = [
    ...buildRankedFeedItems(candidates.posts, "POST", context),

    ...buildRankedFeedItems(candidates.projects, "PROJECT", context),

    ...buildRankedFeedItems(candidates.hackathons, "HACKATHON", context),

    ...buildRankedFeedItems(candidates.jobs, "JOB", context),

    ...buildRankedFeedItems(candidates.companies, "COMPANY", context),
  ];

  // FINAL SORT
  const rankedFeed = await applyAiFeedRanking(feed, context);
  const sliced = rankedFeed.slice(0, limit);

  // Derive next cursor from the last POST item in the ranked result
  // (posts are the primary feed entity and the only type paginated via cursor)
  const lastPost = [...sliced].reverse().find((item) => item.type === "POST");
  const nextCursor = lastPost ? lastPost.data.id : null;

  return {
    items: sliced,
    nextCursor,
    hasMore: nextCursor !== null && rankedFeed.length >= limit,
  };
};

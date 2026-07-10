import { buildRankedFeedItems } from "./feed-ranking.service";
import { applyAiFeedRanking } from "./feed-ai-ranking.service";
import { buildFeedContext } from "modules/discovery/feed-context.service";
import { generateFeedCandidates } from "modules/discovery/candidate-generator.service";
import { getCachedFeed, setCachedFeed } from "services/feedCache";
import logger from "shared/logger";

export const getPersonalizedFeedV2 = async (
  userId: string,
  cursor?: string,
  limit = 60,
) => {
  // ── Cache-first: serve cached feed for first page (no cursor) ───────────────
  // Cursor-based pages are always computed live because each cursor is unique
  // to the user's scroll position — caching them would require per-cursor keys.
  const isFirstPage = !cursor;
  if (isFirstPage) {
    const cached = await getCachedFeed(userId);
    if (cached) {
      logger.debug({ userId }, "[Feed] Served from cache");
      return cached;
    }
  }

  // ── Live compute ─────────────────────────────────────────────────────────────
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

  const result = {
    items: sliced,
    nextCursor,
    hasMore: nextCursor !== null && rankedFeed.length >= limit,
  };

  // ── Populate cache asynchronously (non-blocking) ─────────────────────────────
  // Only cache first-page results (cursor-less) since those are the most reused.
  if (isFirstPage) {
    setCachedFeed(userId, result).catch((err) =>
      logger.warn({ userId, err }, "[Feed] Cache write failed"),
    );
  }

  return result;
};

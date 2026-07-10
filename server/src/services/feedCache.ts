/**
 * @file services/feedCache.ts
 *
 * Redis-backed feed cache for personalized feeds.
 *
 * Architecture:
 *   - Cache key: `feed:v1:{userId}:p{page}` (page-aware — first page is most common)
 *   - TTL: 24 hours (86400 seconds) — refreshed on events that affect feed content
 *   - Invalidation: individual user keys are deleted when their feed context changes
 *     (they follow someone, add a skill, a followed user creates a post, etc.)
 *   - Fallback: if Redis is unavailable, returns null — caller falls back to live compute
 *
 * Key design decisions:
 *   - We cache page=1 (cursor=undefined) only for now — pagination pages are
 *     derived from cursors which vary, so we only serve cache for the first load.
 *   - The cached payload is the full `{ items, nextCursor, hasMore }` object.
 *   - Cache is populated AFTER compute (write-aside), never blocking the response.
 *   - We use a version prefix ("v1") so a breaking feed schema change can be
 *     invalidated globally by bumping the version without flushing all of Redis.
 */

import redis from "shared/database/redis";
import logger from "shared/logger";

const FEED_CACHE_VERSION = "v1";
const FEED_CACHE_TTL     = 86_400; // 24 hours in seconds
const FEED_CACHE_PREFIX  = `feed:${FEED_CACHE_VERSION}`;

// ─── Key helpers ─────────────────────────────────────────────────────────────

/**
 * Cache key for a user's first-page feed (cursor-less request).
 * Only first-page is cached; subsequent cursor pages compute live.
 */
export const getFeedCacheKey = (userId: string): string =>
  `${FEED_CACHE_PREFIX}:${userId}`;

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns cached feed for a user's first page, or null on cache miss / error.
 */
export async function getCachedFeed(userId: string): Promise<any | null> {
  try {
    const raw = await redis.get(getFeedCacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err: any) {
    logger.warn({ userId, err }, "[FeedCache] Redis read failed — computing live");
    return null;
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Stores a computed feed result in Redis. Non-blocking — errors are logged
 * but never thrown (cache write failure must not degrade the response).
 */
export async function setCachedFeed(userId: string, feed: any): Promise<void> {
  try {
    await redis.setex(getFeedCacheKey(userId), FEED_CACHE_TTL, JSON.stringify(feed));
    logger.debug({ userId }, "[FeedCache] Feed cached (24h TTL)");
  } catch (err: any) {
    logger.warn({ userId, err }, "[FeedCache] Redis write failed — feed not cached");
  }
}

// ─── Invalidation ─────────────────────────────────────────────────────────────

/**
 * Invalidates the feed cache for a single user.
 * Call this when the user's follow list, skills, or preferences change.
 */
export async function invalidateFeedCache(userId: string): Promise<void> {
  try {
    await redis.del(getFeedCacheKey(userId));
    logger.debug({ userId }, "[FeedCache] Feed cache invalidated for user");
  } catch (err: any) {
    logger.warn({ userId, err }, "[FeedCache] Cache invalidation failed for user");
  }
}

/**
 * Invalidates feed caches for multiple users (e.g. all followers of a post author).
 * Batches deletes in groups of 50 to avoid Redis command overflow.
 */
export async function invalidateFeedCacheForUsers(userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  const BATCH = 50;
  try {
    for (let i = 0; i < userIds.length; i += BATCH) {
      const batch = userIds.slice(i, i + BATCH);
      const keys  = batch.map(getFeedCacheKey);
      await redis.del(...keys);
    }
    logger.debug({ count: userIds.length }, "[FeedCache] Batch feed cache invalidation");
  } catch (err: any) {
    logger.warn({ err }, "[FeedCache] Batch cache invalidation failed");
  }
}

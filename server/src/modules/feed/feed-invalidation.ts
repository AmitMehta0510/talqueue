/**
 * @file modules/feed/feed-invalidation.ts
 *
 * Centralised feed cache invalidation entry point.
 *
 * Import and call `invalidateFeedCache(userId)` from any service that mutates
 * data that feeds depend on:
 *
 *   - posts.service.ts:    createPost()    → followers' feeds become stale
 *   - users/follows:       followUser()    → follower's feed should refresh
 *   - skills.service.ts:   addSkill()      → user's feed context changes
 *   - profile.service.ts:  updateProfile() → user's feed context changes
 *
 * This file is intentionally thin — it re-exports feedCache functions with
 * feed-domain-specific names so callers don't have to import from services/.
 */

export {
  invalidateFeedCache,
  invalidateFeedCacheForUsers,
} from "services/feedCache";

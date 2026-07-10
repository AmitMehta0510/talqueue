/**
 * @file services/analytics/analyticsWriter.ts
 *
 * Write-behind analytics buffer.
 *
 * Problem:
 *   The old FeedAnalytics writes were synchronous, inside the HTTP request path.
 *   At 100x traffic: 10k req/s × 1 DB write = Postgres overwhelmed.
 *
 * Solution:
 *   - Buffer events in memory (max 500 rows)
 *   - Flush to PlatformEvent table every 5 seconds OR when buffer is full
 *   - Uses pg bulk INSERT (not Prisma) for maximum throughput
 *   - Non-blocking: analytics failures never affect user-facing responses
 *
 * Usage:
 *   import { trackEvent } from "services/analytics/analyticsWriter";
 *   trackEvent({ eventType: "job.view", userId, entityType: "JOB", entityId: jobId });
 *
 * The PlatformEvent table is created by:
 *   prisma/migrations/manual/timescale_platform_events.sql
 */

import { Pool } from "pg";
import logger from "shared/logger";

// ─── Config ───────────────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 5_000;   // flush every 5 seconds
const MAX_BUFFER_SIZE   = 500;     // flush early if buffer reaches this size
const MAX_BATCH_ROWS    = 1_000;   // max rows per INSERT statement

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformEventInput {
  eventType:   string;                  // "feed.impression" | "job.view" | "post.like" | ...
  userId?:     string;                  // null for anonymous
  entityType?: string;                  // "JOB" | "POST" | "PROJECT" | "HACKATHON"
  entityId?:   string;
  sessionId?:  string;
  properties?: Record<string, unknown>; // arbitrary extra data
}

// ─── Pool (separate from Prisma's pool — analytics writes go here) ────────────

let pgPool: Pool | null = null;

function getPool(): Pool {
  if (!pgPool) {
    // Use DIRECT_DATABASE_URL (bypasses PgBouncer) for analytics bulk writes.
    // These are fire-and-forget, long-running transactions — not compatible with
    // transaction-mode PgBouncer pooling.
    const connectionString =
      process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

    pgPool = new Pool({
      connectionString,
      max: 3,           // minimal pool for analytics — don't steal OLTP connections
      idleTimeoutMillis: 30_000,
    });

    pgPool.on("error", (err) => {
      logger.warn({ err }, "[AnalyticsWriter] pg pool error");
    });
  }
  return pgPool;
}

// ─── Buffer ───────────────────────────────────────────────────────────────────

const buffer: PlatformEventInput[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let isShuttingDown = false;

// ─── Track (public API) ───────────────────────────────────────────────────────

/**
 * Enqueue a platform event for async write.
 * This function is synchronous and non-blocking — never awaited by callers.
 */
export function trackEvent(event: PlatformEventInput): void {
  if (isShuttingDown) return;

  buffer.push(event);

  // Flush early if buffer full
  if (buffer.length >= MAX_BUFFER_SIZE) {
    flushBuffer().catch(() => {});
    return;
  }

  // Schedule periodic flush if not already scheduled
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushBuffer().catch(() => {});
    }, FLUSH_INTERVAL_MS);
  }
}

// ─── Flush ────────────────────────────────────────────────────────────────────

async function flushBuffer(): Promise<void> {
  if (!buffer.length) return;

  const batch = buffer.splice(0, MAX_BATCH_ROWS);

  try {
    const pool = getPool();

    // Build bulk INSERT: INSERT INTO "PlatformEvent" (...) VALUES ($1,$2,...), ($n,...)
    const placeholders: string[] = [];
    const values: unknown[]      = [];
    let   paramIdx               = 1;

    for (const event of batch) {
      placeholders.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`,
      );
      values.push(
        event.eventType,
        event.userId     ?? null,
        event.entityType ?? null,
        event.entityId   ?? null,
        event.sessionId  ?? null,
        JSON.stringify(event.properties ?? {}),
      );
    }

    await pool.query(
      `INSERT INTO "PlatformEvent" (event_type, user_id, entity_type, entity_id, session_id, properties)
       VALUES ${placeholders.join(", ")}`,
      values,
    );

    logger.debug({ count: batch.length }, "[AnalyticsWriter] Flushed events");
  } catch (err: any) {
    // Analytics failures must NEVER crash the server
    logger.warn({ err, count: batch.length }, "[AnalyticsWriter] Flush failed — events dropped");
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/** Call on server startup to initialize the periodic flush cycle. */
export function startAnalyticsWriter(): void {
  logger.info(
    { flushIntervalMs: FLUSH_INTERVAL_MS, maxBufferSize: MAX_BUFFER_SIZE },
    "[AnalyticsWriter] Started",
  );
}

/** Call on graceful shutdown to flush remaining buffered events. */
export async function stopAnalyticsWriter(): Promise<void> {
  isShuttingDown = true;

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (buffer.length) {
    logger.info({ count: buffer.length }, "[AnalyticsWriter] Flushing on shutdown");
    await flushBuffer();
  }

  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }

  logger.info("[AnalyticsWriter] Stopped");
}

// ─── Convenience event helpers ────────────────────────────────────────────────

export const analytics = {
  feedImpression:  (userId: string, entityType: string, entityId: string) =>
    trackEvent({ eventType: "feed.impression", userId, entityType, entityId }),

  jobView:         (userId: string | undefined, entityId: string) =>
    trackEvent({ eventType: "job.view", userId, entityType: "JOB", entityId }),

  postLike:        (userId: string, entityId: string) =>
    trackEvent({ eventType: "post.like", userId, entityType: "POST", entityId }),

  postView:        (userId: string | undefined, entityId: string) =>
    trackEvent({ eventType: "post.view", userId, entityType: "POST", entityId }),

  profileView:     (viewerId: string | undefined, profileUserId: string) =>
    trackEvent({ eventType: "profile.view", userId: viewerId, entityType: "PROFILE", entityId: profileUserId }),

  jobApply:        (userId: string, entityId: string) =>
    trackEvent({ eventType: "job.apply", userId, entityType: "JOB", entityId }),

  searchQuery:     (userId: string | undefined, query: string) =>
    trackEvent({ eventType: "search.query", userId, properties: { query } }),

  hackathonView:   (userId: string | undefined, entityId: string) =>
    trackEvent({ eventType: "hackathon.view", userId, entityType: "HACKATHON", entityId }),
};

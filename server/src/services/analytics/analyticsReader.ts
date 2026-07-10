/**
 * @file services/analytics/analyticsReader.ts
 *
 * Analytics query layer — reads from PlatformEvent table.
 *
 * Provides time-series aggregations for the admin dashboard:
 *   - Event counts by type (daily/weekly/monthly)
 *   - Active users over time
 *   - Top entities (most viewed jobs, most liked posts)
 *   - Funnel metrics (feed impression → job view → apply)
 *
 * Uses raw pg queries for performance — Prisma doesn't support
 * TimescaleDB continuous aggregates or window functions efficiently.
 *
 * All functions accept a `window` parameter (in days) to limit the query range.
 * These are read-only, admin-only endpoints.
 */

import { Pool } from "pg";
import logger from "shared/logger";

// ─── Pool ─────────────────────────────────────────────────────────────────────

let readerPool: Pool | null = null;

function getReaderPool(): Pool {
  if (!readerPool) {
    readerPool = new Pool({
      connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 60_000,
    });
    readerPool.on("error", (err) => logger.warn({ err }, "[AnalyticsReader] pool error"));
  }
  return readerPool;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventCountRow   { event_type: string; count: number }
export interface DailyActiveRow  { date: string; active_users: number }
export interface TopEntityRow    { entity_id: string; event_type: string; count: number }
export interface FunnelRow       { stage: string; count: number; conversion_rate: number | null }

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Total event counts grouped by type, for the last N days.
 */
export async function getEventCountsByType(windowDays = 7): Promise<EventCountRow[]> {
  const pool = getReaderPool();
  const since = new Date(Date.now() - windowDays * 86400_000);
  const { rows } = await pool.query<EventCountRow>(
    `SELECT event_type, COUNT(*)::int AS count
     FROM "PlatformEvent"
     WHERE time >= $1
     GROUP BY event_type
     ORDER BY count DESC`,
    [since],
  );
  return rows;
}

/**
 * Daily active user count (users with at least 1 event) over the last N days.
 */
export async function getDailyActiveUsers(windowDays = 30): Promise<DailyActiveRow[]> {
  const pool = getReaderPool();
  const since = new Date(Date.now() - windowDays * 86400_000);
  const { rows } = await pool.query<DailyActiveRow>(
    `SELECT DATE(time)::text AS date,
            COUNT(DISTINCT user_id)::int AS active_users
     FROM "PlatformEvent"
     WHERE time >= $1 AND user_id IS NOT NULL
     GROUP BY DATE(time)
     ORDER BY date ASC`,
    [since],
  );
  return rows;
}

/**
 * Top N most-viewed/liked entities for a given event type and entity type.
 */
export async function getTopEntities(opts: {
  eventType:  string;
  entityType: string;
  windowDays: number;
  limit:      number;
}): Promise<TopEntityRow[]> {
  const pool  = getReaderPool();
  const since = new Date(Date.now() - opts.windowDays * 86400_000);
  const { rows } = await pool.query<TopEntityRow>(
    `SELECT entity_id, event_type, COUNT(*)::int AS count
     FROM "PlatformEvent"
     WHERE time >= $1 AND event_type = $2 AND entity_type = $3 AND entity_id IS NOT NULL
     GROUP BY entity_id, event_type
     ORDER BY count DESC
     LIMIT $4`,
    [since, opts.eventType, opts.entityType, opts.limit],
  );
  return rows;
}

/**
 * Conversion funnel: feed impression → job view → job apply.
 * Returns counts at each stage + conversion rate from previous stage.
 */
export async function getJobFunnel(windowDays = 7): Promise<FunnelRow[]> {
  const pool  = getReaderPool();
  const since = new Date(Date.now() - windowDays * 86400_000);
  const { rows } = await pool.query<{ event_type: string; count: number }>(
    `SELECT event_type, COUNT(DISTINCT user_id)::int AS count
     FROM "PlatformEvent"
     WHERE time >= $1
       AND event_type IN ('feed.impression', 'job.view', 'job.apply')
       AND user_id IS NOT NULL
     GROUP BY event_type`,
    [since],
  );

  const counts = Object.fromEntries(rows.map((r) => [r.event_type, r.count]));
  const impression = counts["feed.impression"] ?? 0;
  const view       = counts["job.view"]        ?? 0;
  const apply      = counts["job.apply"]       ?? 0;

  return [
    { stage: "Feed Impression", count: impression, conversion_rate: null },
    { stage: "Job View",        count: view,       conversion_rate: impression ? +(view / impression * 100).toFixed(2) : null },
    { stage: "Job Apply",       count: apply,      conversion_rate: view       ? +(apply / view * 100).toFixed(2)       : null },
  ];
}

/**
 * Hourly event volume for the last 24h (for admin real-time dashboard).
 */
export async function getHourlyEventVolume(): Promise<{ hour: string; count: number }[]> {
  const pool = getReaderPool();
  const { rows } = await pool.query<{ hour: string; count: number }>(
    `SELECT DATE_TRUNC('hour', time)::text AS hour,
            COUNT(*)::int AS count
     FROM "PlatformEvent"
     WHERE time >= NOW() - INTERVAL '24 hours'
     GROUP BY hour
     ORDER BY hour ASC`,
  );
  return rows;
}

/** Teardown for graceful shutdown. */
export async function closeAnalyticsReader(): Promise<void> {
  if (readerPool) {
    await readerPool.end();
    readerPool = null;
  }
}

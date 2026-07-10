/**
 * @file modules/feed/interest-aggregator.cron.ts
 *
 * Daily cron: aggregates behavioral signals for all active users.
 *
 * Schedule: runs at 03:00 UTC daily (low-traffic window).
 *
 * Strategy:
 *   - Pages through users who had FeedInteraction activity in the last 7 days
 *   - For each user, calls aggregateInterestProfile()
 *   - Processes in batches of 50 with 100ms delay between batches (gentle on DB)
 *   - Redis lock prevents double-running on multi-instance deploys
 *
 * Wire-up: imported by app.ts or server.ts and called startInterestAggregatorCron().
 */

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import logger from "shared/logger";
import { aggregateInterestProfile } from "./interest-aggregator.service";

const LOCK_KEY = "lock:cron:interest-aggregator";
const LOCK_TTL = 60 * 90; // 90 minutes max (generous for large user bases)
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runInterestAggregation(): Promise<void> {
  // ── Distributed lock — only one instance runs at a time ──────────────────
  const acquired = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL, "NX");
  if (!acquired) {
    logger.info("[InterestAggregatorCron] Lock held by another instance — skipping");
    return;
  }

  logger.info("[InterestAggregatorCron] Starting daily interest aggregation");
  const startTime = Date.now();

  try {
    // Find users active in the last 7 days (had at least one interaction)
    const activeUserIds = await prisma.feedInteraction.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      distinct: ["userId"],
      select:   { userId: true },
    });

    const userIds = activeUserIds.map((u) => u.userId);
    logger.info({ count: userIds.length }, "[InterestAggregatorCron] Active users to process");

    let processed = 0;
    let updated   = 0;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((userId) => aggregateInterestProfile(userId)),
      );

      for (const result of results) {
        processed++;
        if (result.status === "fulfilled" && result.value) updated++;
      }

      // Gentle throttle between batches to avoid connection pool saturation
      if (i + BATCH_SIZE < userIds.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const elapsedMs = Date.now() - startTime;
    logger.info(
      { processed, updated, elapsedMs },
      "[InterestAggregatorCron] Daily aggregation complete",
    );
  } finally {
    await redis.del(LOCK_KEY);
  }
}

let cronHandle: NodeJS.Timeout | null = null;

/**
 * Starts the interest aggregator cron.
 * Runs at 03:00 UTC daily using a simple setInterval-based scheduler.
 * For precision scheduling in production, replace with node-cron or BullMQ.
 */
export function startInterestAggregatorCron(): void {
  if (cronHandle) return;

  // Calculate ms until next 03:00 UTC
  function msUntilNextRun(): number {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(3, 0, 0, 0);
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.getTime() - now.getTime();
  }

  const scheduleNext = () => {
    cronHandle = setTimeout(async () => {
      await runInterestAggregation().catch((err) =>
        logger.error({ err }, "[InterestAggregatorCron] Fatal error in cron"),
      );
      // Schedule next run 24 hours later
      cronHandle = setInterval(async () => {
        await runInterestAggregation().catch((err) =>
          logger.error({ err }, "[InterestAggregatorCron] Fatal error in cron"),
        );
      }, 24 * 60 * 60 * 1000);
    }, msUntilNextRun());
  };

  scheduleNext();
  logger.info(
    { nextRunMs: msUntilNextRun() },
    "[InterestAggregatorCron] Scheduled — next run at 03:00 UTC",
  );
}

export function stopInterestAggregatorCron(): void {
  if (cronHandle) {
    clearTimeout(cronHandle);
    clearInterval(cronHandle);
    cronHandle = null;
  }
}

/**
 * Run aggregation immediately for a single user (called from BullMQ handler).
 * Used after a burst of interactions — debounced by the event bus.
 */
export { aggregateInterestProfile as runInterestAggregationForUser };

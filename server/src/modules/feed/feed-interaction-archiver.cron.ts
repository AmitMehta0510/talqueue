/**
 * @file modules/feed/feed-interaction-archiver.cron.ts
 *
 * FeedInteraction Archival Job
 * ─────────────────────────────
 * Problem:
 *   FeedInteraction has no TTL. At 10 interactions/user/day × 10k users = 100k rows/day.
 *   In 1 year → 36M rows in the hot OLTP table, degrading every query that touches it.
 *
 * Solution:
 *   Nightly cron at 02:00 UTC moves interactions older than 90 days to
 *   FeedInteractionArchive — a cold table with no active FK constraints.
 *
 * Strategy:
 *   - Runs in batches of 1,000 rows (prevents table lock contention)
 *   - Uses a Prisma transaction per batch (copy + delete atomically)
 *   - Redis distributed lock prevents double-running on multi-instance deploys
 *   - Rate-limited: 200ms pause between batches for gentle DB pressure
 *
 * Wire-up: imported by server.ts, called startFeedInteractionArchiver().
 */

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import logger from "shared/logger";

// ─── Config ───────────────────────────────────────────────────────────────────

const HOT_WINDOW_DAYS  = 90;     // keep 90 days in FeedInteraction (hot table)
const BATCH_SIZE       = 1_000;  // rows per transaction
const BATCH_DELAY_MS   = 200;    // pause between batches to reduce DB pressure
const LOCK_KEY         = "lock:cron:feed-interaction-archiver";
const LOCK_TTL_SECONDS = 60 * 60; // 1 hour max (generous)

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ─── Archival logic ───────────────────────────────────────────────────────────

async function runArchival(): Promise<void> {
  // Distributed lock — only one instance runs at a time
  const acquired = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL_SECONDS, "NX");
  if (!acquired) {
    logger.info("[ArchiverCron] Lock held by another instance — skipping");
    return;
  }

  const cutoff = new Date(Date.now() - HOT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  logger.info({ cutoff }, "[ArchiverCron] Starting FeedInteraction archival");

  const startTime = Date.now();
  let totalArchived = 0;

  try {
    while (true) {
      // Fetch a batch of old rows
      const batch = await prisma.feedInteraction.findMany({
        where:   { createdAt: { lt: cutoff } },
        orderBy: { createdAt: "asc" },
        take:    BATCH_SIZE,
        select: {
          id:              true,
          userId:          true,
          targetId:        true,
          targetType:      true,
          interactionType: true,
          duration:        true,
          metadata:        true,
          createdAt:       true,
        },
      });

      if (!batch.length) break; // done

      // Atomically: INSERT into archive, then DELETE from hot table
      await prisma.$transaction([
        prisma.feedInteractionArchive.createMany({
          data: batch.map((row) => ({
            id:              row.id,
            userId:          row.userId,
            targetId:        row.targetId,
            targetType:      row.targetType,
            interactionType: row.interactionType,
            duration:        row.duration ?? undefined,
            metadata:        row.metadata ?? undefined,
            createdAt:       row.createdAt,
          })),
          skipDuplicates: true, // idempotent — safe to re-run
        }),

        prisma.feedInteraction.deleteMany({
          where: { id: { in: batch.map((r) => r.id) } },
        }),
      ]);

      totalArchived += batch.length;
      logger.debug({ batch: batch.length, totalArchived }, "[ArchiverCron] Batch archived");

      // Pause between batches to be gentle on the DB
      if (batch.length === BATCH_SIZE) {
        await sleep(BATCH_DELAY_MS);
      } else {
        break; // last batch was smaller than full — we're done
      }
    }

    const elapsedMs = Date.now() - startTime;
    logger.info(
      { totalArchived, elapsedMs, cutoff },
      "[ArchiverCron] Archival complete",
    );
  } finally {
    await redis.del(LOCK_KEY);
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let archiveTimer: NodeJS.Timeout | null = null;

function msUntilNext02UTC(): number {
  const now  = new Date();
  const next = new Date();
  next.setUTCHours(2, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

export function startFeedInteractionArchiver(): void {
  if (archiveTimer) return;

  const scheduleNext = () => {
    archiveTimer = setTimeout(async () => {
      await runArchival().catch((err) =>
        logger.error({ err }, "[ArchiverCron] Fatal error"),
      );
      // Reschedule 24 hours later
      archiveTimer = setInterval(async () => {
        await runArchival().catch((err) =>
          logger.error({ err }, "[ArchiverCron] Fatal error"),
        );
      }, 24 * 60 * 60 * 1000);
    }, msUntilNext02UTC());
  };

  scheduleNext();
  logger.info(
    { nextRunMs: msUntilNext02UTC(), hotWindowDays: HOT_WINDOW_DAYS },
    "[ArchiverCron] Scheduled — next run at 02:00 UTC",
  );
}

export function stopFeedInteractionArchiver(): void {
  if (archiveTimer) {
    clearTimeout(archiveTimer);
    clearInterval(archiveTimer);
    archiveTimer = null;
  }
}

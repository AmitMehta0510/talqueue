/**
 * @file daily-limits-reset.cron.ts
 * @module Infra/Crons
 *
 * Midnight UTC cron that resets the `dailyReferralCount` field to 0
 * across ALL users atomically via a single Prisma updateMany transaction.
 *
 * Schedule: `0 0 * * *` — fires at 00:00 UTC every day.
 *
 * Design:
 *  - Uses `node-cron` (already installed — no new dependencies).
 *  - Registered as a lightweight static import in `app.ts` alongside
 *    `startTrendingCron`, `startProjectSyncCron`, and `startSkillVerificationCron`.
 *  - Exports `executeReset()` as a pure async function so tests can drive it
 *    directly without scheduling real cron timers.
 *  - Fail-soft: DB errors are caught, Winston-logged, and do NOT crash the process.
 */

import cron from "node-cron";
import winston from "winston";
import prisma from "shared/database/prisma";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [DailyReset] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// CORE RESET LOGIC
// ---------------------------------------------------------------------------

/**
 * Resets `dailyReferralCount` to 0 for every user in a single updateMany call.
 *
 * Exported separately from the cron scheduler so that:
 *  1. Unit tests can call it directly without spinning up a real cron timer.
 *  2. Admin endpoints can trigger a manual reset if needed.
 *
 * @returns The number of rows updated (Prisma `count`).
 */
export async function executeReset(): Promise<number> {
  const start = Date.now();
  logger.info("Starting daily referral count reset...");

  try {
    const { count } = await prisma.user.updateMany({
      data: { dailyReferralCount: 0 },
    });

    const durationMs = Date.now() - start;
    logger.info(
      `Daily referral count reset complete. Updated ${count} user(s) in ${durationMs}ms.`
    );

    return count;
  } catch (err: any) {
    // Fail-soft: log the error but do NOT re-throw so the cron process stays alive.
    logger.error(`Daily referral count reset failed: ${err?.message || String(err)}`);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// CRON SCHEDULER
// ---------------------------------------------------------------------------

/**
 * Registers the daily limits reset cron job.
 *
 * Call once at server startup from `app.ts`.
 *
 * Cron expression: `0 0 * * *`
 *  ┌── minute (0)
 *  │ ┌── hour (0 = midnight)
 *  │ │ ┌── day of month (* = every day)
 *  │ │ │ ┌── month (* = every month)
 *  │ │ │ │ ┌── day of week (* = every day)
 *  0 0 * * *
 */
export function startDailyLimitsResetCron(): void {
  cron.schedule(
    "0 0 * * *",
    async () => {
      await executeReset();
    },
    {
      timezone: "UTC",
    }
  );

  logger.info("Daily limits reset cron scheduled — fires at 00:00 UTC every day.");
}

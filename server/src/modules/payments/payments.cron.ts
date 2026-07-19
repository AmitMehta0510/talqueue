/**
 * @file modules/payments/payments.cron.ts
 *
 * Hourly cron: handles subscription expiry and failed webhook retries.
 *
 * Strategy:
 *   - Runs hourly to check for overdue subscriptions and expire them
 *   - Fetches failed webhooks with attempts < 5 and retries them
 *   - Redis lock prevents double-running on multi-instance deployments
 */

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import logger from "shared/logger";
import { expireOverdueSubscriptions } from "./subscription.service";
import { retryWebhookEvent } from "./webhook.handler";

const LOCK_KEY = "lock:cron:payments-system";
const LOCK_TTL = 60 * 30; // 30 minutes max execution time

async function runPaymentsCleanup(): Promise<void> {
  // ── Distributed lock — only one instance runs at a time ──────────────────
  const acquired = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL, "NX");
  if (!acquired) {
    logger.info("[PaymentsCron] Lock held by another instance — skipping");
    return;
  }

  logger.info("[PaymentsCron] Starting payments cleanup cron");
  const startTime = Date.now();

  try {
    // 1. Expire overdue subscriptions
    const expiredCount = await expireOverdueSubscriptions();
    if (expiredCount > 0) {
      logger.info({ expiredCount }, "[PaymentsCron] Expired overdue subscriptions");
    }

    // 2. Retry failed webhooks
    const failedEvents = await prisma.webhookEvent.findMany({
      where: {
        processed: false,
        attempts: { lt: 5 },
      },
      take: 20, // Process in small batches
      select: { eventId: true },
    });

    if (failedEvents.length > 0) {
      logger.info({ count: failedEvents.length }, "[PaymentsCron] Retrying failed webhooks");
      for (const event of failedEvents) {
        await retryWebhookEvent(event.eventId).catch((err) =>
          logger.error({ err, eventId: event.eventId }, "[PaymentsCron] Failed to retry webhook")
        );
      }
    }

    const elapsedMs = Date.now() - startTime;
    logger.info(
      { expiredCount, retriedCount: failedEvents.length, elapsedMs },
      "[PaymentsCron] Payments cleanup cron complete"
    );
  } finally {
    await redis.del(LOCK_KEY);
  }
}

let cronHandle: NodeJS.Timeout | null = null;

/**
 * Starts the payments system cron. Runs hourly.
 */
export function startPaymentsCron(): void {
  if (cronHandle) return;

  // Run cleanup once on startup (with 10-second delay so server boot completes)
  setTimeout(() => {
    runPaymentsCleanup().catch((err) =>
      logger.error({ err }, "[PaymentsCron] Fatal error in startup payments cron run")
    );
  }, 10_000);

  // Set interval to run hourly
  cronHandle = setInterval(async () => {
    await runPaymentsCleanup().catch((err) =>
      logger.error({ err }, "[PaymentsCron] Fatal error in hourly payments cron run")
    );
  }, 60 * 60 * 1000); // 1 hour

  logger.info("[PaymentsCron] Payments cleanup cron scheduled to run hourly");
}

export function stopPaymentsCron(): void {
  if (cronHandle) {
    clearInterval(cronHandle);
    cronHandle = null;
    logger.info("[PaymentsCron] Payments cleanup cron stopped");
  }
}

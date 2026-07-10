import redis from "shared/database/redis";
import { sendMail } from "infra/mail/brevo-mailer.service";

// ─── Queue key constants ────────────────────────────────────────────────────
const MAIL_QUEUE_KEY = "queue:emails";
const MAIL_DLQ_KEY = "queue:emails:dlq";
const MAX_RETRIES = 3;

// ─── Job shape ──────────────────────────────────────────────────────────────

export interface MailJob {
  to: string;
  subject: string;
  htmlContent: string;
}

/** Internal job envelope stored in Redis — includes retry metadata. */
interface MailJobEnvelope {
  job: MailJob;
  /** Number of delivery attempts so far (0 on first enqueue). */
  attempts: number;
  /** ISO timestamp of the first enqueue. */
  enqueuedAt: string;
  /** ISO timestamp of the last failure, if any. */
  lastFailedAt?: string;
  /** Last error message, if any. */
  lastError?: string;
}

// ─── Producer ───────────────────────────────────────────────────────────────

/**
 * Enqueue an email to the Redis-backed background worker queue.
 *
 * Uses LPUSH so the worker can pop with BRPOP from the right side (FIFO).
 * Falls back to a direct send attempt if Redis itself is unavailable.
 */
export const enqueueEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
): Promise<void> => {
  const envelope: MailJobEnvelope = {
    job: { to, subject, htmlContent },
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
  };

  try {
    await redis.lpush(MAIL_QUEUE_KEY, JSON.stringify(envelope));
    console.log(`[MailQueue] Enqueued email to ${to} — subject: "${subject}"`);
  } catch (err: any) {
    console.error(`[MailQueue] Redis unavailable — attempting direct send for ${to}:`, err?.message);
    // Fail-soft backup: direct send when Redis is down
    try {
      await sendMail({ to, subject, htmlContent });
    } catch (directErr) {
      console.error(`[MailQueue] Direct fallback send also failed for ${to}:`, directErr);
    }
  }
};

// ─── Worker ─────────────────────────────────────────────────────────────────

let workerRunning = false;

/**
 * Starts the Redis-backed mail worker.
 *
 * Architecture:
 *  - Uses BRPOP (blocking pop) instead of setTimeout polling:
 *      • 0 CPU usage when the queue is empty
 *      • Sub-millisecond wakeup on new jobs
 *  - Retry logic: up to MAX_RETRIES (3) attempts with exponential back-off
 *  - DLQ: jobs exceeding MAX_RETRIES are moved to `queue:emails:dlq`
 *    for manual inspection / replay without losing the message.
 *
 * A dedicated Redis client is used for BRPOP because a blocking command
 * monopolises the connection — we cannot mix it with other commands on
 * the shared `redis` instance.
 */
export const startMailWorker = (): void => {
  if (workerRunning) return;
  workerRunning = true;

  // Dedicated connection for blocking operations — must not share with other commands
  const { Redis } = require("ioredis") as typeof import("ioredis");
  const blockingClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    // Keep the connection alive indefinitely while waiting for jobs
    maxRetriesPerRequest: null,
  });

  const processNext = async (): Promise<void> => {
    try {
      // Block for up to 5 seconds waiting for a job, then loop again.
      // Timeout prevents connection from staying idle indefinitely on some proxies.
      const result = await blockingClient.brpop(MAIL_QUEUE_KEY, 5);

      if (!result) {
        // Timeout — no job arrived; loop again
        return;
      }

      const [, raw] = result;
      let envelope: MailJobEnvelope;

      try {
        envelope = JSON.parse(raw);
      } catch {
        console.error("[MailWorker] Corrupt job payload — discarding:", raw?.slice(0, 200));
        return;
      }

      envelope.attempts += 1;
      const { job, attempts } = envelope;

      console.log(
        `[MailWorker] Processing job for ${job.to} (attempt ${attempts}/${MAX_RETRIES})`,
      );

      try {
        await sendMail(job);
        console.log(`[MailWorker] ✅ Email delivered to ${job.to}`);
      } catch (sendErr: any) {
        console.error(
          `[MailWorker] ❌ Delivery failed for ${job.to} (attempt ${attempts}):`,
          sendErr?.message || sendErr,
        );

        envelope.lastFailedAt = new Date().toISOString();
        envelope.lastError = sendErr?.message || String(sendErr);

        if (attempts < MAX_RETRIES) {
          // Exponential back-off: 10s → 30s → 90s
          const delayMs = Math.pow(3, attempts) * 10_000;
          console.log(
            `[MailWorker] Scheduling retry in ${delayMs / 1000}s for ${job.to}`,
          );
          setTimeout(async () => {
            try {
              await redis.lpush(MAIL_QUEUE_KEY, JSON.stringify(envelope));
            } catch (requeueErr) {
              console.error("[MailWorker] Failed to requeue job:", requeueErr);
            }
          }, delayMs);
        } else {
          // Exhausted retries — move to Dead Letter Queue
          console.error(
            `[MailWorker] 🪦 Job for ${job.to} exhausted ${MAX_RETRIES} retries. Moving to DLQ.`,
          );
          try {
            await redis.lpush(MAIL_DLQ_KEY, JSON.stringify(envelope));
          } catch (dlqErr) {
            console.error("[MailWorker] Failed to push to DLQ:", dlqErr);
          }
        }
      }
    } catch (err: any) {
      // Unexpected error (e.g., Redis disconnect) — log and continue
      if (err?.message?.includes("Connection is closed")) {
        console.warn("[MailWorker] Redis connection closed — will retry on next loop.");
      } else {
        console.error("[MailWorker] Unexpected worker error:", err?.message || err);
      }
    }
  };

  // Worker loop — runs continuously
  const loop = async (): Promise<void> => {
    while (workerRunning) {
      await processNext();
    }
  };

  // Start async, don't block server startup
  loop().catch((err) => {
    console.error("[MailWorker] Fatal loop crash — worker stopped:", err);
    workerRunning = false;
  });

  console.log(
    `[MailWorker] Started (BRPOP mode, max retries: ${MAX_RETRIES}, DLQ: ${MAIL_DLQ_KEY})`,
  );
};

// ─── DLQ utilities ──────────────────────────────────────────────────────────

/**
 * Returns all jobs currently in the Dead Letter Queue without removing them.
 * Used by admin endpoints for manual inspection.
 */
export const getDlqJobs = async (): Promise<MailJobEnvelope[]> => {
  try {
    const raw = await redis.lrange(MAIL_DLQ_KEY, 0, -1);
    return raw.map((r) => JSON.parse(r) as MailJobEnvelope);
  } catch {
    return [];
  }
};

/**
 * Re-queues all DLQ jobs back to the main queue for retry.
 * Clears the DLQ after re-queuing.
 * Used by admin endpoints for manual replay.
 */
export const replayDlq = async (): Promise<{ replayed: number }> => {
  const jobs = await getDlqJobs();
  if (jobs.length === 0) return { replayed: 0 };

  for (const envelope of jobs) {
    // Reset attempts so it gets a fresh set of MAX_RETRIES
    envelope.attempts = 0;
    envelope.lastError = undefined;
    envelope.lastFailedAt = undefined;
    await redis.lpush(MAIL_QUEUE_KEY, JSON.stringify(envelope));
  }

  await redis.del(MAIL_DLQ_KEY);
  console.log(`[MailWorker] Replayed ${jobs.length} DLQ jobs.`);
  return { replayed: jobs.length };
};

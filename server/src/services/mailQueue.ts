import redis from "shared/database/redis";
import { sendMail } from "infra/mail/brevo-mailer.service";

const MAIL_QUEUE_KEY = "queue:emails";

export interface MailJob {
  to: string;
  subject: string;
  htmlContent: string;
}

/**
 * Enqueue an email to the Redis-backed background worker queue.
 */
export const enqueueEmail = async (to: string, subject: string, htmlContent: string): Promise<void> => {
  const job: MailJob = { to, subject, htmlContent };
  try {
    await redis.lpush(MAIL_QUEUE_KEY, JSON.stringify(job));
    console.log(`[MailQueue] Enqueued email to ${to} with subject "${subject}"`);
  } catch (err: any) {
    console.error(`[MailQueue] Failed to enqueue email for ${to}:`, err?.message || err);
    // Fail-soft backup: attempt direct send if queue fails to avoid losing notifications
    try {
      await sendMail(job);
    } catch (directErr) {
      console.error(`[MailQueue] Direct fallback send also failed:`, directErr);
    }
  }
};

let workerRunning = false;

/**
 * Starts the Redis background mail worker.
 * Checks for queued emails periodically.
 */
export const startMailWorker = (): void => {
  if (workerRunning) return;
  workerRunning = true;

  const poll = async () => {
    try {
      // Use RPOP to fetch the next email job
      const rawJob = await redis.rpop(MAIL_QUEUE_KEY);
      if (rawJob) {
        const job = JSON.parse(rawJob) as MailJob;
        console.log(`[MailQueue Worker] Processing mail job for ${job.to}`);
        try {
          await sendMail(job);
        } catch (sendErr) {
          console.error(`[MailQueue Worker] Error sending email to ${job.to}:`, sendErr);
        }
      }
    } catch (err: any) {
      console.error("[MailQueue Worker] Poll iteration failed:", err?.message || err);
    }

    // Schedule next iteration
    setTimeout(poll, 1000);
  };

  // Launch worker loop
  setTimeout(poll, 1000);
  console.log("[MailQueue Worker] Asynchronous email worker started.");
};

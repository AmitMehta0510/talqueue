/**
 * @file services/eventWorker.ts
 *
 * BullMQ worker that processes platform events from the "platform:events" queue.
 *
 * Each job handler is isolated — a failure in ES sync does NOT cancel the
 * activity log or notification dispatch. Each side-effect is wrapped
 * independently and failures are logged without re-throwing.
 *
 * Concurrency:
 *   - Default: 5 concurrent jobs (configurable via EVENT_WORKER_CONCURRENCY env)
 *   - Each job runs in the same Node.js process (no separate process needed)
 *   - Memory-safe: BullMQ releases job context after completion
 *
 * To start the worker, call startEventWorker() once in server.ts.
 */

import { Worker, Job } from "bullmq";
import { syncJobsToElasticBulk } from "services/elasticSync";
import { invalidateJobsListingCache } from "modules/jobs/jobs.service";
import { createActivity } from "modules/activities/activity.service";
import { addReputation } from "modules/reputation/reputation.service";
import { createNotification } from "modules/notifications/notifications.service";
import elasticClient from "services/elasticClient";
import prisma from "shared/database/prisma";
import logger from "shared/logger";
import type {
  JobCreatedPayload,
  JobUpdatedPayload,
  JobArchivedPayload,
} from "./eventBus";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// ─── Individual event handlers ────────────────────────────────────────────────

async function handleJobCreated(data: JobCreatedPayload): Promise<void> {
  const { jobId, userId, companyId, title, companyName } = data;
  logger.info({ jobId, event: "job.created" }, "[EventWorker] Processing job.created");

  // 1. Sync to Elasticsearch (most important — run first)
  try {
    await syncJobsToElasticBulk([jobId]);
    logger.info({ jobId }, "[EventWorker] ES sync complete for new job");
  } catch (err: any) {
    logger.error({ jobId, err }, "[EventWorker] ES sync failed for job.created");
  }

  // 2. Activity log
  try {
    await createActivity(userId, "JOB_POSTED", "Created a new job", `Posted ${title} at ${companyName}`, { jobId });
  } catch (err: any) {
    logger.error({ jobId, err }, "[EventWorker] Activity log failed for job.created");
  }

  // 3. Reputation
  try {
    await addReputation(userId, "JOB_POSTED", 20, "Posted a job", { jobId, companyId });
  } catch (err: any) {
    logger.error({ jobId, err }, "[EventWorker] Reputation update failed for job.created");
  }

  // 4. Notifications — fetch connections + current employees, notify both groups
  try {
    const [connections, employees] = await Promise.all([
      prisma.connection.findMany({
        where: { status: "ACCEPTED", OR: [{ senderId: userId }, { receiverId: userId }] },
        select: { senderId: true, receiverId: true },
      }),
      prisma.experience.findMany({
        where: { companyId, isCurrent: true },
        select: { userId: true },
      }),
    ]);

    const notificationTargets = [
      ...connections.map((c) => (c.senderId === userId ? c.receiverId : c.senderId)),
      ...employees.filter((e) => e.userId !== userId).map((e) => e.userId),
    ];

    // De-duplicate and batch notifications
    const uniqueTargets = [...new Set(notificationTargets)];
    await Promise.all(
      uniqueTargets.map((targetUserId) =>
        createNotification({
          userId: targetUserId,
          type:    "SYSTEM",
          title:   "New Job Posted",
          message: `${title} role posted at ${companyName}`,
        }).catch((err) => logger.error({ targetUserId, err }, "[EventWorker] Notification failed")),
      ),
    );
    logger.info({ jobId, notified: uniqueTargets.length }, "[EventWorker] Notifications sent for job.created");
  } catch (err: any) {
    logger.error({ jobId, err }, "[EventWorker] Notification dispatch failed for job.created");
  }

  // 5. Invalidate jobs listing cache
  try {
    await invalidateJobsListingCache();
  } catch (err: any) {
    logger.warn({ err }, "[EventWorker] Cache invalidation failed for job.created");
  }
}

async function handleJobUpdated(data: JobUpdatedPayload): Promise<void> {
  const { jobId } = data;
  logger.info({ jobId, event: "job.updated" }, "[EventWorker] Processing job.updated");

  try {
    await syncJobsToElasticBulk([jobId]);
  } catch (err: any) {
    logger.error({ jobId, err }, "[EventWorker] ES sync failed for job.updated");
  }

  try {
    await invalidateJobsListingCache();
  } catch (err: any) {
    logger.warn({ err }, "[EventWorker] Cache invalidation failed for job.updated");
  }
}

async function handleJobArchived(data: JobArchivedPayload): Promise<void> {
  const { jobId } = data;
  logger.info({ jobId, event: "job.archived" }, "[EventWorker] Processing job.archived");

  // Remove from ES index
  try {
    await elasticClient.delete({ index: "jobs", id: jobId }).catch(() => {});
  } catch (err: any) {
    logger.error({ jobId, err }, "[EventWorker] ES delete failed for job.archived");
  }

  try {
    await invalidateJobsListingCache();
  } catch (err: any) {
    logger.warn({ err }, "[EventWorker] Cache invalidation failed for job.archived");
  }
}

// ─── Worker ──────────────────────────────────────────────────────────────────

let workerInstance: Worker | null = null;

/**
 * Starts the BullMQ event worker. Call once in server.ts during startup.
 * Safe to call multiple times — creates only one worker instance.
 */
export function startEventWorker(): void {
  if (workerInstance) return;

  const concurrency = parseInt(process.env.EVENT_WORKER_CONCURRENCY ?? "5", 10);

  workerInstance = new Worker(
    "platform:events",
    async (job: Job) => {
      switch (job.name) {
        case "job.created":
          return handleJobCreated(job.data as JobCreatedPayload);
        case "job.updated":
          return handleJobUpdated(job.data as JobUpdatedPayload);
        case "job.archived":
          return handleJobArchived(job.data as JobArchivedPayload);
        default:
          logger.warn({ jobName: job.name }, "[EventWorker] Unknown event type — ignoring");
      }
    },
    {
      connection: { url: REDIS_URL },
      concurrency,
    },
  );

  workerInstance.on("completed", (job) => {
    logger.debug({ jobName: job.name, jobId: job.id }, "[EventWorker] Job completed");
  });

  workerInstance.on("failed", (job, err) => {
    logger.error({ jobName: job?.name, jobId: job?.id, err }, "[EventWorker] Job failed");
  });

  workerInstance.on("error", (err) => {
    logger.error({ err }, "[EventWorker] Worker error");
  });

  logger.info({ concurrency }, "[EventWorker] Started (concurrency: " + concurrency + ")");
}

/**
 * Gracefully stops the event worker.
 * Called during SIGTERM shutdown to allow in-flight jobs to complete.
 */
export async function stopEventWorker(): Promise<void> {
  if (!workerInstance) return;
  await workerInstance.close();
  workerInstance = null;
  logger.info("[EventWorker] Stopped gracefully");
}

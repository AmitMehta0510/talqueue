/**
 * @file job-lifecycle.cron.ts
 * @module Infra/Crons
 *
 * Job lifecycle management cron — two independent schedules:
 *
 *  1. Deadline Closer  (0 2 * * * UTC)
 *     Marks OPEN jobs as CLOSED when their applicationDeadline has passed.
 *     Single atomic `updateMany` — no ATS HTTP calls.
 *
 *  2. ATS Archiver     (0 6 * * * UTC)
 *     Re-scans the live ATS board for each OPEN job that has an atsSource.
 *     If a job is no longer present on its company's ATS board → ARCHIVED.
 *     Processes companies in batches of 10 with event-loop yields between
 *     batches (consistent with the job-scraper pattern).
 *
 * Both executors are exported as pure async functions so Vitest can call
 * them directly without scheduling real cron timers.
 *
 * Fail-soft: per-company ATS errors are caught and logged. The batch
 * continues. Neither function ever throws to the caller.
 */

import cron from "node-cron";
import axios from "axios";
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
      return `[${timestamp}] [JobLifecycle] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/** Number of companies processed per batch in the ATS archiver. */
const ATS_BATCH_SIZE = 10;

/** Delay in ms between ATS HTTP requests to avoid rate-limiting. */
const REQUEST_DELAY_MS = 300;

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------

/** Yields control back to the Node.js macrotask queue between batch iterations. */
const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Splits an array into fixed-size chunks.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// ATS LIVE JOB FETCHERS
// ---------------------------------------------------------------------------

/**
 * Returns the set of external job IDs currently live on a Greenhouse board.
 * Returns null on HTTP error.
 */
async function fetchLiveGreenhouseJobIds(atsToken: string): Promise<Set<string> | null> {
  try {
    const res = await axios.get(
      `https://boards-api.greenhouse.io/v1/boards/${atsToken}/jobs`,
      { timeout: 8_000 }
    );
    const jobs: { id: number }[] = res.data?.jobs ?? [];
    return new Set(jobs.map((j) => `greenhouse-${j.id}`));
  } catch {
    return null;
  }
}

/**
 * Returns the set of external job IDs currently live on a Lever board.
 * Returns null on HTTP error.
 */
async function fetchLiveLeverJobIds(atsToken: string): Promise<Set<string> | null> {
  try {
    const res = await axios.get(
      `https://api.lever.co/v0/postings/${atsToken}?mode=json`,
      { timeout: 8_000 }
    );
    const postings: { id: string }[] = Array.isArray(res.data) ? res.data : [];
    return new Set(postings.map((p) => `lever-${p.id}`));
  } catch {
    return null;
  }
}

/**
 * Returns the set of external job IDs currently live on an Ashby board.
 * Returns null on HTTP error.
 */
async function fetchLiveAshbyJobIds(atsToken: string): Promise<Set<string> | null> {
  try {
    const res = await axios.post(
      "https://api.ashbyhq.com/posting-api/job-board",
      { organizationHostedJobsPageName: atsToken },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 8_000,
      }
    );
    const jobs: { id: string }[] = res.data?.jobs ?? [];
    return new Set(jobs.map((j) => `ashby-${j.id}`));
  } catch {
    return null;
  }
}

/**
 * Fetches the live set of ATS job IDs for a given company's ATS board.
 * Returns null if the atsSource is unknown or the request fails.
 */
async function fetchLiveAtsJobIds(
  atsToken: string,
  atsSource: string
): Promise<Set<string> | null> {
  switch (atsSource) {
    case "greenhouse":
      return fetchLiveGreenhouseJobIds(atsToken);
    case "lever":
      return fetchLiveLeverJobIds(atsToken);
    case "ashby":
      return fetchLiveAshbyJobIds(atsToken);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// EXECUTOR 1 — DEADLINE CLOSER
// ---------------------------------------------------------------------------

/**
 * Marks all OPEN jobs whose `applicationDeadline` has passed as CLOSED.
 *
 * Single atomic `prisma.job.updateMany` — no external HTTP calls.
 * Sets `archivedAt = now()` as a soft-close timestamp for audit purposes.
 *
 * @returns The number of jobs closed. Returns 0 on DB error (fail-soft).
 */
export async function runDeadlineCloser(): Promise<{ closed: number }> {
  const start = Date.now();
  logger.info("Deadline closer: starting scan for expired job deadlines...");

  try {
    const now = new Date();
    const { count } = await prisma.job.updateMany({
      where: {
        status: "OPEN",
        applicationDeadline: { lt: now },
      },
      data: {
        status: "CLOSED",
        archivedAt: now,
      },
    });

    const durationMs = Date.now() - start;
    logger.info(`Deadline closer: CLOSED ${count} job(s) in ${durationMs}ms.`);
    return { closed: count };
  } catch (err: any) {
    logger.error(`Deadline closer: DB error — ${err?.message || String(err)}`);
    return { closed: 0 };
  }
}

// ---------------------------------------------------------------------------
// EXECUTOR 2 — ATS ARCHIVER
// ---------------------------------------------------------------------------

/**
 * Re-scans live ATS boards and archives OPEN jobs that are no longer present.
 *
 * Algorithm:
 *  1. Query all OPEN jobs that have both `atsSource` and `externalJobId` set.
 *  2. Group jobs by company.
 *  3. For each company, fetch the live ATS board.
 *  4. Diff: DB job IDs not in the live set → ARCHIVED.
 *  5. Process companies in batches of ATS_BATCH_SIZE with event-loop yields.
 *
 * ATS HTTP errors per company are caught individually — the batch continues.
 *
 * @returns { archived, errors } counts. Never throws.
 */
export async function runAtsArchiver(): Promise<{
  archived: number;
  errors: number;
}> {
  const start = Date.now();
  logger.info("ATS archiver: starting re-scan of live ATS boards...");

  let archived = 0;
  let errors = 0;

  try {
    // Fetch all OPEN jobs that have an ATS source and external ID
    const atsJobs = await prisma.job.findMany({
      where: {
        status: "OPEN",
        atsSource: { not: null },
        externalJobId: { not: null },
      },
      select: {
        id: true,
        externalJobId: true,
        atsSource: true,
        companyId: true,
        company: {
          select: { atsToken: true, atsSource: true, name: true },
        },
      },
    });

    if (atsJobs.length === 0) {
      logger.info("ATS archiver: no OPEN ATS-sourced jobs found. Done.");
      return { archived: 0, errors: 0 };
    }

    // Group jobs by companyId
    type JobRow = (typeof atsJobs)[number];
    const byCompany = new Map<string, JobRow[]>();
    for (const job of atsJobs) {
      const list = byCompany.get(job.companyId) ?? [];
      list.push(job);
      byCompany.set(job.companyId, list);
    }

    logger.info(
      `ATS archiver: ${atsJobs.length} OPEN ATS job(s) across ${byCompany.size} company(s) to re-scan.`
    );

    const companyEntries = Array.from(byCompany.entries());
    const batches = chunkArray(companyEntries, ATS_BATCH_SIZE);

    for (const batch of batches) {
      await yieldToEventLoop();

      await Promise.all(
        batch.map(async ([companyId, jobs]) => {
          const company = jobs[0].company;
          const atsToken = company.atsToken;
          const atsSource = company.atsSource;

          if (!atsToken || !atsSource) {
            // Company has no ATS token — skip (jobs were manually created)
            return;
          }

          try {
            const liveIds = await fetchLiveAtsJobIds(atsToken, atsSource);

            if (!liveIds) {
              // ATS request failed — skip this company, do NOT archive
              logger.warn(
                `ATS archiver: could not fetch live jobs for "${company.name}" (${atsSource}:${atsToken}) — skipping.`
              );
              errors++;
              return;
            }

            // Find DB jobs that are no longer in the live ATS board
            const toArchiveIds = jobs
              .filter((j) => j.externalJobId && !liveIds.has(j.externalJobId))
              .map((j) => j.id);

            if (toArchiveIds.length === 0) return;

            const now = new Date();
            const { count } = await prisma.job.updateMany({
              where: {
                id: { in: toArchiveIds },
                status: "OPEN", // double-check — race-condition guard
              },
              data: {
                status: "ARCHIVED",
                archivedAt: now,
              },
            });

            archived += count;
            logger.info(
              `ATS archiver: archived ${count} job(s) for "${company.name}" (${atsSource}).`
            );
          } catch (err: any) {
            logger.error(
              `ATS archiver: error processing company "${company.name}": ${err?.message || String(err)}`
            );
            errors++;
          }

          await sleep(REQUEST_DELAY_MS);
        })
      );
    }
  } catch (err: any) {
    logger.error(`ATS archiver: unexpected top-level error — ${err?.message || String(err)}`);
  }

  const durationMs = Date.now() - start;
  logger.info(
    `ATS archiver: completed in ${durationMs}ms — archived=${archived}, errors=${errors}.`
  );

  return { archived, errors };
}

// ---------------------------------------------------------------------------
// CRON SCHEDULER
// ---------------------------------------------------------------------------

/**
 * Registers both job-lifecycle cron jobs.
 *
 * Cron 1: "0 2 * * *" — Deadline Closer at 02:00 UTC daily
 * Cron 2: "0 6 * * *" — ATS Archiver    at 06:00 UTC daily
 *
 * Registered via `setImmediate` in app.ts alongside other heavy scrapers.
 */
export function startJobLifecycleCron(): void {
  // Deadline Closer — 02:00 UTC
  cron.schedule(
    "0 2 * * *",
    async () => {
      await runDeadlineCloser();
    },
    { timezone: "UTC" }
  );

  // ATS Archiver — 06:00 UTC
  cron.schedule(
    "0 6 * * *",
    async () => {
      await runAtsArchiver();
    },
    { timezone: "UTC" }
  );

  logger.info(
    "Job lifecycle crons scheduled — Deadline Closer at 02:00 UTC, ATS Archiver at 06:00 UTC."
  );
}

/**
 * @file scripts/backfill-locations.ts
 *
 * One-time backfill: normalizes existing Profile.location and Job.location
 * free-text strings into Location table rows and sets the FK.
 *
 * Run AFTER `prisma migrate dev` applies the Location table + locationId FKs:
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-locations.ts
 *
 * Safe to re-run: uses upsert and skips rows that already have locationId set.
 */

import "shared/config/loadEnv";
import prisma from "shared/database/prisma";
import { resolveLocation } from "modules/location/location.service";

const BATCH_SIZE = 200;

async function backfillProfiles(): Promise<void> {
  console.log("[Backfill] Starting Profile location backfill...");
  let cursor: string | undefined;
  let processed = 0;
  let updated = 0;

  while (true) {
    const profiles = await prisma.profile.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { location: { not: null }, locationId: null },
      orderBy: { id: "asc" },
      select: { id: true, location: true },
    });

    if (!profiles.length) break;

    for (const profile of profiles) {
      if (!profile.location) continue;
      const locationId = await resolveLocation(profile.location);
      if (locationId) {
        await prisma.profile.update({ where: { id: profile.id }, data: { locationId } });
        updated++;
      }
      processed++;
    }

    cursor = profiles[profiles.length - 1].id;
    console.log(`[Backfill] Profiles: processed=${processed}, updated=${updated}`);
  }

  console.log(`[Backfill] ✅ Profile backfill done: ${updated}/${processed} resolved`);
}

async function backfillJobs(): Promise<void> {
  console.log("[Backfill] Starting Job location backfill...");
  let cursor: string | undefined;
  let processed = 0;
  let updated = 0;

  while (true) {
    const jobs = await prisma.job.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { location: { not: null }, locationId: null },
      orderBy: { id: "asc" },
      select: { id: true, location: true },
    });

    if (!jobs.length) break;

    for (const job of jobs) {
      if (!job.location) continue;
      const locationId = await resolveLocation(job.location);
      if (locationId) {
        await prisma.job.update({ where: { id: job.id }, data: { locationId } });
        updated++;
      }
      processed++;
    }

    cursor = jobs[jobs.length - 1].id;
    console.log(`[Backfill] Jobs: processed=${processed}, updated=${updated}`);
  }

  console.log(`[Backfill] ✅ Job backfill done: ${updated}/${processed} resolved`);
}

async function main() {
  await backfillProfiles();
  await backfillJobs();
}

main()
  .catch((err) => { console.error("[Backfill] Fatal:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());

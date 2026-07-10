/**
 * @file scripts/backfill-job-skills.ts
 *
 * One-time migration script: Job.skillsRequired String[] → JobSkill junction table.
 *
 * Run AFTER `prisma migrate deploy` has applied the JobSkill table:
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-job-skills.ts
 *
 * Strategy:
 *  1. Page through all jobs with non-empty skillsRequired
 *  2. For each skill name, upsert into Skill table (get or create)
 *  3. Upsert into JobSkill table (source = 'scraper')
 *  4. Skill names are lowercased + trimmed before matching so "React" = "react"
 *
 * Safe to re-run: uses upsert with skipDuplicates — idempotent.
 */

import "shared/config/loadEnv";
import prisma from "shared/database/prisma";

const BATCH_SIZE = 200;

async function main() {
  console.log("[Backfill] Starting JobSkill backfill from skillsRequired[]...");

  let processed = 0;
  let created    = 0;
  let cursor: string | undefined;

  while (true) {
    const jobs = await prisma.job.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { skillsRequired: { isEmpty: false } },
      orderBy: { id: "asc" },
      select: { id: true, skillsRequired: true },
    });

    if (!jobs.length) break;

    for (const job of jobs) {
      // Normalize: lowercase, trim, deduplicate
      const normalized = [
        ...new Set(job.skillsRequired.map((s) => s.toLowerCase().trim()).filter(Boolean)),
      ];

      for (const skillName of normalized) {
        // Upsert Skill — get existing or create new
        const skill = await prisma.skill.upsert({
          where:  { name: skillName },
          create: { name: skillName },
          update: {},
          select: { id: true },
        });

        // Upsert JobSkill — safe to re-run
        try {
          await prisma.jobSkill.create({
            data: { jobId: job.id, skillId: skill.id, source: "scraper" },
          });
          created++;
        } catch (e: any) {
          // P2002 = unique constraint violation (already exists) — skip
          if (e?.code !== "P2002") throw e;
        }
      }
      processed++;
    }

    cursor = jobs[jobs.length - 1].id;
    console.log(`[Backfill] Processed ${processed} jobs, created ${created} JobSkill records...`);
  }

  console.log(`[Backfill] ✅ Done. ${processed} jobs processed, ${created} JobSkill rows created.`);
}

main()
  .catch((err) => {
    console.error("[Backfill] ❌ Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

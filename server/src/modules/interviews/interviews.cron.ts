import cron from "node-cron";
import { acquireLock } from "shared/database/redis";
import { runInterviewSeed, validateYoutubeVideos } from "./interviews.scraper";


/**
 * Schedules the interview resource seed + YouTube validation.
 *
 * 3:00 AM IST — Seed: upsert curated video list into DB
 * 3:30 AM IST — Validate: check all active videos still exist on YouTube;
 *               soft-deactivate any that return 404/401 (deleted or private).
 *
 * Both jobs use a Redis distributed lock to prevent overlap in
 * multi-instance deployments.
 */
export const startInterviewScraperCron = () => {
  // ── Step 1: Nightly seed at 3:00 AM IST ──────────────────────────────────
  cron.schedule(
    "0 3 * * *",
    async () => {
      const hasLock = await acquireLock("cron:interview:seed", 1500);
      if (!hasLock) return;

      console.log("[InterviewScraper] Starting scheduled seed refresh...");
      try {
        const result = await runInterviewSeed();
        console.log(
          `[InterviewScraper] Seed complete — created: ${result.created}, updated: ${result.updated}`,
        );
      } catch (error) {
        console.error("[InterviewScraper] Seed cron failed:", error);
      }
    },
    { timezone: "Asia/Kolkata" },
  );

  // ── Step 2: YouTube validation at 3:30 AM IST ────────────────────────────
  // Runs 30 min after the seed so newly upserted videos are also checked.
  cron.schedule(
    "30 3 * * *",
    async () => {
      const hasLock = await acquireLock("cron:interview:validate", 2700);
      if (!hasLock) return;

      console.log("[InterviewValidator] Starting YouTube availability check...");
      try {
        const result = await validateYoutubeVideos();
        console.log(
          `[InterviewValidator] Complete — checked: ${result.checked}, deactivated: ${result.deactivated}, errors: ${result.errors}`,
        );
      } catch (error) {
        console.error("[InterviewValidator] Validation cron failed:", error);
      }
    },
    { timezone: "Asia/Kolkata" },
  );

  console.log(
    "[InterviewScraper] Crons scheduled — seed at 3:00 AM IST, validation at 3:30 AM IST",
  );
};

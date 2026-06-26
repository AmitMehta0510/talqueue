import cron from "node-cron";
import { runInterviewSeed } from "./interviews.scraper";

/**
 * Schedules the interview resource seed to run nightly at 3 AM IST.
 * Loaded via setImmediate in app.ts (same pattern as job/hackathon scrapers).
 */
export const startInterviewScraperCron = () => {
  cron.schedule(
    "0 3 * * *",
    async () => {
      console.log("[InterviewScraper] Starting scheduled seed refresh (IST)...");
      try {
        const result = await runInterviewSeed();
        console.log(
          `[InterviewScraper] Completed — created: ${result.created}, updated: ${result.updated}`,
        );
      } catch (error) {
        console.error("[InterviewScraper] Cron job failed:", error);
      }
    },
    { timezone: "Asia/Kolkata" },
  );

  console.log("[InterviewScraper] Cron scheduled — runs nightly at 3 AM IST");
};

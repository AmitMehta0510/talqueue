/**
 * hackathon-scraper.cron.ts
 *
 * Schedules the hackathon scraper to run daily at 2:00 AM.
 * Follows the same cron pattern used by trending.cron.ts.
 */

import cron from "node-cron";
import { runAllScrapers } from "./hackathon-scraper.service";

export const startHackathonScraperCron = () => {
  // Daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("[HackathonScraper] Starting daily unified scrape...");

    try {
      const result = await runAllScrapers();

      console.log(
        `[HackathonScraper] Done — fetched: ${result.totalFetched}, created: ${result.created}, updated: ${result.updated}, errors: ${result.errors}`,
      );
    } catch (error) {
      console.error("[HackathonScraper] Cron job failed:", error);
    }
  });

  console.log(
    "[HackathonScraper] Cron scheduled — runs daily at 2:00 AM",
  );
};


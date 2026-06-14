/**
 * hackathon-scraper.cron.ts
 *
 * Schedules the hackathon scraper to run daily at 2:00 AM,
 * and schedules the hackathon status auto-transition to run every 10 minutes.
 * Follows the same cron pattern used by trending.cron.ts.
 */

import cron from "node-cron";
import { runAllScrapers } from "./hackathon-scraper.service";
import { autoTransitionHackathonStatuses } from "../hackathons.service";

export const startHackathonScraperCron = () => {
  // Run status update immediately on server boot
  autoTransitionHackathonStatuses()
    .then(({ completedCount, liveCount }) => {
      if (completedCount > 0 || liveCount > 0) {
        console.log(
          `[HackathonStatusCron] Boot transition completed: ${completedCount} COMPLETED, ${liveCount} LIVE`
        );
      } else {
        console.log("[HackathonStatusCron] Boot transition completed: no changes");
      }
    })
    .catch((err) => {
      console.error("[HackathonStatusCron] Boot transition failed:", err);
    });

  // Daily at 2:00 AM for scraping external platforms
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

  // Every 10 minutes to auto-transition start/end date statuses
  cron.schedule("*/10 * * * *", async () => {
    console.log("[HackathonStatusCron] Running auto-transition for hackathon statuses...");
    try {
      const { completedCount, liveCount } = await autoTransitionHackathonStatuses();
      if (completedCount > 0 || liveCount > 0) {
        console.log(
          `[HackathonStatusCron] Auto-transition completed: ${completedCount} COMPLETED, ${liveCount} LIVE`
        );
      }
    } catch (error) {
      console.error("[HackathonStatusCron] Status transition cron failed:", error);
    }
  });

  console.log(
    "[HackathonScraper] Cron scheduled — runs daily at 2:00 AM",
  );
  console.log(
    "[HackathonStatusCron] Cron scheduled — runs every 10 minutes",
  );
};


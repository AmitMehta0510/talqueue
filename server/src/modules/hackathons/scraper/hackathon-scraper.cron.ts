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
import { acquireLock } from "shared/database/redis";

export const startHackathonScraperCron = () => {
  // Run status update immediately on server boot
  setImmediate(async () => {
    const hasLock = await acquireLock("cron:hackathon:boot-transition", 60);
    if (!hasLock) return;

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
  });

  // Runs at 7:00 AM, 11:00 AM, and 3:00 PM (IST) for scraping external platforms
  cron.schedule("0 7,11,15 * * *", async () => {
    // Lock scraper task execution for 3 hours (10800s)
    const hasLock = await acquireLock("cron:hackathon:scraper", 10800);
    if (!hasLock) return;

    console.log("[HackathonScraper] Starting scheduled unified scrape...");

    try {
      const result = await runAllScrapers();

      console.log(
        `[HackathonScraper] Done — fetched: ${result.totalFetched}, created: ${result.created}, updated: ${result.updated}, errors: ${result.errors}`,
      );
    } catch (error) {
      console.error("[HackathonScraper] Cron job failed:", error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // Every 10 minutes to auto-transition start/end date statuses
  cron.schedule("*/10 * * * *", async () => {
    const hasLock = await acquireLock("cron:hackathon:status-transition", 540);
    if (!hasLock) return;

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
    "[HackathonScraper] Cron scheduled — runs at 7 AM, 11 AM, and 3 PM (IST)",
  );
  console.log(
    "[HackathonStatusCron] Cron scheduled — runs every 10 minutes",
  );
};


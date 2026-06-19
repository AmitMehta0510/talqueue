import cron from "node-cron";
import { runJobScrape } from "modules/companies/scraper/job-scraper.service";

/**
 * Schedules the job scraper to run at 7 AM, 10 AM, 2 PM, and 6 PM IST.
 */
export const startJobScraperCron = () => {
  cron.schedule(
    "0 7,10,14,18 * * *",
    async () => {
      console.log("[JobScraper] Starting scheduled job scraping and refresh (IST)...");

      try {
        const result = await runJobScrape();
        console.log(
          `[JobScraper] Completed — processed: ${result.totalProcessed} companies, created: ${result.created}, updated: ${result.updated}, stale cleaned: ${result.staleArchived}`
        );
      } catch (error) {
        console.error("[JobScraper] Scheduled job scraper cron job failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("[JobScraper] Cron scheduled — runs at 7 AM, 10 AM, 2 PM, and 6 PM IST");
};

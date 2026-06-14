import cron from "node-cron";
import { runJobScrape } from "modules/companies/scraper/job-scraper.service";

/**
 * Schedules the job scraper to run daily at 3:00 AM.
 */
export const startJobScraperCron = () => {
  cron.schedule("0 3 * * *", async () => {
    console.log("[JobScraper] Starting daily job scraping and refresh...");

    try {
      const result = await runJobScrape();
      console.log(
        `[JobScraper] Completed — processed: ${result.totalProcessed} companies, created: ${result.created}, updated: ${result.updated}, stale cleaned: ${result.staleArchived}`
      );
    } catch (error) {
      console.error("[JobScraper] Daily job scraper cron job failed:", error);
    }
  });

  console.log("[JobScraper] Cron scheduled — runs daily at 3:00 AM");
};

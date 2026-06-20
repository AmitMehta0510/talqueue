import cron from "node-cron";
import { runCompanyDiscovery } from "./company-discovery.service";

/**
 * Schedules the company discovery cron to run once per day at midnight IST.
 *
 * This is intentionally separate from the job-scraper cron (jobs.cron.ts),
 * which runs 4x/day for existing seeded companies. Discovery is a heavier
 * operation (cross-referencing board lists, creating new companies, scraping
 * their jobs) and only needs to run once per day.
 */
export const startCompanyDiscoveryCron = () => {
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("[Discovery] Starting nightly company discovery and job auto-import...");

      try {
        const result = await runCompanyDiscovery();
        console.log(
          `[Discovery] Completed — ` +
          `Discovered: ${result.discovered}, ` +
          `Skipped: ${result.skipped}, ` +
          `Jobs Created: ${result.jobsCreated}, ` +
          `Jobs Updated: ${result.jobsUpdated}, ` +
          `Errors: ${result.errors}`
        );
      } catch (error) {
        console.error("[Discovery] Nightly discovery cron failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("[Discovery] Cron scheduled — runs at 00:00 IST daily");
};

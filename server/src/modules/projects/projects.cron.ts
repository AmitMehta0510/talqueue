import cron from "node-cron";
import { syncOutdatedProjectsGithub } from "./projects.service";

export const startProjectSyncCron = () => {
  //
  // Every hour
  //
  cron.schedule(
    "0 * * * *",

    async () => {
      console.log("[GitHub Sync Cron] Starting sync job...");

      try {
        const results = await syncOutdatedProjectsGithub();

        console.log(
          `[GitHub Sync Cron] Completed sync. Total: ${results.total}, Success: ${results.success}, Failed: ${results.failed}`
        );
      } catch (error) {
        console.error("[GitHub Sync Cron] Execution failed", error);
      }
    },
  );
};

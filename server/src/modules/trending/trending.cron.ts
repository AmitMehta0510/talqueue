import cron from "node-cron";
import { refreshTrendingSnapshots } from "./trending.service";
import { acquireLock } from "shared/database/redis";

export const startTrendingCron = () => {
  //
  // Every 10 mins
  //
  cron.schedule(
    "*/10 * * * *",

    async () => {
      // Try to acquire lock for 9 minutes (540s) so it doesn't overlap or run twice
      const hasLock = await acquireLock("cron:trending", 540);
      if (!hasLock) return;

      console.log("Refreshing trending snapshots...");

      try {
        await refreshTrendingSnapshots();

        console.log("Trending refreshed");
      } catch (error) {
        console.error("Trending cron failed", error);
      }
    },
  );
};

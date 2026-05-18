import cron from "node-cron";

import { refreshTrendingSnapshots } from "./trending.service";

export const startTrendingCron = () => {
  //
  // Every 10 mins
  //
  cron.schedule(
    "*/10 * * * *",

    async () => {
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

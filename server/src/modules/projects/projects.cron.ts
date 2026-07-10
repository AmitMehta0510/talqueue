import cron from "node-cron";
import { acquireLock } from "shared/database/redis";
import { syncOutdatedProjectsGithub } from "./projects.service";

/**
 * GitHub Project Sync Cron
 *
 * Runs every hour. Fetches fresh GitHub metadata (stars, forks, languages,
 * contributors, plagiarism risk) for projects whose lastGithubSyncAt is
 * older than 24 hours or has never been set.
 *
 * Redis lock (TTL: 55 min) prevents parallel runs across multiple server
 * instances — critical because GitHub API is rate-limited (5,000 req/hr
 * with auth, 60 req/hr without).
 */
export const startProjectSyncCron = () => {
  //
  // Every hour at :02 (avoids thundering herd with other :00 crons)
  //
  cron.schedule("2 * * * *", async () => {
    // Distributed lock — expires 55 min before next run to prevent overlap
    const hasLock = await acquireLock("cron:github-sync", 3300);
    if (!hasLock) {
      console.log("[GitHub Sync Cron] Skipped — another instance is running.");
      return;
    }

    console.log("[GitHub Sync Cron] Starting sync job...");

    try {
      const results = await syncOutdatedProjectsGithub();

      console.log(
        `[GitHub Sync Cron] Completed. Total: ${results.total}, Success: ${results.success}, Failed: ${results.failed}${results.rateLimited ? " ⚠️  Rate-limited — remaining projects deferred." : ""}`,
      );
    } catch (error) {
      console.error("[GitHub Sync Cron] Execution failed:", error);
    }
  });

  if (!process.env.GITHUB_TOKEN) {
    console.warn(
      "[GitHub Sync Cron] ⚠️  GITHUB_TOKEN is not set. " +
      "Sync will use the unauthenticated GitHub API (60 req/hr limit). " +
      "Set GITHUB_TOKEN for 5,000 req/hr.",
    );
  }

  console.log("[GitHub Sync Cron] Scheduled — runs hourly at :02 (Redis-locked).");
};


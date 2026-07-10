import cron from "node-cron";
import prisma from "shared/database/prisma";
import { acquireLock } from "shared/database/redis";
import { rebuildUserAffinities } from "./affinity.service";

/**
 * Affinity Rebuild Cron
 *
 * Strategy: Incremental nightly rebuild — only processes users who were
 * active (had an interaction, post, or login) in the past 7 days.
 * This keeps the job O(active_users × 500) instead of O(all_users × all_users).
 *
 * Schedule: Daily at 2:30 AM — off-peak, after trending cron finishes.
 * Lock TTL: 110 minutes — prevents overlap on large user bases.
 *
 * Full cold rebuild (all users) can still be triggered manually via:
 *   POST /api/v1/affinity/rebuild
 */

const ACTIVE_WINDOW_DAYS = 7;

const getActiveUserIds = async (): Promise<string[]> => {
  const since = new Date();
  since.setDate(since.getDate() - ACTIVE_WINDOW_DAYS);

  // Fetch users who had any activity in the last N days
  const recentUsers = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        // Had a post interaction
        { interactions: { some: { createdAt: { gte: since } } } },
        // Posted something
        { posts: { some: { createdAt: { gte: since } } } },
        // Their affinity was last calculated before the window (stale)
        {
          affinities: {
            none: { updatedAt: { gte: since } },
          },
        },
      ],
    },
    select: { id: true },
    // Safety cap — avoid unbounded queries on very large installs
    take: 2000,
  });

  return recentUsers.map((u) => u.id);
};

export const startAffinityCron = () => {
  // Daily at 2:30 AM
  cron.schedule("30 2 * * *", async () => {
    // Distributed lock: 110 minutes — prevents two instances running simultaneously
    const hasLock = await acquireLock("cron:affinity", 6600);
    if (!hasLock) return;

    console.log("[AffinityCron] Starting incremental affinity rebuild...");

    try {
      const activeUserIds = await getActiveUserIds();
      console.log(
        `[AffinityCron] Rebuilding affinities for ${activeUserIds.length} active users.`,
      );

      let processed = 0;
      let failed = 0;

      for (const userId of activeUserIds) {
        try {
          await rebuildUserAffinities(userId);
          processed++;
        } catch (err) {
          failed++;
          console.error(`[AffinityCron] Failed for userId=${userId}:`, err);
        }
      }

      console.log(
        `[AffinityCron] Completed. Processed: ${processed}, Failed: ${failed}`,
      );
    } catch (error) {
      console.error("[AffinityCron] Cron job failed:", error);
    }
  });

  console.log(
    "[AffinityCron] Scheduled — runs daily at 2:30 AM (incremental, active users only).",
  );
};

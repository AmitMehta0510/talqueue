import prisma from "shared/database/prisma";
import elasticClient from "./elasticClient";

interface SyncItem {
  postId: string;
  actionType: "INDEX" | "DELETE";
}

const syncBuffer: SyncItem[] = [];
const FLUSH_INTERVAL_MS = 3000;
const BATCH_THRESHOLD = 10;
let flushTimer: NodeJS.Timeout | null = null;

/**
 * Queues a post ID for synchronization.
 * Triggers a flush immediately if the batch threshold is met.
 */
export function queuePostForSync(postId: string, actionType: "INDEX" | "DELETE"): void {
  syncBuffer.push({ postId, actionType });
  
  if (syncBuffer.length >= BATCH_THRESHOLD) {
    flushBuffer().catch((err) => {
      console.error("[Forum Sync] Error in threshold-triggered flush:", err?.message || err);
    });
  }
}

/**
 * Flushes the current queue to Elasticsearch using bulk operations.
 * De-duplicates the buffer so only the latest action per post ID is executed.
 */
export async function flushBuffer(): Promise<void> {
  if (syncBuffer.length === 0) return;

  // Take snapshot of current buffer and clear it
  const batch = [...syncBuffer];
  syncBuffer.length = 0;

  // De-duplicate: only keep the last requested action for each postId in this batch
  const uniqueActions = new Map<string, "INDEX" | "DELETE">();
  for (const item of batch) {
    uniqueActions.set(item.postId, item.actionType);
  }

  const indexIds: string[] = [];
  const deleteIds: string[] = [];

  for (const [postId, action] of uniqueActions.entries()) {
    if (action === "INDEX") {
      indexIds.push(postId);
    } else {
      deleteIds.push(postId);
    }
  }

  // Fetch posts from database to index
  let posts: any[] = [];
  if (indexIds.length > 0) {
    try {
      posts = await prisma.post.findMany({
        where: {
          id: { in: indexIds },
          deletedAt: null, // Don't index soft-deleted posts
        },
        include: {
          tags: true,
        },
      });
    } catch (dbErr: any) {
      console.error("[Forum Sync] Failed to fetch posts from database for indexing:", dbErr?.message || dbErr);
    }
  }

  const postsMap = new Map<string, any>();
  for (const post of posts) {
    postsMap.set(post.id, post);
  }

  const operations: any[] = [];

  // Add explicit DELETE operations
  for (const postId of deleteIds) {
    operations.push({ delete: { _index: "forum_posts", _id: postId } });
  }

  // Add INDEX operations (or DELETE if post is no longer present/deleted)
  for (const postId of indexIds) {
    const post = postsMap.get(postId);
    if (post) {
      const doc = {
        content: post.content,
        tags: (post.tags || []).map((t: any) => t.tag),
        authorId: post.authorId,
        communityId: post.communityId,
        postType: post.type,
        createdAt: post.createdAt,
      };
      operations.push({ index: { _index: "forum_posts", _id: postId } });
      operations.push(doc);
    } else {
      // If the post was not found in the DB (or soft-deleted), ensure it is deleted from Elasticsearch
      operations.push({ delete: { _index: "forum_posts", _id: postId } });
    }
  }

  if (operations.length === 0) return;

  try {
    console.log(`[Forum Sync] Flushing batch of ${operations.length} operations to Elasticsearch...`);
    const response = await elasticClient.bulk({ operations });
    
    if (response.errors) {
      console.error("[Forum Sync] Bulk sync errors occurred:");
      if (response.items) {
        for (const item of response.items) {
          const action = Object.keys(item)[0];
          const result = (item as any)[action];
          if (result && result.error) {
            console.error(`  - Failed action for ID '${result._id}':`, result.error);
          }
        }
      }
    } else {
      console.log(`[Forum Sync] Successfully synced batch to Elasticsearch.`);
    }
  } catch (esErr: any) {
    console.error("[Forum Sync] Elasticsearch bulk operation failed:", esErr?.message || esErr);
  }
}

// Start periodic auto-flush timer
if (!flushTimer) {
  flushTimer = setInterval(() => {
    if (syncBuffer.length > 0) {
      flushBuffer().catch((err) => {
        console.error("[Forum Sync] Error in periodic auto-flush:", err?.message || err);
      });
    }
  }, FLUSH_INTERVAL_MS);
}

// Graceful shutdown flush
process.on("SIGTERM", () => {
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  if (syncBuffer.length > 0) {
    flushBuffer().catch((err) => {
      console.error("[Forum Sync] Error in shutdown flush:", err?.message || err);
    });
  }
});

import assert from "node:assert/strict";
import { buildOr } from "modules/discovery/candidate-generator.service";
import {
  calculateFeedScore,
  FeedContext,
  getFeedItemReason,
} from "./feed-ranking.service";
import { FEED_SCORE_WEIGHTS } from "./feed-score-config.service";

const context: FeedContext = {
  followingIds: ["user-1"],
  followingIdSet: new Set(["user-1"]),
  skillNames: ["typescript", "react"],
  skillNameSet: new Set(["typescript", "react"]),
  isFresher: true,
  interactionMap: new Map([["POST:post-1", 2]]),
  affinityMap: new Map([["user-1", 20]]),
};

const recentPost = {
  id: "post-1",
  authorId: "user-1",
  content: "Building a TypeScript compiler tool",
  createdAt: new Date(),
  _count: {
    likes: 3,
    comments: 2,
  },
  author: {
    engineeringScore: 100,
    trustLevel: "VERIFIED",
  },
};

assert.equal(
  getFeedItemReason(recentPost, "POST", context),
  "From someone you follow",
);

assert.ok(
  calculateFeedScore(recentPost, "POST", context) >
    FEED_SCORE_WEIGHTS.posts.following,
);

assert.deepEqual(
  buildOr([
    false,
    null,
    undefined,
    {
      featured: true,
    },
  ]),
  [
    {
      featured: true,
    },
  ],
);

console.log("feed ranking tests passed");

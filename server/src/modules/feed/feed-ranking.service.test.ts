import { describe, test, expect } from "vitest";
import { buildOr } from "modules/discovery/candidate-generator.service";
import {
  calculateFeedScore,
  FeedContext,
  getFeedItemReason,
} from "./feed-ranking.service";
import { FEED_SCORE_WEIGHTS } from "./feed-score-config.service";

describe("Feed Ranking Service", () => {
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

  test("should determine feed reason correctly", () => {
    expect(getFeedItemReason(recentPost, "POST", context)).toBe(
      "From someone you follow"
    );
  });

  test("should calculate valid feed score exceeding base thresholds", () => {
    expect(calculateFeedScore(recentPost, "POST", context)).toBeGreaterThan(
      FEED_SCORE_WEIGHTS.posts.following
    );
  });

  test("should compile database conditions using buildOr", () => {
    expect(
      buildOr([
        false,
        null,
        undefined,
        {
          featured: true,
        },
      ])
    ).toEqual([
      {
        featured: true,
      },
    ]);
  });
});


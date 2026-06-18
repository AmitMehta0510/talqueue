import { describe, test, expect, vi, beforeEach } from "vitest";
import prisma from "shared/database/prisma";
import {
  followUser,
  unfollowUser,
  getSuggestedConnections,
  getMutualConnections,
} from "./social.service";

// Mock helper services called in social.service
vi.mock("modules/notificatios/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
}));
vi.mock("modules/reputation/reputation.service", () => ({
  addReputation: vi.fn().mockResolvedValue({}),
}));
vi.mock("modules/affinity/affinity.service", () => ({
  calculateUserAffinity: vi.fn().mockResolvedValue({}),
}));
vi.mock("modules/activities/activity.service", () => ({
  createActivity: vi.fn().mockResolvedValue({}),
}));

describe("Social Service Refactored Logic Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("followUser & unfollowUser - Row Locking Minimization", () => {
    test("followUser - creates follow record and triggers counter updates asynchronously", async () => {
      // Mock ensureUserExists
      const userMock = {
        id: "user-1",
        username: "user1",
        verifiedEngineer: true,
        primaryRole: "STUDENT",
        followersCount: 0,
        followingCount: 0,
        connectionCount: 0,
        acceptingReferrals: true,
        profile: null,
      };
      
      const findUniqueSpy = vi.fn().mockResolvedValue(userMock);
      prisma.user.findUnique = findUniqueSpy;

      const createFollowSpy = vi.fn().mockResolvedValue({
        id: "follow-123",
        followerId: "user-1",
        followingId: "user-2",
        createdAt: new Date(),
      });
      prisma.follow.create = createFollowSpy;

      const updateSpy = vi.fn().mockResolvedValue(userMock);
      prisma.user.update = updateSpy;

      const result = await followUser("user-1", "user-2");

      expect(result).toBeDefined();
      expect(result.id).toBe("follow-123");
      
      // Follow creation is triggered immediately
      expect(createFollowSpy).toHaveBeenCalledWith({
        data: {
          followerId: "user-1",
          followingId: "user-2",
        },
      });

      // User updates should be triggered (they run asynchronously without awaiting)
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    test("unfollowUser - deletes follow record and runs counter updates asynchronously", async () => {
      const findUniqueSpy = vi.fn().mockResolvedValue({ id: "follow-123" });
      prisma.follow.findUnique = findUniqueSpy;

      const deleteSpy = vi.fn().mockResolvedValue({ id: "follow-123" });
      prisma.follow.delete = deleteSpy;

      const updateSpy = vi.fn().mockResolvedValue({});
      prisma.user.update = updateSpy;

      const result = await unfollowUser("user-1", "user-2");

      expect(result.success).toBe(true);

      expect(deleteSpy).toHaveBeenCalledWith({
        where: {
          id: "follow-123",
        },
      });

      // Counter updates should be triggered
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSuggestedConnections - Database Subquery Filters", () => {
    test("getSuggestedConnections - calls findMany with correct relational filters to bypass memory mapping", async () => {
      const mockAffinities = [
        {
          id: "affinity-1",
          score: 0.9,
          interactionCount: 5,
          collaborationScore: 0.8,
          skillSimilarityScore: 0.7,
          socialScore: 0.6,
          targetUser: {
            id: "target-1",
            username: "target1",
            profile: null,
            skills: [],
          },
        },
      ];

      const findManySpy = vi.fn().mockResolvedValue(mockAffinities);
      prisma.userAffinity.findMany = findManySpy;

      const result = await getSuggestedConnections("user-1", { limit: 10 });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].id).toBe("target-1");
      expect(result.users[0].affinityScore).toBe(0.9);

      // Verify that relational filters for targetUser are correctly used to exclude already followed/connected users
      expect(findManySpy).toHaveBeenCalled();
      const whereClause = findManySpy.mock.calls[0][0].where;
      
      expect(whereClause.userId).toBe("user-1");
      expect(whereClause.targetUserId).toEqual({ not: "user-1" });
      expect(whereClause.targetUser.followers).toEqual({
        none: {
          followerId: "user-1",
        },
      });
      expect(whereClause.targetUser.sentConnections).toEqual({
        none: {
          receiverId: "user-1",
        },
      });
      expect(whereClause.targetUser.receivedConnections).toEqual({
        none: {
          senderId: "user-1",
        },
      });
    });
  });

  describe("getMutualConnections - Database Level Intersection Query", () => {
    test("getMutualConnections - builds the intersection query correctly using prisma relationships", async () => {
      const mockUsers = [
        {
          id: "mutual-1",
          username: "mutual1",
          profile: null,
        },
      ];

      const findManySpy = vi.fn().mockResolvedValue(mockUsers);
      prisma.user.findMany = findManySpy;

      const result = await getMutualConnections("user-1", "user-2", { limit: 5 });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe("mutual1");

      // Verify we query using AND of OR structures checking connections of both currentUserId and otherUserId
      expect(findManySpy).toHaveBeenCalled();
      const whereClause = findManySpy.mock.calls[0][0].where;
      
      expect(whereClause.AND).toHaveLength(2);
      
      // First OR condition for currentUserId
      expect(whereClause.AND[0].OR).toEqual([
        {
          sentConnections: {
            some: {
              receiverId: "user-1",
              status: "ACCEPTED",
            },
          },
        },
        {
          receivedConnections: {
            some: {
              senderId: "user-1",
              status: "ACCEPTED",
            },
          },
        },
      ]);

      // Second OR condition for otherUserId
      expect(whereClause.AND[1].OR).toEqual([
        {
          sentConnections: {
            some: {
              receiverId: "user-2",
              status: "ACCEPTED",
            },
          },
        },
        {
          receivedConnections: {
            some: {
              senderId: "user-2",
              status: "ACCEPTED",
            },
          },
        },
      ]);
    });
  });
});

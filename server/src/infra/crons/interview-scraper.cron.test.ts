import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// ─── Module Level Mocks ───────────────────────────────────────────────────────

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

vi.mock("shared/database/prisma", () => ({
  default: {
    interviewResource: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("shared/database/redis", () => {
  const store = new Map<string, string>();
  return {
    default: {
      get: vi.fn().mockImplementation(async (key) => store.get(key) || null),
      setex: vi.fn().mockImplementation(async (key, _ttl, val) => {
        store.set(key, val);
      }),
      del: vi.fn().mockImplementation(async (...keys) => {
        keys.forEach((k) => store.delete(k));
      }),
      scan: vi.fn().mockImplementation(async () => ["0", []]),
    },
  };
});

// Import modules under test
import cron from "node-cron";
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { startInterviewScraperCron } from "../../modules/interviews/interviews.cron";
import { runInterviewSeed } from "../../modules/interviews/interviews.scraper";
import { seedInterviewResources } from "../../modules/interviews/interviews.service";

describe("Interview Scraper Cron & Seeding Suites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ─── 1. Cron Registration and Scheduling ───────────────────────────────────

  describe("startInterviewScraperCron Scheduler Setup", () => {
    it("registers cron job on the correct 3 AM IST schedule", () => {
      startInterviewScraperCron();
      expect(cron.schedule).toHaveBeenCalledTimes(1);

      const [cronExpression, , options] = (cron.schedule as Mock).mock.calls[0];
      expect(cronExpression).toBe("0 3 * * *");
      expect(options).toMatchObject({ timezone: "Asia/Kolkata" });
    });

    it("registers an async callback function", () => {
      startInterviewScraperCron();
      const [, callback] = (cron.schedule as Mock).mock.calls[0];
      expect(typeof callback).toBe("function");
    });
  });

  // ─── 2. Execution and Fail-Soft Handling ───────────────────────────────────

  describe("Cron Execution and Fail-Soft", () => {
    it("logs completion stats on successful run", async () => {
      // Mock prisma queries to make runInterviewSeed resolve successfully
      (prisma.interviewResource.findUnique as Mock).mockResolvedValue(null);
      (prisma.interviewResource.create as Mock).mockResolvedValue({});

      startInterviewScraperCron();
      const [, callback] = (cron.schedule as Mock).mock.calls[0];

      await callback();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[InterviewScraper] Starting scheduled seed refresh")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[InterviewScraper] Completed — created:")
      );
    });

    it("catches database errors and fails soft without throwing", async () => {
      (prisma.interviewResource.findUnique as Mock).mockRejectedValue(
        new Error("Database connection timeout error")
      );

      startInterviewScraperCron();
      const [, callback] = (cron.schedule as Mock).mock.calls[0];

      // Verification that the callback doesn't throw, and error is handled
      await expect(callback()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        "[InterviewScraper] Cron job failed:",
        expect.any(Error)
      );
    });
  });

  // ─── 3. Seed Service Logic (Upserts & Mocks) ────────────────────────────────

  describe("seedInterviewResources Service Logic", () => {
    const mockSeedItems = [
      {
        title: "Google SDE-1 Coding",
        sourceUrl: "https://www.youtube.com/watch?v=rjOFnH_xw7A",
        youtubeId: "rjOFnH_xw7A",
        channelName: "NeetCode",
        roleTag: "SDE_1" as const,
        difficulty: "INTERMEDIATE" as const,
        companyTag: "FAANG" as const,
        langTags: ["Python"],
      },
    ];

    it("creates a new record when search by youtubeId returns null", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValue(null);
      (prisma.interviewResource.create as Mock).mockResolvedValue(mockSeedItems[0]);

      const result = await seedInterviewResources(mockSeedItems);

      expect(prisma.interviewResource.findUnique).toHaveBeenCalledWith({
        where: { youtubeId: mockSeedItems[0].youtubeId },
      });
      expect(prisma.interviewResource.create).toHaveBeenCalledWith({
        data: mockSeedItems[0],
      });
      expect(prisma.interviewResource.update).not.toHaveBeenCalled();
      expect(result).toEqual({ created: 1, updated: 0 });
    });

    it("updates existing record and marks it active if youtubeId exists", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValue({
        id: "existing-id",
        youtubeId: "rjOFnH_xw7A",
        isActive: false,
      });
      (prisma.interviewResource.update as Mock).mockResolvedValue({
        id: "existing-id",
        ...mockSeedItems[0],
        isActive: true,
      });

      const result = await seedInterviewResources(mockSeedItems);

      expect(prisma.interviewResource.findUnique).toHaveBeenCalledWith({
        where: { youtubeId: mockSeedItems[0].youtubeId },
      });
      expect(prisma.interviewResource.update).toHaveBeenCalledWith({
        where: { youtubeId: mockSeedItems[0].youtubeId },
        data: { ...mockSeedItems[0], isActive: true },
      });
      expect(prisma.interviewResource.create).not.toHaveBeenCalled();
      expect(result).toEqual({ created: 0, updated: 1 });
    });

    it("triggers cache invalidation after seeding", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValue(null);
      (prisma.interviewResource.create as Mock).mockResolvedValue({});

      await seedInterviewResources(mockSeedItems);

      // Verify scan was triggered to invalidate redis keys
      expect(redis.scan).toHaveBeenCalled();
    });

    it("does not mutate or delete existing bookmark relationships", async () => {
      // In Prisma, an update call to a record does not touch related tables (SavedInterviewResource join table)
      // because there are no nested write operations in the update query data object.
      // We verify the query object structure passed to update.
      (prisma.interviewResource.findUnique as Mock).mockResolvedValue({
        id: "existing-id",
        youtubeId: "rjOFnH_xw7A",
      });

      await seedInterviewResources(mockSeedItems);

      const updateCall = (prisma.interviewResource.update as Mock).mock.calls[0][0];
      // Asserting that update data consists solely of resource fields, and contains no disconnect/delete operations.
      expect(updateCall.data).not.toHaveProperty("savedBy");
      expect(updateCall.data).not.toHaveProperty("rooms");
      expect(updateCall.data.youtubeId).toBe(mockSeedItems[0].youtubeId);
    });

    it("handles database timeout or deadlocks during seed upserts cleanly", async () => {
      (prisma.interviewResource.findUnique as Mock).mockRejectedValue(
        new Error("Deadlock detected during upsert transaction")
      );

      await expect(seedInterviewResources(mockSeedItems)).rejects.toThrow(
        "Deadlock detected during upsert transaction"
      );
    });
  });
});

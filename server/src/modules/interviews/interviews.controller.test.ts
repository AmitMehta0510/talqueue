import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// ─── Module Level Mocks ───────────────────────────────────────────────────────

vi.mock("shared/database/prisma", () => {
  const findManyMock = vi.fn();
  const countMock = vi.fn();
  const findUniqueMock = vi.fn();
  const createMock = vi.fn();
  const updateMock = vi.fn();
  const deleteMock = vi.fn();

  return {
    default: {
      interviewResource: {
        findMany: findManyMock,
        count: countMock,
        findUnique: findUniqueMock,
        create: createMock,
        update: updateMock,
      },
      savedInterviewResource: {
        findUnique: findUniqueMock,
        create: createMock,
        delete: deleteMock,
        findMany: findManyMock,
      },
      $transaction: vi.fn().mockImplementation(async (promises) => {
        return Promise.all(promises);
      }),
    },
  };
});

vi.mock("shared/database/redis", () => ({
  default: {
    get: vi.fn(),
    setex: vi.fn(),
    scan: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("shared/errors/AppError", () => ({
  default: class AppError extends Error {
    public statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
      this.name = "AppError";
    }
  },
}));

// Mock the asyncHandler so we can call controllers directly and inspect errors
vi.mock("shared/utils/asyncHandler", () => ({
  default: (fn: any) =>
    async (req: any, res: any, next: any) => {
      try {
        await fn(req, res, next);
      } catch (err) {
        next(err);
      }
    },
}));

// Import modules under test
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import AppError from "shared/errors/AppError";
import {
  listInterviewsHandler,
  getInterviewHandler,
  toggleSaveInterviewHandler,
  createInterviewHandler,
  updateInterviewHandler,
  deleteInterviewHandler,
  triggerScrapeHandler,
} from "./interviews.controller";

// ─── Express Mock Helpers ────────────────────────────────────────────────────

function makeReq(override: object = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    user: undefined,
    ...override,
  };
}

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const next = vi.fn();

// ─── Suites ──────────────────────────────────────────────────────────────────

describe("Interviews Controller & Service Integration Suites", () => {
  let redisStore: Map<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    redisStore = new Map<string, string>();

    // Default redis mock implementations
    (redis.get as Mock).mockImplementation(async (key) => redisStore.get(key) || null);
    (redis.setex as Mock).mockImplementation(async (key, _ttl, value) => {
      redisStore.set(key, value);
      return "OK";
    });
    (redis.scan as Mock).mockImplementation(async () => ["0", []]);
    (redis.del as Mock).mockImplementation(async (...keys) => {
      keys.forEach((k) => redisStore.delete(k));
      return keys.length;
    });
  });

  // ─── 1. Public Offset-Based Paginated Browsing & Filtering ──────────────────

  describe("GET /interviews — Listing Endpoint", () => {
    it("handles default offset pagination (page 1, limit 20)", async () => {
      (prisma.interviewResource.findMany as Mock).mockResolvedValueOnce([]);
      (prisma.interviewResource.count as Mock).mockResolvedValueOnce(0);

      const req = makeReq({ query: {} });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      expect(prisma.interviewResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          where: { isActive: true },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            data: [],
          }),
        })
      );
    });

    it("filters by roleTagSDE_1 correctly", async () => {
      (prisma.interviewResource.findMany as Mock).mockResolvedValueOnce([]);
      (prisma.interviewResource.count as Mock).mockResolvedValueOnce(0);

      const req = makeReq({ query: { roleTag: "SDE_1" } });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      expect(prisma.interviewResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            roleTag: "SDE_1",
          }),
        })
      );
    });

    it("filters by difficulty ADVANCED correctly", async () => {
      (prisma.interviewResource.findMany as Mock).mockResolvedValueOnce([]);
      (prisma.interviewResource.count as Mock).mockResolvedValueOnce(0);

      const req = makeReq({ query: { difficulty: "ADVANCED" } });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      expect(prisma.interviewResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            difficulty: "ADVANCED",
          }),
        })
      );
    });

    it("filters by language tag using HasSome logic", async () => {
      (prisma.interviewResource.findMany as Mock).mockResolvedValueOnce([]);
      (prisma.interviewResource.count as Mock).mockResolvedValueOnce(0);

      const req = makeReq({ query: { langTag: "React" } });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      expect(prisma.interviewResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            langTags: { hasSome: ["React"] },
          }),
        })
      );
    });

    it("performs case-insensitive title search mapping correctly", async () => {
      (prisma.interviewResource.findMany as Mock).mockResolvedValueOnce([]);
      (prisma.interviewResource.count as Mock).mockResolvedValueOnce(0);

      const req = makeReq({ query: { search: "LRU" } });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      expect(prisma.interviewResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: {
              contains: "LRU",
              mode: "insensitive",
            },
          }),
        })
      );
    });

    it("processes multi-column filter intersections (SDE_1 + ADVANCED + FAANG)", async () => {
      (prisma.interviewResource.findMany as Mock).mockResolvedValueOnce([]);
      (prisma.interviewResource.count as Mock).mockResolvedValueOnce(0);

      const req = makeReq({
        query: {
          roleTag: "SDE_1",
          difficulty: "ADVANCED",
          companyTag: "FAANG",
        },
      });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      expect(prisma.interviewResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            roleTag: "SDE_1",
            difficulty: "ADVANCED",
            companyTag: "FAANG",
          },
        })
      );
    });
  });

  // ─── 2. Redis Caching Flow ──────────────────────────────────────────────────

  describe("GET /interviews — Caching Mechanisms", () => {
    it("returns cached data immediately on Redis cache hits without querying Prisma", async () => {
      const cachedResult = {
        data: [{ id: "res-1", title: "Cached Video", isActive: true }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      // Populate mock store
      const expectedKey = "interviews:page:p1:l20:rt=SDE_1";
      redisStore.set(expectedKey, JSON.stringify(cachedResult));

      const req = makeReq({ query: { roleTag: "SDE_1" } });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      expect(redis.get).toHaveBeenCalledWith(expectedKey);
      expect(prisma.interviewResource.findMany).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            page: 1,
            totalPages: 1,
            data: expect.arrayContaining([
              expect.objectContaining({ id: "res-1", isSaved: false }),
            ]),
          }),
        })
      );
    });

    it("queries database and writes to Redis on cache miss", async () => {
      const dbResult = [{ id: "res-2", title: "DB Video", isActive: true }];
      (prisma.interviewResource.findMany as Mock).mockResolvedValueOnce(dbResult);
      (prisma.interviewResource.count as Mock).mockResolvedValueOnce(1);

      const req = makeReq({ query: { difficulty: "BEGINNER" } });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      const expectedKey = "interviews:page:p1:l20:df=BEGINNER";
      expect(redis.get).toHaveBeenCalledWith(expectedKey);
      expect(prisma.interviewResource.findMany).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalledWith(
        expectedKey,
        60,
        JSON.stringify({
          data: dbResult,
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
      );
    });
  });

  // ─── 3. Auth-Gated User Save State Annotations ──────────────────────────────

  describe("GET /interviews — Saved States Annotations", () => {
    it("annotates results with isSaved: true if record is bookmarked by logged in user", async () => {
      const listData = [
        { id: "saved-id", title: "Saved Video", isActive: true },
        { id: "other-id", title: "Unsaved Video", isActive: true },
      ];
      (prisma.interviewResource.findMany as Mock).mockResolvedValueOnce(listData);
      (prisma.interviewResource.count as Mock).mockResolvedValueOnce(2);

      // Mock user saved relationships
      (prisma.savedInterviewResource.findMany as Mock).mockResolvedValueOnce([
        { resourceId: "saved-id" },
      ]);

      const req = makeReq({
        user: { id: "user-1" },
        query: {},
      });
      const res = makeRes();

      await listInterviewsHandler(req, res, next);

      expect(prisma.savedInterviewResource.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: { resourceId: true },
      });

      const responsePayload = res.json.mock.calls[0][0].data.data;
      expect(responsePayload).toEqual([
        expect.objectContaining({ id: "saved-id", isSaved: true }),
        expect.objectContaining({ id: "other-id", isSaved: false }),
      ]);
    });

    it("annotates single resource details with isSaved correctly when authenticated", async () => {
      const resource = { id: "video-1", title: "Awesome video", isActive: true };
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce(resource);
      (prisma.savedInterviewResource.findMany as Mock).mockResolvedValueOnce([
        { resourceId: "video-1" },
      ]);

      const req = makeReq({
        user: { id: "user-1" },
        params: { id: "video-1" },
      });
      const res = makeRes();

      await getInterviewHandler(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "video-1",
            isSaved: true,
          }),
        })
      );
    });
  });

  // ─── 4. Public Detail lookups ───────────────────────────────────────────────

  describe("GET /interviews/:id — Single Detail Endpoint", () => {
    it("returns details of active resource to anyone", async () => {
      const resource = { id: "id-1", title: "Public Resource", isActive: true };
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce(resource);

      const req = makeReq({ params: { id: "id-1" } });
      const res = makeRes();

      await getInterviewHandler(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "id-1",
            title: "Public Resource",
            isSaved: false,
          }),
        })
      );
    });

    it("throws a 404 AppError if resource is missing or inactive", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce(null);

      const req = makeReq({ params: { id: "missing-id" } });
      const res = makeRes();

      await getInterviewHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: "Interview resource not found",
        })
      );
    });

    it("throws 404 if resource is soft-deleted (isActive: false)", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce({
        id: "deleted-id",
        isActive: false,
      });

      const req = makeReq({ params: { id: "deleted-id" } });
      const res = makeRes();

      await getInterviewHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: "Interview resource not found",
        })
      );
    });
  });

  // ─── 5. Auth-Gated Save & Toggle Actions ───────────────────────────────────

  describe("POST /interviews/:id/save — Toggle Save", () => {
    it("creates SavedInterviewResource row if not saved previously", async () => {
      // Mock resource exists
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce({
        id: "video-1",
        isActive: true,
      });

      // Mock bookmark doesn't exist
      (prisma.savedInterviewResource.findUnique as Mock).mockResolvedValueOnce(null);
      (prisma.savedInterviewResource.create as Mock).mockResolvedValueOnce({});

      const req = makeReq({
        user: { id: "user-1" },
        params: { id: "video-1" },
      });
      const res = makeRes();

      await toggleSaveInterviewHandler(req, res, next);

      expect(prisma.savedInterviewResource.create).toHaveBeenCalledWith({
        data: { userId: "user-1", resourceId: "video-1" },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { saved: true },
          message: "Resource saved",
        })
      );
    });

    it("deletes SavedInterviewResource row if resource is already saved", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce({
        id: "video-1",
        isActive: true,
      });

      // Mock bookmark exists
      (prisma.savedInterviewResource.findUnique as Mock).mockResolvedValueOnce({
        userId: "user-1",
        resourceId: "video-1",
      });
      (prisma.savedInterviewResource.delete as Mock).mockResolvedValueOnce({});

      const req = makeReq({
        user: { id: "user-1" },
        params: { id: "video-1" },
      });
      const res = makeRes();

      await toggleSaveInterviewHandler(req, res, next);

      expect(prisma.savedInterviewResource.delete).toHaveBeenCalledWith({
        where: { userId_resourceId: { userId: "user-1", resourceId: "video-1" } },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { saved: false },
          message: "Resource unsaved",
        })
      );
    });

    it("fails with 404 when trying to bookmark non-existent resource", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce(null);

      const req = makeReq({
        user: { id: "user-1" },
        params: { id: "missing-id" },
      });
      const res = makeRes();

      await toggleSaveInterviewHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: "Interview resource not found",
        })
      );
    });
  });

  // ─── 6. Admin Actions (CRUD operations) ────────────────────────────────────

  describe("Admin Privileged Operations", () => {
    const validPayload = {
      title: "Google Coding Interview",
      sourceUrl: "https://youtube.com/watch?v=12345",
      youtubeId: "12345",
      roleTag: "SDE_1",
      difficulty: "INTERMEDIATE",
      companyTag: "FAANG",
      langTags: ["Go"],
    };

    it("allows platform admins to manually create resources", async () => {
      (prisma.interviewResource.create as Mock).mockResolvedValueOnce({
        id: "new-res-id",
        ...validPayload,
      });

      const req = makeReq({
        user: { id: "admin-1" },
        body: validPayload,
      });
      const res = makeRes();

      await createInterviewHandler(req, res, next);

      expect(prisma.interviewResource.create).toHaveBeenCalledWith({
        data: {
          ...validPayload,
          addedById: "admin-1",
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Interview resource created",
        })
      );
    });

    it("handles creation schema validation errors correctly", async () => {
      const invalidPayload = { title: "No" }; // invalid length and missing required fields
      const req = makeReq({
        user: { id: "admin-1" },
        body: invalidPayload,
      });
      const res = makeRes();

      await createInterviewHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error)); // ZodError
      expect(prisma.interviewResource.create).not.toHaveBeenCalled();
    });

    it("allows updating resource fields and invalidates cache", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce({ id: "res-1" });
      (prisma.interviewResource.update as Mock).mockResolvedValueOnce({ id: "res-1" });

      const req = makeReq({
        params: { id: "res-1" },
        body: { title: "Updated Title" },
      });
      const res = makeRes();

      await updateInterviewHandler(req, res, next);

      expect(prisma.interviewResource.update).toHaveBeenCalledWith({
        where: { id: "res-1" },
        data: {
          title: "Updated Title",
          companyTag: "ANY",
          langTags: [],
        },
      });
      expect(redis.scan).toHaveBeenCalled(); // cache invalidation checking
    });

    it("allows soft-deletion of resource and invalidates cache", async () => {
      (prisma.interviewResource.findUnique as Mock).mockResolvedValueOnce({ id: "res-1" });
      (prisma.interviewResource.update as Mock).mockResolvedValueOnce({ id: "res-1", isActive: false });

      const req = makeReq({ params: { id: "res-1" } });
      const res = makeRes();

      await deleteInterviewHandler(req, res, next);

      expect(prisma.interviewResource.update).toHaveBeenCalledWith({
        where: { id: "res-1" },
        data: { isActive: false },
      });
      expect(redis.scan).toHaveBeenCalled(); // cache invalidation checking
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Interview resource deleted",
        })
      );
    });
  });
});

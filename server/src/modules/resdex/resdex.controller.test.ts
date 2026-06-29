import { describe, test, expect, vi, beforeEach } from "vitest";
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { resdexSearchHandler } from "./resdex.controller";
import AppError from "shared/errors/AppError";

// Mock prisma default object
vi.mock("shared/database/prisma", () => ({
  default: {
    companyAdmin: {
      findFirst: vi.fn(),
    },
    collegeTpo: {
      findFirst: vi.fn(),
    },
    collegeAdmin: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock redis default object
vi.mock("shared/database/redis", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock searchResdexCandidates from resdex.service
vi.mock("./resdex.service", () => ({
  searchResdexCandidates: vi.fn().mockResolvedValue({
    total: 2,
    candidates: [
      { id: "c1", username: "candidate1", engineeringScore: 90 },
      { id: "c2", username: "candidate2", engineeringScore: 85 },
    ],
  }),
}));

// Mock asyncHandler passes standard function
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

function mockReq(user: any = {}, body: any = {}) {
  return { user, body } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const mockNext = vi.fn();

describe("resdexSearchHandler access and quota limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects request if user is not authenticated", async () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = vi.fn();

    await resdexSearchHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  test("rejects search if user has student role and is not admin/recruiter/tpo", async () => {
    const req = mockReq({
      id: "u1",
      primaryRole: "STUDENT",
      roles: [{ role: { name: "STUDENT" } }],
    });
    const res = mockRes();
    const next = vi.fn();

    (prisma.companyAdmin.findFirst as any).mockResolvedValue(null);
    (prisma.collegeTpo.findFirst as any).mockResolvedValue(null);
    (prisma.collegeAdmin.findFirst as any).mockResolvedValue(null);

    await resdexSearchHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
  });

  test("allows search for platform admin without search limits", async () => {
    const req = mockReq({
      id: "admin-1",
      primaryRole: "SUPER_ADMIN",
      tier: "FREE",
    });
    const res = mockRes();
    const next = vi.fn();

    await resdexSearchHandler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.data.searchLimitInfo.isLimited).toBe(false);
  });

  test("enforces daily search limit of 5 for FREE recruiters", async () => {
    const req = mockReq({
      id: "recruiter-1",
      primaryRole: "RECRUITER",
      tier: "FREE",
    });
    const res = mockRes();
    const next = vi.fn();

    // Mock recruiter check passes
    (prisma.companyAdmin.findFirst as any).mockResolvedValue({ id: "ca-1" });
    // Mock redis returns 5 searches today
    (redis.get as any).mockResolvedValue("5");

    await resdexSearchHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(429);
    expect(error.message).toContain("Daily search limit reached");
  });

  test("increments search count in redis for free recruiter under limit", async () => {
    const req = mockReq({
      id: "recruiter-2",
      primaryRole: "RECRUITER",
      tier: "FREE",
    });
    const res = mockRes();
    const next = vi.fn();

    (prisma.companyAdmin.findFirst as any).mockResolvedValue({ id: "ca-2" });
    (redis.get as any).mockResolvedValue("2"); // 2 searches so far

    await resdexSearchHandler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining("resdex:search-count:recruiter-2"),
      3,
      "EX",
      86400
    );

    expect(res.json).toHaveBeenCalled();
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.data.searchLimitInfo).toEqual({
      isLimited: true,
      dailyLimit: 5,
      currentCount: 3,
    });
  });

  test("allows premium recruiters unlimited search access", async () => {
    const req = mockReq({
      id: "recruiter-premium",
      primaryRole: "RECRUITER",
      tier: "PREMIUM",
    });
    const res = mockRes();
    const next = vi.fn();

    (prisma.companyAdmin.findFirst as any).mockResolvedValue({ id: "ca-3" });
    // Even if redis has > 5 searches, premium is not limited
    (redis.get as any).mockResolvedValue("10");

    await resdexSearchHandler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.data.searchLimitInfo.isLimited).toBe(false);
  });
});

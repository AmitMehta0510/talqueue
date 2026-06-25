/**
 * @file tpo-dashboard.controller.test.ts
 *
 * Vitest unit tests for the TPO Dashboard controller.
 * Covers: requireTpoRole guard, stat aggregation, student list,
 * alumni approve/reject, and company claims.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// MOCKS
// ---------------------------------------------------------------------------

vi.mock("shared/database/prisma", () => ({
  default: {
    college: { findMany: vi.fn() },
    profile: { count: vi.fn(), findMany: vi.fn() },
    placementDrive: { count: vi.fn(), findMany: vi.fn() },
    education: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    companyAdmin: { findMany: vi.fn() },
    companyRequest: { findMany: vi.fn() },
  },
}));

vi.mock("modules/notificatios/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
}));

// asyncHandler mock — makes handlers async-awaitable in tests (established pattern)
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

vi.mock("winston", () => ({
  default: {
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    format: { combine: vi.fn(), timestamp: vi.fn(), printf: vi.fn() },
    transports: { Console: vi.fn() },
  },
}));

vi.mock("@prisma/client", () => ({
  NotificationType: { SYSTEM: "SYSTEM" },
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

import prisma from "shared/database/prisma";
import { createNotification } from "modules/notificatios/notifications.service";

import {
  requireTpoRole,
  getTpoDashboardStats,
  getTpoStudents,
  approveAlumniVerification,
  rejectAlumniVerification,
  getTpoCompanyClaims,
} from "./tpo-dashboard.controller";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeReq(override: object = {}): any {
  return {
    user: { id: "tpo-user-1" },
    tpoCollegeIds: ["college-1"],
    tpoColleges: [{ id: "college-1", name: "IIT Delhi" }],
    params: {},
    query: {},
    body: {},
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

// ---------------------------------------------------------------------------
// requireTpoRole
// ---------------------------------------------------------------------------

describe("requireTpoRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls next() and attaches tpoCollegeIds when user is a valid TPO", async () => {
    (prisma.college.findMany as any).mockResolvedValueOnce([
      { id: "college-1", name: "IIT Delhi" },
    ]);

    const req = { user: { id: "tpo-user-1" } } as any;
    const res = makeRes();

    await requireTpoRole(req, res, next);

    expect(next).toHaveBeenCalledWith(); // no error arg
    expect(req.tpoCollegeIds).toEqual(["college-1"]);
  });

  it("calls next(AppError 403) when user is not TPO of any college", async () => {
    (prisma.college.findMany as any).mockResolvedValueOnce([]);

    const req = { user: { id: "non-tpo-user" } } as any;
    const res = makeRes();

    await requireTpoRole(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
    expect(req.tpoCollegeIds).toBeUndefined();
  });

  it("calls next(AppError 401) when req.user is undefined", async () => {
    const req = { user: undefined } as any;
    const res = makeRes();

    await requireTpoRole(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });
});

// ---------------------------------------------------------------------------
// getTpoDashboardStats
// ---------------------------------------------------------------------------

describe("getTpoDashboardStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns correct stat counts for the TPO's colleges", async () => {
    (prisma.profile.count as any).mockResolvedValueOnce(150);   // students
    (prisma.placementDrive.count as any).mockResolvedValueOnce(3); // active drives
    (prisma.education.count as any).mockResolvedValueOnce(5);   // pending alumni

    (prisma.placementDrive.findMany as any).mockResolvedValueOnce([
      { companyId: "company-1" },
      { companyId: "company-2" },
      { companyId: null },
    ]);

    const req = makeReq();
    const res = makeRes();

    await getTpoDashboardStats(req, res, next);

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.totalStudents).toBe(150);
    expect(payload.activeDrives).toBe(3);
    expect(payload.pendingAlumniVerifications).toBe(5);
    expect(payload.recruiterCount).toBe(2); // null companyId excluded
  });
});

// ---------------------------------------------------------------------------
// getTpoStudents
// ---------------------------------------------------------------------------

describe("getTpoStudents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated student list with correct pagination metadata", async () => {
    (prisma.education.findMany as any).mockResolvedValueOnce([
      { userId: "u1" }, { userId: "u2" },
    ]);
    (prisma.profile.count as any).mockResolvedValueOnce(42);
    (prisma.profile.findMany as any).mockResolvedValueOnce([
      { userId: "u1", fullName: "Alice" },
      { userId: "u2", fullName: "Bob" },
    ]);

    const req = makeReq({ query: { page: "1", limit: "20" } });
    const res = makeRes();

    await getTpoStudents(req, res, next);

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.students).toHaveLength(2);
    expect(payload.pagination.total).toBe(42);
    expect(payload.pagination.totalPages).toBe(3); // ceil(42/20)
  });

  it("applies graduationYear filter to the education query", async () => {
    (prisma.education.findMany as any).mockResolvedValueOnce([{ userId: "u1" }]);
    (prisma.profile.count as any).mockResolvedValueOnce(1);
    (prisma.profile.findMany as any).mockResolvedValueOnce([{ userId: "u1" }]);

    const req = makeReq({ query: { graduationYear: "2025" } });
    const res = makeRes();

    await getTpoStudents(req, res, next);

    const educationCall = (prisma.education.findMany as any).mock.calls[0][0];
    expect(educationCall.where.endYear).toBe(2025);
  });
});

// ---------------------------------------------------------------------------
// approveAlumniVerification
// ---------------------------------------------------------------------------

describe("approveAlumniVerification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the education row and sends a notification to the student", async () => {
    (prisma.education.findFirst as any).mockResolvedValueOnce({
      id: "edu-1",
      userId: "student-1",
      user: { username: "alice" },
    });
    (prisma.education.update as any).mockResolvedValueOnce({});

    const req = makeReq({ params: { educationId: "edu-1" } });
    const res = makeRes();

    await approveAlumniVerification(req, res, next);

    expect(prisma.education.update).toHaveBeenCalledWith({
      where: { id: "edu-1" },
      data: { alumniVerified: true, alumniVerifiedAt: expect.any(Date) },
    });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "student-1", title: "Alumni Status Verified" })
    );
    expect(res.json.mock.calls[0][0].data.approved).toBe(true);
  });

  it("returns 404 when education record is not found in the TPO's college", async () => {
    (prisma.education.findFirst as any).mockResolvedValueOnce(null);

    const req = makeReq({ params: { educationId: "non-existent-edu" } });
    const res = makeRes();

    await approveAlumniVerification(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(prisma.education.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// rejectAlumniVerification
// ---------------------------------------------------------------------------

describe("rejectAlumniVerification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resets isAlumni=false and sends rejection notification", async () => {
    (prisma.education.findFirst as any).mockResolvedValueOnce({
      id: "edu-2",
      userId: "student-2",
    });
    (prisma.education.update as any).mockResolvedValueOnce({});

    const req = makeReq({ params: { educationId: "edu-2" } });
    const res = makeRes();

    await rejectAlumniVerification(req, res, next);

    expect(prisma.education.update).toHaveBeenCalledWith({
      where: { id: "edu-2" },
      data: { isAlumni: false },
    });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-2",
        title: "Alumni Verification Not Approved",
      })
    );
    expect(res.json.mock.calls[0][0].data.rejected).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getTpoCompanyClaims
// ---------------------------------------------------------------------------

describe("getTpoCompanyClaims", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns company claims linked to the TPO's college drives", async () => {
    (prisma.placementDrive.findMany as any).mockResolvedValueOnce([
      { companyId: "company-1" },
      { companyId: "company-2" },
    ]);

    (prisma.companyRequest.findMany as any).mockResolvedValueOnce([
      { id: "claim-1", companyName: "Stripe", status: "PENDING", requestType: "COMPANY_CLAIM" },
    ]);

    const req = makeReq();
    const res = makeRes();

    await getTpoCompanyClaims(req, res, next);

    const claims = res.json.mock.calls[0][0].data;
    expect(claims).toHaveLength(1);
    expect(claims[0].companyName).toBe("Stripe");

    // Verify we queried with the correct companyIds
    const requestCall = (prisma.companyRequest.findMany as any).mock.calls[0][0];
    expect(requestCall.where.companyId.in).toEqual(["company-1", "company-2"]);
  });
});

/**
 * @file recruiter-claim.controller.test.ts
 *
 * Vitest unit tests for the Recruiter Claim Workspace controller.
 * Covers: ownership guard, claim status, job list, status update,
 * application list, and application status update.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// MOCKS
// ---------------------------------------------------------------------------

vi.mock("shared/database/prisma", () => ({
  default: {
    companyAdmin: { findMany: vi.fn() },
    companyRequest: { findMany: vi.fn() },
    job: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    jobApplication: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
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

// AppError mock — make statusCode accessible in tests
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
import {
  getMyClaimStatus,
  getMyPostedJobsClaimView,
  updateClaimJobStatus,
  getClaimJobApplications,
  updateClaimApplicationStatus,
} from "./recruiter-claim.controller";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeReq(override: object = {}): any {
  return {
    user: { id: "recruiter-1" },
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
// getMyClaimStatus
// ---------------------------------------------------------------------------

describe("getMyClaimStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all CompanyRequest rows for the authenticated recruiter", async () => {
    (prisma.companyRequest.findMany as any).mockResolvedValueOnce([
      { id: "claim-1", companyName: "Stripe", status: "PENDING", requestType: "COMPANY_CLAIM" },
      { id: "claim-2", companyName: "Airbnb", status: "APPROVED", requestType: "COMPANY_CLAIM" },
    ]);

    const req = makeReq();
    const res = makeRes();

    await getMyClaimStatus(req, res, next);

    const data = res.json.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0].status).toBe("PENDING");
    expect(data[1].status).toBe("APPROVED");

    expect(prisma.companyRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requestedById: "recruiter-1" } })
    );
  });

  it("returns empty array when recruiter has no claim requests", async () => {
    (prisma.companyRequest.findMany as any).mockResolvedValueOnce([]);

    const req = makeReq();
    const res = makeRes();

    await getMyClaimStatus(req, res, next);

    expect(res.json.mock.calls[0][0].data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMyPostedJobsClaimView
// ---------------------------------------------------------------------------

describe("getMyPostedJobsClaimView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns jobs for companies the recruiter admins", async () => {
    (prisma.companyAdmin.findMany as any).mockResolvedValueOnce([
      { companyId: "company-1" },
    ]);
    (prisma.job.findMany as any).mockResolvedValueOnce([
      { id: "job-1", title: "SWE", status: "OPEN", companyId: "company-1" },
    ]);

    const req = makeReq();
    const res = makeRes();

    await getMyPostedJobsClaimView(req, res, next);

    const data = res.json.mock.calls[0][0].data;
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("SWE");
  });

  it("returns empty array when recruiter is not admin of any company", async () => {
    (prisma.companyAdmin.findMany as any).mockResolvedValueOnce([]);

    const req = makeReq();
    const res = makeRes();

    await getMyPostedJobsClaimView(req, res, next);

    const data = res.json.mock.calls[0][0].data;
    expect(data).toEqual([]);
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateClaimJobStatus — ownership guard
// ---------------------------------------------------------------------------

describe("updateClaimJobStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when the job does not exist", async () => {
    (prisma.job.findFirst as any).mockResolvedValueOnce(null);

    const req = makeReq({ params: { jobId: "non-existent" }, body: { status: "CLOSED" } });
    const res = makeRes();

    await updateClaimJobStatus(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  it("returns 403 when the recruiter is not admin of the job's company", async () => {
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      companyId: "other-company",
      company: { name: "Other Corp" },
    });
    (prisma.companyAdmin.findMany as any).mockResolvedValueOnce([]); // no admin rights

    const req = makeReq({ params: { jobId: "job-1" }, body: { status: "CLOSED" } });
    const res = makeRes();

    await updateClaimJobStatus(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  it("updates job to CLOSED and sets archivedAt when recruiter owns the job", async () => {
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      companyId: "company-1",
      company: { name: "Stripe" },
    });
    (prisma.companyAdmin.findMany as any).mockResolvedValueOnce([
      { companyId: "company-1" },
    ]);
    (prisma.job.update as any).mockResolvedValueOnce({
      id: "job-1",
      title: "SWE",
      status: "CLOSED",
      archivedAt: new Date(),
    });

    const req = makeReq({ params: { jobId: "job-1" }, body: { status: "CLOSED" } });
    const res = makeRes();

    await updateClaimJobStatus(req, res, next);

    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({ status: "CLOSED", archivedAt: expect.any(Date) }),
      select: expect.any(Object),
    });
    const data = res.json.mock.calls[0][0].data;
    expect(data.status).toBe("CLOSED");
  });

  it("clears archivedAt when job is re-opened to OPEN status", async () => {
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      companyId: "company-1",
      company: { name: "Stripe" },
    });
    (prisma.companyAdmin.findMany as any).mockResolvedValueOnce([
      { companyId: "company-1" },
    ]);
    (prisma.job.update as any).mockResolvedValueOnce({
      id: "job-1",
      title: "SWE",
      status: "OPEN",
      archivedAt: null,
    });

    const req = makeReq({ params: { jobId: "job-1" }, body: { status: "OPEN" } });
    const res = makeRes();

    await updateClaimJobStatus(req, res, next);

    const updateCall = (prisma.job.update as any).mock.calls[0][0];
    expect(updateCall.data.archivedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getClaimJobApplications
// ---------------------------------------------------------------------------

describe("getClaimJobApplications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated applications for an owned job", async () => {
    // Ownership check
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      companyId: "company-1",
      company: { name: "Stripe" },
    });
    (prisma.companyAdmin.findMany as any).mockResolvedValueOnce([{ companyId: "company-1" }]);

    // Application queries
    (prisma.jobApplication.count as any).mockResolvedValueOnce(5);
    (prisma.jobApplication.findMany as any).mockResolvedValueOnce([
      { id: "app-1", status: "APPLIED" },
      { id: "app-2", status: "SHORTLISTED" },
    ]);

    const req = makeReq({ params: { jobId: "job-1" }, query: { page: "1", limit: "20" } });
    const res = makeRes();

    await getClaimJobApplications(req, res, next);

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.applications).toHaveLength(2);
    expect(payload.pagination.total).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// updateClaimApplicationStatus
// ---------------------------------------------------------------------------

describe("updateClaimApplicationStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates application to SHORTLISTED and sets shortlistedAt", async () => {
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      companyId: "company-1",
      company: { name: "Stripe" },
    });
    (prisma.companyAdmin.findMany as any).mockResolvedValueOnce([{ companyId: "company-1" }]);
    (prisma.jobApplication.findFirst as any).mockResolvedValueOnce({
      id: "app-1",
      applicantId: "user-1",
    });
    (prisma.jobApplication.update as any).mockResolvedValueOnce({
      id: "app-1",
      status: "SHORTLISTED",
      shortlistedAt: new Date(),
      interviewScheduledAt: null,
      hiredAt: null,
      rejectedAt: null,
    });

    const req = makeReq({
      params: { jobId: "job-1", appId: "app-1" },
      body: { status: "SHORTLISTED" },
    });
    const res = makeRes();

    await updateClaimApplicationStatus(req, res, next);

    const updateCall = (prisma.jobApplication.update as any).mock.calls[0][0];
    expect(updateCall.data.status).toBe("SHORTLISTED");
    expect(updateCall.data.shortlistedAt).toBeInstanceOf(Date);
    expect(updateCall.data.hiredAt).toBeNull();
  });

  it("returns 404 when the application does not belong to the job", async () => {
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      companyId: "company-1",
      company: { name: "Stripe" },
    });
    (prisma.companyAdmin.findMany as any).mockResolvedValueOnce([{ companyId: "company-1" }]);
    (prisma.jobApplication.findFirst as any).mockResolvedValueOnce(null);

    const req = makeReq({
      params: { jobId: "job-1", appId: "wrong-app" },
      body: { status: "HIRED" },
    });
    const res = makeRes();

    await updateClaimApplicationStatus(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(prisma.jobApplication.update).not.toHaveBeenCalled();
  });

  it("rejects invalid status values via Zod validation", async () => {
    const req = makeReq({
      params: { jobId: "job-1", appId: "app-1" },
      body: { status: "INVALID_STATUS" },
    });
    const res = makeRes();

    await updateClaimApplicationStatus(req, res, next);

    // Zod parse error propagates to next() via asyncHandler
    expect(next).toHaveBeenCalled();
    expect(prisma.jobApplication.update).not.toHaveBeenCalled();
  });
});

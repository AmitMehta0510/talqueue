/**
 * @file job-lifecycle.cron.test.ts
 *
 * Vitest unit tests for job-lifecycle cron executors:
 *  - runDeadlineCloser()  — deadline-based CLOSED transitions
 *  - runAtsArchiver()     — ATS board re-scan ARCHIVED transitions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// MOCKS
// ---------------------------------------------------------------------------

vi.mock("shared/database/prisma", () => ({
  default: {
    job: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
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
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      printf: vi.fn(),
    },
    transports: { Console: vi.fn() },
  },
}));

vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

vi.mock("axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { jobs: [] } }),
    post: vi.fn().mockResolvedValue({ data: { jobs: [] } }),
  },
}));

import prisma from "shared/database/prisma";
import axios from "axios";
import cron from "node-cron";
import { runDeadlineCloser, runAtsArchiver, startJobLifecycleCron } from "./job-lifecycle.cron";

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

function makeMockJob(overrides: Partial<{
  id: string;
  externalJobId: string;
  atsSource: string;
  companyId: string;
  company: { atsToken: string; atsSource: string; name: string };
}> = {}) {
  return {
    id: "job-1",
    externalJobId: "ext-123",
    atsSource: "greenhouse",
    companyId: "company-1",
    company: { atsToken: "stripe", atsSource: "greenhouse", name: "Stripe" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DEADLINE CLOSER TESTS
// ---------------------------------------------------------------------------

describe("runDeadlineCloser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default prisma mock implementations after clearAllMocks()
    (prisma.job.updateMany as any).mockResolvedValue({ count: 0 });
  });

  it("marks expired-deadline OPEN jobs as CLOSED and returns correct count", async () => {
    (prisma.job.updateMany as any).mockResolvedValueOnce({ count: 5 });

    const result = await runDeadlineCloser();

    expect(prisma.job.updateMany).toHaveBeenCalledWith({
      where: {
        status: "OPEN",
        applicationDeadline: { lt: expect.any(Date) },
      },
      data: {
        status: "CLOSED",
        archivedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ closed: 5 });
  });

  it("returns { closed: 0 } when no jobs have expired deadlines", async () => {
    (prisma.job.updateMany as any).mockResolvedValueOnce({ count: 0 });

    const result = await runDeadlineCloser();
    expect(result).toEqual({ closed: 0 });
  });

  it("returns { closed: 0 } and does not throw when DB throws an error", async () => {
    (prisma.job.updateMany as any).mockRejectedValueOnce(new Error("DB connection lost"));

    const result = await runDeadlineCloser();
    expect(result).toEqual({ closed: 0 });
  });

  it("uses the current timestamp (lt: now) for the deadline comparison", async () => {
    (prisma.job.updateMany as any).mockResolvedValueOnce({ count: 2 });

    const beforeCall = new Date();
    await runDeadlineCloser();
    const afterCall = new Date();

    const callArgs = (prisma.job.updateMany as any).mock.calls[0][0];
    const usedDate: Date = callArgs.where.applicationDeadline.lt;

    expect(usedDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 100);
    expect(usedDate.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 100);
  });
});

// ---------------------------------------------------------------------------
// ATS ARCHIVER TESTS
// ---------------------------------------------------------------------------

describe("runAtsArchiver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default axios mocks (clearAllMocks wipes mock implementations)
    (axios.get as any).mockResolvedValue({ data: { jobs: [] } });
    (axios.post as any).mockResolvedValue({ data: { jobs: [] } });
    // Default prisma mocks
    (prisma.job.findMany as any).mockResolvedValue([]);
    (prisma.job.updateMany as any).mockResolvedValue({ count: 0 });
  });

  it("returns { archived: 0, errors: 0 } when there are no OPEN ATS jobs", async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([]);

    const result = await runAtsArchiver();
    expect(result).toEqual({ archived: 0, errors: 0 });
  });

  it("archives jobs that are no longer present on the Greenhouse ATS board", async () => {
    const job1 = makeMockJob({ id: "job-1", externalJobId: "greenhouse-100" });
    const job2 = makeMockJob({ id: "job-2", externalJobId: "greenhouse-200" });

    (prisma.job.findMany as any).mockResolvedValueOnce([job1, job2]);

    // Greenhouse returns only job1 — job2 is gone
    (axios.get as any).mockResolvedValueOnce({
      data: { jobs: [{ id: 100 }] }, // only greenhouse-100 present
    });

    (prisma.job.updateMany as any).mockResolvedValueOnce({ count: 1 });

    const result = await runAtsArchiver();

    expect(prisma.job.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["job-2"] }, status: "OPEN" },
      data: { status: "ARCHIVED", archivedAt: expect.any(Date) },
    });
    expect(result.archived).toBe(1);
    expect(result.errors).toBe(0);
  });

  it("does NOT archive jobs that are still present on the ATS board", async () => {
    const job = makeMockJob({ id: "job-1", externalJobId: "greenhouse-100" });

    (prisma.job.findMany as any).mockResolvedValueOnce([job]);

    // Greenhouse returns job — still live
    (axios.get as any).mockResolvedValueOnce({
      data: { jobs: [{ id: 100 }] },
    });

    const result = await runAtsArchiver();

    expect(prisma.job.updateMany).not.toHaveBeenCalled();
    expect(result.archived).toBe(0);
    expect(result.errors).toBe(0);
  });

  it("skips companies without atsToken (manually posted jobs)", async () => {
    const job = makeMockJob({
      id: "job-1",
      company: { atsToken: "", atsSource: "greenhouse", name: "Manual Corp" },
    });

    (prisma.job.findMany as any).mockResolvedValueOnce([job]);

    const result = await runAtsArchiver();

    expect(axios.get).not.toHaveBeenCalled();
    expect(result.archived).toBe(0);
    expect(result.errors).toBe(0);
  });

  it("increments errors and continues when ATS HTTP call fails for a company", async () => {
    const job1 = makeMockJob({ id: "job-1", companyId: "company-1", externalJobId: "greenhouse-1" });
    const job2 = makeMockJob({
      id: "job-2",
      companyId: "company-2",
      externalJobId: "lever-2",
      company: { atsToken: "lever-co", atsSource: "lever", name: "Lever Co" },
    });

    (prisma.job.findMany as any).mockResolvedValueOnce([job1, job2]);

    // Greenhouse fails for company-1
    (axios.get as any).mockRejectedValueOnce(new Error("timeout"));
    // Lever succeeds for company-2 (job still present)
    (axios.get as any).mockResolvedValueOnce({ data: [{ id: "2" }] });

    const result = await runAtsArchiver();

    expect(result.errors).toBe(1);
    expect(result.archived).toBe(0);
  });

  it("archives ALL jobs when the ATS board returns an empty job list", async () => {
    const job1 = makeMockJob({ id: "job-1", externalJobId: "greenhouse-100" });
    const job2 = makeMockJob({ id: "job-2", externalJobId: "greenhouse-200" });

    (prisma.job.findMany as any).mockResolvedValueOnce([job1, job2]);

    // Greenhouse returns empty list
    (axios.get as any).mockResolvedValueOnce({ data: { jobs: [] } });

    (prisma.job.updateMany as any).mockResolvedValueOnce({ count: 2 });

    const result = await runAtsArchiver();

    expect(result.archived).toBe(2);
  });

  it("handles Lever ATS source correctly using array response format", async () => {
    const job = makeMockJob({
      id: "job-1",
      externalJobId: "lever-posting-abc",
      atsSource: "lever",
      company: { atsToken: "shopify", atsSource: "lever", name: "Shopify" },
    });

    (prisma.job.findMany as any).mockResolvedValueOnce([job]);

    // Lever returns the posting — still live
    (axios.get as any).mockResolvedValueOnce({
      data: [{ id: "posting-abc" }],
    });

    const result = await runAtsArchiver();

    expect(result.archived).toBe(0);
    expect(prisma.job.updateMany).not.toHaveBeenCalled();
  });

  it("does not throw at top level when prisma.job.findMany throws", async () => {
    (prisma.job.findMany as any).mockRejectedValueOnce(new Error("DB is down"));

    const result = await runAtsArchiver();
    expect(result).toEqual({ archived: 0, errors: 0 });
  });
});

// ---------------------------------------------------------------------------
// CRON SCHEDULER
// ---------------------------------------------------------------------------

describe("startJobLifecycleCron", () => {
  it("registers exactly 2 cron schedules — one at 02:00 and one at 06:00 UTC", () => {
    startJobLifecycleCron();

    expect(cron.schedule).toHaveBeenCalledTimes(2);

    const expressions = (cron.schedule as any).mock.calls.map(
      (call: any[]) => call[0]
    );
    expect(expressions).toContain("0 2 * * *");
    expect(expressions).toContain("0 6 * * *");

    // Both use UTC timezone
    const options = (cron.schedule as any).mock.calls.map((call: any[]) => call[2]);
    options.forEach((opt: any) => expect(opt.timezone).toBe("UTC"));
  });
});

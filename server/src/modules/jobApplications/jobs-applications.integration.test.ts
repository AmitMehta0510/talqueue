/**
 * @file jobs-applications.integration.test.ts
 * @description Phase 3 — Integration Tests: Jobs + JobApplications combined workflow.
 *
 * Strategy (Integration vs Unit):
 *   - jobApplications.service  ← REAL source code, no mocking
 *   - prisma client             ← MOCKED (deterministic, no DB connection)
 *   - redis client              ← MOCKED (deterministic, no Redis connection)
 *
 * Business Journeys Covered:
 *   Suite 1 — Live Job Application Pipeline & Counter Safety
 *     1a. applyToJob success: array-form $transaction creates application +
 *         increments applicationsCount, returns full application object
 *     1b. Closed-job state gate: job.status === "CLOSED" → AppError 400 ("Job is not open")
 *     1c. Archived-job state gate: job.status === "ARCHIVED" → AppError 400 ("Job is not open")
 *     1d. Duplicate guard: P2002 constraint collision → AppError 400 ("Already applied")
 *     1e. Self-apply guard: recruiter cannot apply to own posting
 *
 *   Suite 2 — State Machine Auto-Close Loop Constraints
 *     2a. updateApplicationStatus HIRED path: callback-form $transaction updates application
 *         status, calls $queryRaw for row-level lock, decrements openings on job row
 *     2b. Zero-openings cascade: when $queryRaw returns openings=1 → after HIRED,
 *         nextOpenings=0 → job.update receives status: "CLOSED" override
 *     2c. No-openings-remaining guard: $queryRaw returns openings=0 → AppError 400
 *         ("No openings remaining for this job")
 *     2d. Non-HIRED status update: takes simple prisma.jobApplication.update path (no tx)
 *
 *   Suite 3 — Recruiter Multi-Tenant Context Access Controls
 *     3a. Unauthorized recruiter (outsider) → getApplicationForRecruiter returns null
 *         → AppError 404 ("Application not found or unauthorized") blocks status update
 *     3b. Job-level access guard for getJobForRecruiter: postedById mismatch → 404
 *
 * Architecture constraints:
 *   - vi.restoreAllMocks() + vi.clearAllMocks() enforced in every beforeEach
 *   - No new npm packages installed
 *   - All fixture types are explicit — zero implicit `any` in assertion paths
 *   - setImmediate-queued side effects NOT awaited (covered by module-level stubs)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// Infrastructure mocks — declared BEFORE any service import
// ---------------------------------------------------------------------------

vi.mock("shared/database/redis", () => ({
  default: {
    exists: vi.fn().mockResolvedValue(0),
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    setex: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    scan: vi.fn().mockResolvedValue(["0", []]),
    pipeline: vi.fn().mockReturnValue({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// Full prisma mock — covers every table touched by jobApplications.service
vi.mock("shared/database/prisma", () => ({
  default: {
    job: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    jobApplication: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    experience: {
      findFirst: vi.fn(),
    },
    companyAdmin: {
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Stub heavy side-effect services — NOT under test
// ---------------------------------------------------------------------------

vi.mock("modules/notifications/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-stub-1" }),
  createNotificationsBulk: vi.fn().mockResolvedValue([]),
}));

vi.mock("modules/reputation/reputation.service", () => ({
  addReputation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("modules/activities/activity.service", () => ({
  createActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("modules/affinity/affinity.service", () => ({
  calculateUserAffinity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("modules/interaction/interaction-tracking.service", () => ({
  trackInteraction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("modules/reputation/engineering-score.service", () => ({
  calculateEngineeringScore: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Import real service implementation AFTER all vi.mock declarations
// ---------------------------------------------------------------------------

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import {
  applyToJob,
  updateApplicationStatus,
  getJobApplications,
} from "./jobApplications.service";

// ---------------------------------------------------------------------------
// Stable fixture IDs
// ---------------------------------------------------------------------------

const STUDENT_ID    = "user-student-aaa";
const RECRUITER_ID  = "user-recruiter-bbb";
const OUTSIDER_ID   = "user-outsider-ccc";
const JOB_ID        = "job-fixture-001";
const APP_ID        = "app-fixture-001";
const COMPANY_ID    = "company-fixture-001";

// ---------------------------------------------------------------------------
// Typed fixture factories
// ---------------------------------------------------------------------------

interface JobStub {
  id: string;
  title: string;
  status: string;
  companyId: string;
  postedById: string;
  company: { id: string; name: string };
}

const makeJobStub = (overrides: Partial<JobStub> = {}): JobStub => ({
  id: JOB_ID,
  title: "Senior Backend Engineer",
  status: "OPEN",
  companyId: COMPANY_ID,
  postedById: RECRUITER_ID,
  company: { id: COMPANY_ID, name: "Acme Corp" },
  ...overrides,
});

interface ApplicationStub {
  id: string;
  jobId: string;
  applicantId: string;
  status: string;
  job: { id: string; title: string; postedById: string };
  applicant: { id: string; username: string; profile: { fullName: string } | null };
}

const makeApplicationStub = (overrides: Partial<ApplicationStub> = {}): ApplicationStub => ({
  id: APP_ID,
  jobId: JOB_ID,
  applicantId: STUDENT_ID,
  status: "APPLIED",
  job: { id: JOB_ID, title: "Senior Backend Engineer", postedById: RECRUITER_ID },
  applicant: {
    id: STUDENT_ID,
    username: "student_aaa",
    profile: { fullName: "Alice Student" },
  },
  ...overrides,
});

/** The full application object returned from prisma.jobApplication.create (inside tx) */
const makeCreatedApplicationStub = () => ({
  id: APP_ID,
  jobId: JOB_ID,
  applicantId: STUDENT_ID,
  status: "APPLIED",
  resumeUrl: "https://cdn.example.com/resume.pdf",
  coverLetter: null,
  githubUrl: null,
  portfolioUrl: null,
  linkedinUrl: null,
  createdAt: new Date("2026-06-21T00:00:00Z"),
  applicant: {
    id: STUDENT_ID,
    username: "student_aaa",
    profile: { fullName: "Alice Student", avatarUrl: null },
  },
  job: {
    id: JOB_ID,
    title: "Senior Backend Engineer",
    company: { id: COMPANY_ID, name: "Acme Corp" },
  },
});

// ---------------------------------------------------------------------------
// Suite 1 — Live Job Application Pipeline & Counter Safety
// ---------------------------------------------------------------------------

describe("Integration: Jobs + JobApplications — Application Pipeline (Suite 1)", () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1a. Success path — array-form $transaction fires, counter incremented
  // ─────────────────────────────────────────────────────────────────────────
  it("applyToJob() success: array-form $transaction creates application and increments applicationsCount", async () => {
    const jobStub = makeJobStub();
    const createdApp = makeCreatedApplicationStub();

    (prisma.job.findUnique as Mock).mockResolvedValue(jobStub);
    // No current company membership
    (prisma.experience.findFirst as Mock).mockResolvedValue(null);
    (prisma.companyAdmin.findFirst as Mock).mockResolvedValue(null);
    // Array-form transaction returns tuple [createdApplication, updatedJob]
    (prisma.$transaction as Mock).mockResolvedValue([createdApp, { id: JOB_ID, applicationsCount: 1 }]);

    const result = await applyToJob(STUDENT_ID, JOB_ID, {
      resumeUrl: "https://cdn.example.com/resume.pdf",
    });

    // Verify $transaction was called (array form — not a callback)
    expect(prisma.$transaction).toHaveBeenCalled();

    // Result is the created application (first tuple element)
    expect(result.id).toBe(APP_ID);
    expect(result.applicantId).toBe(STUDENT_ID);
    expect(result.jobId).toBe(JOB_ID);
    expect(result.status).toBe("APPLIED");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1b. Closed-job state gate → AppError 400
  // ─────────────────────────────────────────────────────────────────────────
  it("applyToJob() rejects with AppError 400 when job.status is CLOSED", async () => {
    (prisma.job.findUnique as Mock).mockResolvedValue(
      makeJobStub({ status: "CLOSED" }),
    );

    await expect(
      applyToJob(STUDENT_ID, JOB_ID, {}),
    ).rejects.toThrow(AppError);

    await expect(
      applyToJob(STUDENT_ID, JOB_ID, {}),
    ).rejects.toMatchObject({ message: "Job is not open", statusCode: 400 });

    // Transaction must NOT have been called — guard fires before DB write
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1c. Archived-job state gate → AppError 400
  // ─────────────────────────────────────────────────────────────────────────
  it("applyToJob() rejects with AppError 400 when job.status is ARCHIVED", async () => {
    (prisma.job.findUnique as Mock).mockResolvedValue(
      makeJobStub({ status: "ARCHIVED" }),
    );

    await expect(
      applyToJob(STUDENT_ID, JOB_ID, {}),
    ).rejects.toMatchObject({ message: "Job is not open", statusCode: 400 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1d. Duplicate guard — P2002 constraint collision → AppError 400 "Already applied"
  // ─────────────────────────────────────────────────────────────────────────
  it("applyToJob() P2002 collision: $transaction throws P2002 → AppError 400 'Already applied'", async () => {
    (prisma.job.findUnique as Mock).mockResolvedValue(makeJobStub());
    (prisma.experience.findFirst as Mock).mockResolvedValue(null);
    (prisma.companyAdmin.findFirst as Mock).mockResolvedValue(null);

    const p2002Error = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    (prisma.$transaction as Mock).mockRejectedValue(p2002Error);

    await expect(
      applyToJob(STUDENT_ID, JOB_ID, {}),
    ).rejects.toMatchObject({ message: "Already applied", statusCode: 400 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1e. Self-apply guard — recruiter cannot apply to their own job posting
  // ─────────────────────────────────────────────────────────────────────────
  it("applyToJob() self-apply guard: AppError 400 'Cannot apply to own job' when recruiter applies to own posting", async () => {
    // postedById === userId (RECRUITER_ID applies to their own job)
    (prisma.job.findUnique as Mock).mockResolvedValue(
      makeJobStub({ postedById: RECRUITER_ID }),
    );

    await expect(
      applyToJob(RECRUITER_ID, JOB_ID, {}),
    ).rejects.toMatchObject({ message: "Cannot apply to own job", statusCode: 400 });

    // Transaction must NOT be called
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Structural contract: $transaction receives correct prisma.jobApplication.create args
  // ─────────────────────────────────────────────────────────────────────────
  it("applyToJob() passes correct applicantId and jobId into the $transaction array", async () => {
    const jobStub = makeJobStub();
    const createdApp = makeCreatedApplicationStub();

    (prisma.job.findUnique as Mock).mockResolvedValue(jobStub);
    (prisma.experience.findFirst as Mock).mockResolvedValue(null);
    (prisma.companyAdmin.findFirst as Mock).mockResolvedValue(null);
    (prisma.$transaction as Mock).mockResolvedValue([createdApp, {}]);

    await applyToJob(STUDENT_ID, JOB_ID, {
      resumeUrl: "https://cdn.example.com/resume.pdf",
      coverLetter: "I am passionate about backend systems.",
    });

    // The service passes an ARRAY to $transaction (not a callback).
    // We verify $transaction was invoked with an array argument.
    const txArg = (prisma.$transaction as Mock).mock.calls[0][0];
    expect(Array.isArray(txArg)).toBe(true);
    expect(txArg.length).toBe(2); // [jobApplication.create, job.update]
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — State Machine Auto-Close Loop Constraints
// ---------------------------------------------------------------------------

describe("Integration: Jobs + JobApplications — State Machine Auto-Close (Suite 2)", () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2a. HIRED path: callback-form $transaction executes update + queryRaw + job.update
  // ─────────────────────────────────────────────────────────────────────────
  it("updateApplicationStatus() HIRED: callback-form $transaction updates status, calls $queryRaw FOR UPDATE, decrements openings", async () => {
    const appStub = makeApplicationStub({ status: "SHORTLISTED" });

    // getApplicationForRecruiter → prisma.jobApplication.findFirst
    (prisma.jobApplication.findFirst as Mock).mockResolvedValue(appStub);

    const updatedAppStub = { ...appStub, status: "HIRED", hiredAt: new Date() };

    // Build a minimal tx mock satisfying the callback path
    const mockTx = {
      jobApplication: {
        update: vi.fn().mockResolvedValue(updatedAppStub),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ openings: 3 }]),
      job: {
        update: vi.fn().mockResolvedValue({ id: JOB_ID, openings: 2, status: "OPEN" }),
      },
    };

    (prisma.$transaction as Mock).mockImplementation((cb: Function) => cb(mockTx));

    const result = await updateApplicationStatus(RECRUITER_ID, APP_ID, {
      status: "HIRED",
      recruiterNotes: "Excellent candidate.",
    });

    // Application status updated to HIRED
    expect(mockTx.jobApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: APP_ID, status: "SHORTLISTED" },
        data: expect.objectContaining({ status: "HIRED" }),
      }),
    );

    // $queryRaw FOR UPDATE called to lock the job row
    expect(mockTx.$queryRaw).toHaveBeenCalled();

    // Job openings decremented (3 → 2, no auto-close since nextOpenings > 0)
    expect(mockTx.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: JOB_ID },
        data: expect.objectContaining({
          openings: 2,
          status: undefined, // not CLOSED because openings still remain
        }),
      }),
    );

    expect(result.status).toBe("HIRED");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2b. Zero-openings cascade: openings=1 → HIRED → nextOpenings=0 → status: "CLOSED"
  // ─────────────────────────────────────────────────────────────────────────
  it("updateApplicationStatus() HIRED with openings=1: nextOpenings=0 triggers automatic CLOSED status override on job", async () => {
    const appStub = makeApplicationStub({ status: "INTERVIEW" });
    (prisma.jobApplication.findFirst as Mock).mockResolvedValue(appStub);

    const updatedAppStub = { ...appStub, status: "HIRED", hiredAt: new Date() };

    const mockTx = {
      jobApplication: {
        update: vi.fn().mockResolvedValue(updatedAppStub),
      },
      // openings = 1 → after decrement → 0 → CLOSED
      $queryRaw: vi.fn().mockResolvedValue([{ openings: 1 }]),
      job: {
        update: vi.fn().mockResolvedValue({ id: JOB_ID, openings: 0, status: "CLOSED" }),
      },
    };

    (prisma.$transaction as Mock).mockImplementation((cb: Function) => cb(mockTx));

    await updateApplicationStatus(RECRUITER_ID, APP_ID, { status: "HIRED" });

    // The critical assertion: job.update must receive status: "CLOSED"
    expect(mockTx.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: JOB_ID },
        data: expect.objectContaining({
          openings: 0,        // decremented to zero
          status: "CLOSED",   // auto-close triggered
        }),
      }),
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2c. No-openings-remaining guard: $queryRaw returns 0 → AppError 400
  // ─────────────────────────────────────────────────────────────────────────
  it("updateApplicationStatus() HIRED with openings=0: AppError 400 'No openings remaining for this job'", async () => {
    const appStub = makeApplicationStub({ status: "SHORTLISTED" });
    (prisma.jobApplication.findFirst as Mock).mockResolvedValue(appStub);

    const mockTx = {
      jobApplication: {
        update: vi.fn().mockResolvedValue({ ...appStub, status: "HIRED" }),
      },
      // openings already exhausted
      $queryRaw: vi.fn().mockResolvedValue([{ openings: 0 }]),
      job: { update: vi.fn() },
    };

    (prisma.$transaction as Mock).mockImplementation((cb: Function) => cb(mockTx));

    await expect(
      updateApplicationStatus(RECRUITER_ID, APP_ID, { status: "HIRED" }),
    ).rejects.toMatchObject({
      message: "No openings remaining for this job",
      statusCode: 400,
    });

    // job.update should NOT have been called (guard throws before it)
    expect(mockTx.job.update).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2d. Non-HIRED status update: direct prisma.jobApplication.update (no tx)
  // ─────────────────────────────────────────────────────────────────────────
  it("updateApplicationStatus() SHORTLISTED: uses direct prisma.jobApplication.update (no $transaction involved)", async () => {
    const appStub = makeApplicationStub({ status: "APPLIED" });
    (prisma.jobApplication.findFirst as Mock).mockResolvedValue(appStub);

    const updatedStub = {
      ...appStub,
      status: "SHORTLISTED",
      shortlistedAt: new Date(),
    };
    (prisma.jobApplication.update as Mock).mockResolvedValue(updatedStub);

    const result = await updateApplicationStatus(RECRUITER_ID, APP_ID, {
      status: "SHORTLISTED",
      recruiterNotes: "Strong technical profile.",
    });

    // Direct update (not inside a transaction)
    expect(prisma.jobApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: APP_ID, status: "APPLIED" },
        data: expect.objectContaining({
          status: "SHORTLISTED",
          recruiterNotes: "Strong technical profile.",
        }),
      }),
    );

    // No callback-form $transaction invoked
    expect(prisma.$transaction).not.toHaveBeenCalled();

    expect(result.status).toBe("SHORTLISTED");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Terminal-state guard: HIRED → any → AppError 400 "Applicant already hired"
  // ─────────────────────────────────────────────────────────────────────────
  it("updateApplicationStatus() terminal-state guard: HIRED application cannot be updated further", async () => {
    const appStub = makeApplicationStub({ status: "HIRED" });
    (prisma.jobApplication.findFirst as Mock).mockResolvedValue(appStub);

    await expect(
      updateApplicationStatus(RECRUITER_ID, APP_ID, { status: "REJECTED" }),
    ).rejects.toMatchObject({ message: "Applicant already hired", statusCode: 400 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Terminal-state guard: REJECTED → any → AppError 400
  // ─────────────────────────────────────────────────────────────────────────
  it("updateApplicationStatus() terminal-state guard: REJECTED application cannot be updated further", async () => {
    const appStub = makeApplicationStub({ status: "REJECTED" });
    (prisma.jobApplication.findFirst as Mock).mockResolvedValue(appStub);

    await expect(
      updateApplicationStatus(RECRUITER_ID, APP_ID, { status: "SHORTLISTED" }),
    ).rejects.toMatchObject({
      message: "Rejected applications cannot be updated",
      statusCode: 400,
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Recruiter Multi-Tenant Context Access Controls
// ---------------------------------------------------------------------------

describe("Integration: Jobs + JobApplications — Recruiter Tenant Access Controls (Suite 3)", () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3a. Unauthorized recruiter (outsider) → 404 on status update
  // ─────────────────────────────────────────────────────────────────────────
  it("updateApplicationStatus() unauthorized outsider: AppError 404 'Application not found or unauthorized'", async () => {
    // Outsider does not own the job — getApplicationForRecruiter returns null
    (prisma.jobApplication.findFirst as Mock).mockResolvedValue(null);

    await expect(
      updateApplicationStatus(OUTSIDER_ID, APP_ID, { status: "SHORTLISTED" }),
    ).rejects.toMatchObject({
      message: "Application not found or unauthorized",
      statusCode: 404,
    });

    // No application update or transaction should proceed
    expect(prisma.jobApplication.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3b. Job-level tenant guard for getJobApplications: non-owner recruiter → 404
  // ─────────────────────────────────────────────────────────────────────────
  it("getJobApplications() unauthorized outsider: getJobForRecruiter returns null → AppError 404", async () => {
    // Outsider's recruiter ID does not match postedById on the job
    (prisma.job.findFirst as Mock).mockResolvedValue(null);

    await expect(
      getJobApplications(OUTSIDER_ID, JOB_ID),
    ).rejects.toMatchObject({
      message: "Job not found or unauthorized",
      statusCode: 404,
    });

    // No application query should be issued
    expect(prisma.jobApplication.update).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3c. Legitimate recruiter can access their own job's applications list
  // ─────────────────────────────────────────────────────────────────────────
  it("getJobApplications() legitimate recruiter: returns application list when postedById matches", async () => {
    const jobStub = { id: JOB_ID, title: "Senior Backend Engineer" };
    // getJobForRecruiter succeeds
    (prisma.job.findFirst as Mock).mockResolvedValue(jobStub);

    const appList = [makeApplicationStub(), makeApplicationStub({ id: "app-002" })];
    (prisma.jobApplication.findMany as Mock).mockResolvedValue(appList);

    const result = await getJobApplications(RECRUITER_ID, JOB_ID);

    // Verify ownership check was made with correct recruiter ID
    expect(prisma.job.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: JOB_ID,
          postedById: RECRUITER_ID,
          deletedAt: null,
        }),
      }),
    );

    expect(result).toHaveLength(2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3d. Company-member guard: current employee cannot apply to own company's job
  // ─────────────────────────────────────────────────────────────────────────
  it("applyToJob() company-member guard: AppError 400 when applicant is a current employee of the posting company", async () => {
    (prisma.job.findUnique as Mock).mockResolvedValue(makeJobStub());
    // Applicant has an active experience record at the job's company
    (prisma.experience.findFirst as Mock).mockResolvedValue({ id: "exp-111" });
    (prisma.companyAdmin.findFirst as Mock).mockResolvedValue(null);

    await expect(
      applyToJob(STUDENT_ID, JOB_ID, {}),
    ).rejects.toMatchObject({
      message: "Cannot apply to jobs at your current company",
      statusCode: 400,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3e. Company-admin guard: company admin cannot apply to own company's job
  // ─────────────────────────────────────────────────────────────────────────
  it("applyToJob() company-admin guard: AppError 400 when applicant is a company admin of the posting company", async () => {
    (prisma.job.findUnique as Mock).mockResolvedValue(makeJobStub());
    (prisma.experience.findFirst as Mock).mockResolvedValue(null);
    // Applicant is a company admin
    (prisma.companyAdmin.findFirst as Mock).mockResolvedValue({ id: "admin-222" });

    await expect(
      applyToJob(STUDENT_ID, JOB_ID, {}),
    ).rejects.toMatchObject({
      message: "Cannot apply to jobs at your current company",
      statusCode: 400,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

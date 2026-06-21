/**
 * @file jobApplications.service.test.ts
 * @module JobApplications
 *
 * Enterprise-grade test suite for the Job Applications module
 * (service layer + Zod validation schema).
 *
 * Architecture notes
 * ──────────────────
 *  • `prisma` is the real import but model methods are replaced with typed
 *    vi.fn() stubs on a per-test basis — the established project pattern.
 *
 *  • `applyToJob` uses the ARRAY form of `prisma.$transaction([...])`.
 *    The stub is assigned as `(prisma.$transaction as any) = vi.fn()...`
 *    returning a tuple `[createdApplication, updatedJob]`.
 *
 *  • `updateApplicationStatus` with HIRED uses the CALLBACK form of
 *    `prisma.$transaction(async tx => ...)`. We provide a minimal mockTx
 *    that satisfies the tx.jobApplication.update + tx.$queryRaw + tx.job.update
 *    call sequence.
 *
 *  • Side-effect services (notifications, affinity, activity, interaction
 *    tracking, reputation, engineering-score) are mocked at module level —
 *    tests never touch real network I/O or Redis.
 *
 *  • `setImmediate` callbacks are NOT awaited in unit tests; they fire
 *    post-return and are covered by module-level vi.mock stubs.
 *
 *  • vi.restoreAllMocks() in every beforeEach prevents spy bleed-through.
 *
 * Coverage map
 * ────────────
 *  Suite 1 │ Application Creation & Safeguards
 *          │  1a — applyToJob success (transaction creates + increments counter)
 *          │  1b — Duplicate guard (P2002 → AppError 400 "Already applied")
 *          │  1c — Closed/Archived job boundary (status !== OPEN → AppError 400)
 *          │  1d — Self-apply guard (poster cannot apply to own job)
 *          │  1e — Company-member guard (current employee cannot apply)
 *          │  1f — Job not found (404)
 *
 *  Suite 2 │ Recruitment State Machine
 *          │  2a — Valid transition APPLIED → SHORTLISTED (direct update path)
 *          │  2b — Valid transition SHORTLISTED → HIRED (tx callback path,
 *          │        decrements openings counter)
 *          │  2c — Terminal-state guard: HIRED → any (AppError 400)
 *          │  2d — Terminal-state guard: REJECTED → any (AppError 400)
 *          │  2e — Role access guard: non-owner gets 404 (unauthorized recruiter)
 *
 *  Suite 3 │ Application Viewed Flow
 *          │  3a — markApplicationViewed: APPLIED → VIEWED soft-transition
 *          │  3b — markApplicationViewed: already-reviewed guard (AppError 400)
 *          │  3c — markApplicationViewed: unauthorized recruiter gets 404
 *
 *  Suite 4 │ Zod Validation Layer
 *          │  4a — applyToJobSchema: accepts full valid payload
 *          │  4b — applyToJobSchema: accepts empty object (all fields optional)
 *          │  4c — updateApplicationStatusSchema: accepts all valid enum values
 *          │  4d — updateApplicationStatusSchema: rejects invalid status string
 *          │  4e — updateApplicationStatusSchema: rejects missing status field
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

// ── Services under test ───────────────────────────────────────────────────────
import {
  applyToJob,
  updateApplicationStatus,
  markApplicationViewed,
} from "./jobApplications.service";

// ── Validation schemas under test ─────────────────────────────────────────────
import {
  applyToJobSchema,
  updateApplicationStatusSchema,
} from "./jobApplications.validation";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mocks — side-effect services (never need real I/O in unit tests)
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("modules/notificatios/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
  createNotificationsBulk: vi.fn().mockResolvedValue([]),
}));

vi.mock("modules/affinity/affinity.service", () => ({
  calculateUserAffinity: vi.fn().mockResolvedValue({}),
}));

vi.mock("modules/activities/activity.service", () => ({
  createActivity: vi.fn().mockResolvedValue({}),
}));

vi.mock("modules/interaction/interaction-tracking.service", () => ({
  trackInteraction: vi.fn().mockResolvedValue({}),
}));

vi.mock("modules/reputation/reputation.service", () => ({
  addReputation: vi.fn().mockResolvedValue({}),
}));

vi.mock("modules/reputation/engineering-score.service", () => ({
  calculateEngineeringScore: vi.fn().mockResolvedValue({}),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Reusable type-safe fixtures & factories
// ─────────────────────────────────────────────────────────────────────────────

// ── Stable IDs ───────────────────────────────────────────────────────────────
const STUDENT_ID   = "user-student-aaa";
const RECRUITER_ID = "user-recruiter-bbb";
const JOB_ID       = "job-fixture-001";
const COMPANY_ID   = "company-fixture-001";
const APP_ID       = "app-fixture-001";

// ── Minimal Job shape ─────────────────────────────────────────────────────────
interface JobStub {
  id: string;
  title: string;
  status: string;
  companyId: string;
  postedById: string;
  company: { id: string; name: string };
  openings?: number | null;
}

const makeJob = (overrides: Partial<JobStub> = {}): JobStub => ({
  id: JOB_ID,
  title: "Senior Backend Engineer",
  status: "OPEN",
  companyId: COMPANY_ID,
  postedById: RECRUITER_ID,
  company: { id: COMPANY_ID, name: "Acme Corp" },
  openings: 2,
  ...overrides,
});

// ── Minimal JobApplication shape ───────────────────────────────────────────────
interface ApplicationStub {
  id: string;
  jobId: string;
  applicantId: string;
  status: string;
  resumeUrl: string | null;
  coverLetter: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  recruiterNotes: string | null;
  hiredAt: Date | null;
  rejectedAt: Date | null;
  shortlistedAt: Date | null;
  interviewScheduledAt: Date | null;
  createdAt: Date;
  applicant: {
    id: string;
    username: string;
    profile: { fullName: string } | null;
  };
  job: {
    id: string;
    title: string;
    postedById: string;
  };
}

const makeApplication = (overrides: Partial<ApplicationStub> = {}): ApplicationStub => ({
  id: APP_ID,
  jobId: JOB_ID,
  applicantId: STUDENT_ID,
  status: "APPLIED",
  resumeUrl: "https://mock-s3.local/resumes/student-resume.pdf",
  coverLetter: "I am a great fit for this role.",
  githubUrl: null,
  portfolioUrl: null,
  linkedinUrl: null,
  recruiterNotes: null,
  hiredAt: null,
  rejectedAt: null,
  shortlistedAt: null,
  interviewScheduledAt: null,
  createdAt: new Date("2025-01-15T10:00:00Z"),
  applicant: {
    id: STUDENT_ID,
    username: "studentaaa",
    profile: { fullName: "Alice Student" },
  },
  job: {
    id: JOB_ID,
    title: "Senior Backend Engineer",
    postedById: RECRUITER_ID,
  },
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — Application Creation & Safeguards
// ─────────────────────────────────────────────────────────────────────────────
describe("JobApplications Service — Suite 1: Application Creation & Safeguards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ── Test 1a: applyToJob — Success Path ────────────────────────────────────
  //
  // When a valid student with a resume S3 link applies to an OPEN job:
  //  1. prisma.job.findUnique → returns the job
  //  2. prisma.experience.findFirst  → null (not a current employee)
  //  3. prisma.companyAdmin.findFirst → null (not a company admin)
  //  4. prisma.$transaction([create, update]) → resolves with created application
  //  5. The service returns the created application object
  test(
    "applyToJob — successfully creates application via transaction and returns " +
      "the created record with APPLIED status when student applies to an open job",
    async () => {
      const createdApp = makeApplication({
        id: "app-new-001",
        status: "APPLIED",
        resumeUrl: "https://mock-s3.local/resumes/alice-resume.pdf",
      });

      // Stub: job lookup
      (prisma.job.findUnique as any) = vi.fn().mockResolvedValue(makeJob());

      // Stub: no current employment, no company admin
      (prisma.experience.findFirst as any) = vi.fn().mockResolvedValue(null);
      (prisma.companyAdmin.findFirst as any) = vi.fn().mockResolvedValue(null);

      // Stub: array-form $transaction returns [createdApplication, updatedJob]
      const txSpy = vi.fn().mockResolvedValue([createdApp, { ...makeJob(), applicationsCount: 1 }]);
      (prisma.$transaction as any) = txSpy;

      const result = await applyToJob(STUDENT_ID, JOB_ID, {
        resumeUrl: "https://mock-s3.local/resumes/alice-resume.pdf",
        coverLetter: "I am a great fit for this role.",
      });

      // Returned the created application
      expect(result.id).toBe("app-new-001");
      expect(result.applicantId).toBe(STUDENT_ID);
      expect(result.jobId).toBe(JOB_ID);
      expect(result.status).toBe("APPLIED");

      // Transaction was invoked (array form)
      expect(txSpy).toHaveBeenCalledOnce();
      const txArg = txSpy.mock.calls[0][0];
      expect(Array.isArray(txArg)).toBe(true);
      expect(txArg).toHaveLength(2); // [create, update]
    },
  );

  // ── Test 1b: applyToJob — Duplicate Guard (P2002 Constraint) ──────────────
  //
  // If a student tries to apply to the same job twice, Prisma throws a unique
  // constraint error (code "P2002"). The service must catch this and convert
  // it to AppError("Already applied", 400) — NOT a raw Prisma error.
  //
  // Business rule: 400 (not 409) per the actual service implementation.
  test(
    "applyToJob — catches Prisma P2002 unique constraint violation and throws " +
      "AppError(400, 'Already applied') instead of leaking raw DB error",
    async () => {
      (prisma.job.findUnique as any) = vi.fn().mockResolvedValue(makeJob());
      (prisma.experience.findFirst as any) = vi.fn().mockResolvedValue(null);
      (prisma.companyAdmin.findFirst as any) = vi.fn().mockResolvedValue(null);

      // Simulate Prisma unique constraint violation (P2002)
      const prismaUniqueError = Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: { target: ["jobId", "applicantId"] },
      });
      (prisma.$transaction as any) = vi.fn().mockRejectedValue(prismaUniqueError);

      await expect(
        applyToJob(STUDENT_ID, JOB_ID, {
          resumeUrl: "https://mock-s3.local/resumes/alice-resume.pdf",
        }),
      ).rejects.toMatchObject({
        message: "Already applied",
        statusCode: 400,
      });
    },
  );

  // ── Test 1c: applyToJob — Closed Job Boundary ─────────────────────────────
  //
  // If the job's status is anything other than "OPEN" (e.g. "CLOSED",
  // "ARCHIVED", "PAUSED"), the service must throw AppError("Job is not open", 400)
  // before reaching the transaction. The DB transaction must never be called.
  test(
    "applyToJob — throws AppError(400, 'Job is not open') immediately when " +
      "job status is CLOSED, preventing any transaction from being issued",
    async () => {
      (prisma.job.findUnique as any) = vi
        .fn()
        .mockResolvedValue(makeJob({ status: "CLOSED" }));

      (prisma.experience.findFirst as any) = vi.fn().mockResolvedValue(null);
      (prisma.companyAdmin.findFirst as any) = vi.fn().mockResolvedValue(null);

      const txSpy = vi.fn();
      (prisma.$transaction as any) = txSpy;

      await expect(
        applyToJob(STUDENT_ID, JOB_ID, {}),
      ).rejects.toMatchObject({
        message: "Job is not open",
        statusCode: 400,
      });

      // No transaction should have been initiated
      expect(txSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 1d: applyToJob — Self-Apply Guard ─────────────────────────────────
  //
  // The recruiter who posted the job must NOT be able to apply to it.
  // Triggered when userId === job.postedById.
  test(
    "applyToJob — throws AppError(400, 'Cannot apply to own job') when " +
      "the recruiter who posted the job tries to apply to it",
    async () => {
      // Job posted by RECRUITER_ID; recruiter tries to apply with their own ID
      (prisma.job.findUnique as any) = vi
        .fn()
        .mockResolvedValue(makeJob({ postedById: RECRUITER_ID }));

      (prisma.experience.findFirst as any) = vi.fn().mockResolvedValue(null);
      (prisma.companyAdmin.findFirst as any) = vi.fn().mockResolvedValue(null);

      const txSpy = vi.fn();
      (prisma.$transaction as any) = txSpy;

      await expect(
        applyToJob(RECRUITER_ID, JOB_ID, {}), // recruiter applying to own job
      ).rejects.toMatchObject({
        message: "Cannot apply to own job",
        statusCode: 400,
      });

      expect(txSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 1e: applyToJob — Company Membership Guard ────────────────────────
  //
  // A current employee of the hiring company must NOT be able to apply.
  // prisma.experience.findFirst returns a non-null record → guard fires.
  test(
    "applyToJob — throws AppError(400, 'Cannot apply to jobs at your current company') " +
      "when the applicant is a current employee of the hiring company",
    async () => {
      (prisma.job.findUnique as any) = vi.fn().mockResolvedValue(makeJob());

      // Simulate the applicant being a current employee
      (prisma.experience.findFirst as any) = vi
        .fn()
        .mockResolvedValue({ id: "exp-fixture-001" });
      (prisma.companyAdmin.findFirst as any) = vi.fn().mockResolvedValue(null);

      const txSpy = vi.fn();
      (prisma.$transaction as any) = txSpy;

      await expect(
        applyToJob(STUDENT_ID, JOB_ID, {}),
      ).rejects.toMatchObject({
        message: "Cannot apply to jobs at your current company",
        statusCode: 400,
      });

      expect(txSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 1f: applyToJob — Job Not Found (404) ─────────────────────────────
  test(
    "applyToJob — throws AppError(404, 'Job not found') when the jobId does not " +
      "resolve to any row in the database",
    async () => {
      (prisma.job.findUnique as any) = vi.fn().mockResolvedValue(null);
      const txSpy = vi.fn();
      (prisma.$transaction as any) = txSpy;

      await expect(
        applyToJob(STUDENT_ID, "ghost-job-id", {}),
      ).rejects.toMatchObject({
        message: "Job not found",
        statusCode: 404,
      });

      expect(txSpy).not.toHaveBeenCalled();
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — Recruitment State Machine (Status Transitions)
// ─────────────────────────────────────────────────────────────────────────────
describe("JobApplications Service — Suite 2: Recruitment State Machine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ── Test 2a: updateApplicationStatus — Valid Direct Update Path ───────────
  //
  // For non-HIRED status transitions (e.g. APPLIED → SHORTLISTED),
  // the service uses a direct prisma.jobApplication.update (NOT a transaction).
  // It must call update with the correct status + recruiterNotes.
  test(
    "updateApplicationStatus — successfully persists SHORTLISTED transition via " +
      "direct Prisma update (non-HIRED path) and returns the updated application",
    async () => {
      const existingApp = makeApplication({ status: "APPLIED" });
      const updatedApp  = makeApplication({ status: "SHORTLISTED", shortlistedAt: new Date() });

      // getApplicationForRecruiter → prisma.jobApplication.findFirst
      (prisma.jobApplication.findFirst as any) = vi
        .fn()
        .mockResolvedValue(existingApp);

      const updateSpy = vi.fn().mockResolvedValue(updatedApp);
      (prisma.jobApplication.update as any) = updateSpy;

      const result = await updateApplicationStatus(RECRUITER_ID, APP_ID, {
        status: "SHORTLISTED",
        recruiterNotes: "Strong profile, shortlisting for technical round.",
      });

      expect(result.status).toBe("SHORTLISTED");

      // Direct update was called (NOT $transaction)
      expect(updateSpy).toHaveBeenCalledOnce();
      const updateArgs = updateSpy.mock.calls[0][0];
      expect(updateArgs.where.id).toBe(APP_ID);
      expect(updateArgs.data.status).toBe("SHORTLISTED");
      expect(updateArgs.data.recruiterNotes).toBe(
        "Strong profile, shortlisting for technical round.",
      );

      // shortlistedAt timestamp must be set
      expect(updateArgs.data).toHaveProperty("shortlistedAt");
      expect(updateArgs.data.shortlistedAt).toBeInstanceOf(Date);
    },
  );

  // ── Test 2b: updateApplicationStatus — HIRED path (transaction + openings) ─
  //
  // When transitioning to HIRED, the service uses prisma.$transaction(callback form):
  //   1. tx.jobApplication.update → updates status to HIRED + hiredAt
  //   2. tx.$queryRaw → reads current openings count (FOR UPDATE lock)
  //   3. tx.job.update → decrements openings; closes job if openings reach 0
  //
  // We supply a mockTx that satisfies this exact call sequence.
  test(
    "updateApplicationStatus — HIRED transition runs inside a Prisma transaction " +
      "that decrements job openings counter and closes job when openings reach zero",
    async () => {
      const existingApp = makeApplication({ status: "INTERVIEW" });
      const hiredApp    = makeApplication({ status: "HIRED", hiredAt: new Date() });

      // getApplicationForRecruiter
      (prisma.jobApplication.findFirst as any) = vi
        .fn()
        .mockResolvedValue(existingApp);

      // Build minimal mockTx for HIRED path
      const txAppUpdate  = vi.fn().mockResolvedValue(hiredApp);
      const txQueryRaw   = vi.fn().mockResolvedValue([{ openings: 1 }]); // 1 opening left
      const txJobUpdate  = vi.fn().mockResolvedValue({ ...makeJob(), openings: 0, status: "CLOSED" });

      const mockTx = {
        jobApplication: { update: txAppUpdate },
        $queryRaw: txQueryRaw,
        job: { update: txJobUpdate },
      };

      const txSpy = vi.fn().mockImplementation(
        async (callback: (tx: any) => Promise<any>) => callback(mockTx),
      );
      (prisma.$transaction as any) = txSpy;

      const result = await updateApplicationStatus(RECRUITER_ID, APP_ID, {
        status: "HIRED",
        recruiterNotes: "Excellent candidate — hire approved.",
      });

      // Returned the hired application
      expect(result.status).toBe("HIRED");

      // Transaction was used (callback form)
      expect(txSpy).toHaveBeenCalledOnce();

      // Application status was updated to HIRED inside tx
      const appUpdateArgs = txAppUpdate.mock.calls[0][0];
      expect(appUpdateArgs.data.status).toBe("HIRED");
      expect(appUpdateArgs.data).toHaveProperty("hiredAt");

      // openings query was executed
      expect(txQueryRaw).toHaveBeenCalledOnce();

      // Job openings decremented (1 → 0), status → CLOSED
      const jobUpdateArgs = txJobUpdate.mock.calls[0][0];
      expect(jobUpdateArgs.data.openings).toBe(0);
      expect(jobUpdateArgs.data.status).toBe("CLOSED");
    },
  );

  // ── Test 2c: Terminal-State Guard — HIRED → any transition blocked ─────────
  //
  // If application.status is already "HIRED", any further update must throw
  // AppError("Applicant already hired", 400) before reaching Prisma.
  test(
    "updateApplicationStatus — throws AppError(400, 'Applicant already hired') " +
      "when attempting to update an application that is already in HIRED state",
    async () => {
      const alreadyHiredApp = makeApplication({ status: "HIRED", hiredAt: new Date() });

      (prisma.jobApplication.findFirst as any) = vi
        .fn()
        .mockResolvedValue(alreadyHiredApp);

      const updateSpy = vi.fn();
      (prisma.jobApplication.update as any) = updateSpy;
      const txSpy = vi.fn();
      (prisma.$transaction as any) = txSpy;

      await expect(
        updateApplicationStatus(RECRUITER_ID, APP_ID, { status: "REJECTED" }),
      ).rejects.toMatchObject({
        message: "Applicant already hired",
        statusCode: 400,
      });

      // Neither direct update nor transaction should be issued
      expect(updateSpy).not.toHaveBeenCalled();
      expect(txSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 2d: Terminal-State Guard — REJECTED → any transition blocked ──────
  //
  // If application.status is "REJECTED", any further update must throw
  // AppError("Rejected applications cannot be updated", 400).
  test(
    "updateApplicationStatus — throws AppError(400, 'Rejected applications cannot be updated') " +
      "when attempting to re-process an application that is already REJECTED",
    async () => {
      const rejectedApp = makeApplication({
        status: "REJECTED",
        rejectedAt: new Date("2025-01-10T09:00:00Z"),
      });

      (prisma.jobApplication.findFirst as any) = vi
        .fn()
        .mockResolvedValue(rejectedApp);

      const updateSpy = vi.fn();
      (prisma.jobApplication.update as any) = updateSpy;

      await expect(
        updateApplicationStatus(RECRUITER_ID, APP_ID, { status: "SHORTLISTED" }),
      ).rejects.toMatchObject({
        message: "Rejected applications cannot be updated",
        statusCode: 400,
      });

      expect(updateSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 2e: Role Access Guard — Non-owner gets 404 ───────────────────────
  //
  // getApplicationForRecruiter queries with `job.postedById === recruiterId`.
  // If the requesting user did NOT post the job, Prisma returns null and the
  // helper throws AppError("Application not found or unauthorized", 404).
  // This is the authorization boundary for status update operations.
  test(
    "updateApplicationStatus — throws AppError(404, 'Application not found or unauthorized') " +
      "when the requesting user is not the job poster (role access guard)",
    async () => {
      // Prisma returns null → application not found for this recruiter
      (prisma.jobApplication.findFirst as any) = vi.fn().mockResolvedValue(null);

      const updateSpy = vi.fn();
      (prisma.jobApplication.update as any) = updateSpy;

      const RANDOM_USER_ID = "user-random-zzz";

      await expect(
        updateApplicationStatus(RANDOM_USER_ID, APP_ID, { status: "SHORTLISTED" }),
      ).rejects.toMatchObject({
        message: "Application not found or unauthorized",
        statusCode: 404,
      });

      expect(updateSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 2f: HIRED — No Openings Remaining (transaction guard) ────────────
  //
  // Inside the HIRED transaction, if the job has openings: 0 (or null),
  // the service must throw AppError("No openings remaining for this job", 400)
  // inside the transaction callback, rolling back the entire tx.
  test(
    "updateApplicationStatus — HIRED path throws AppError(400, 'No openings remaining') " +
      "inside the transaction when job openings counter has already reached zero",
    async () => {
      const existingApp = makeApplication({ status: "SHORTLISTED" });

      (prisma.jobApplication.findFirst as any) = vi
        .fn()
        .mockResolvedValue(existingApp);

      const txAppUpdate = vi.fn().mockResolvedValue({ ...existingApp, status: "HIRED" });
      const txQueryRaw  = vi.fn().mockResolvedValue([{ openings: 0 }]); // no openings left

      const mockTx = {
        jobApplication: { update: txAppUpdate },
        $queryRaw: txQueryRaw,
        job: { update: vi.fn() },
      };

      (prisma.$transaction as any) = vi.fn().mockImplementation(
        async (callback: (tx: any) => Promise<any>) => callback(mockTx),
      );

      await expect(
        updateApplicationStatus(RECRUITER_ID, APP_ID, { status: "HIRED" }),
      ).rejects.toMatchObject({
        message: "No openings remaining for this job",
        statusCode: 400,
      });
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Application Viewed Flow (markApplicationViewed)
// ─────────────────────────────────────────────────────────────────────────────
describe("JobApplications Service — Suite 3: Application Viewed Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ── Test 3a: markApplicationViewed — APPLIED → VIEWED transition ──────────
  //
  // The service must:
  //  1. Verify the recruiter owns this application (getApplicationForRecruiter)
  //  2. Assert application.status === "APPLIED" — only fresh applications can be viewed
  //  3. Update status to "VIEWED" via prisma.jobApplication.update
  //  4. Return the updated application record
  test(
    "markApplicationViewed — successfully transitions status from APPLIED to VIEWED " +
      "and returns the updated record when recruiter is authorized",
    async () => {
      const appliedApp = makeApplication({ status: "APPLIED" });
      const viewedApp  = makeApplication({ status: "VIEWED" });

      // getApplicationForRecruiter
      (prisma.jobApplication.findFirst as any) = vi
        .fn()
        .mockResolvedValue(appliedApp);

      const updateSpy = vi.fn().mockResolvedValue(viewedApp);
      (prisma.jobApplication.update as any) = updateSpy;

      const result = await markApplicationViewed(RECRUITER_ID, APP_ID);

      expect(result.status).toBe("VIEWED");

      // Update was called with the correct payload
      expect(updateSpy).toHaveBeenCalledOnce();
      const updateArgs = updateSpy.mock.calls[0][0];
      expect(updateArgs.where.id).toBe(APP_ID);
      expect(updateArgs.data.status).toBe("VIEWED");
    },
  );

  // ── Test 3b: markApplicationViewed — Already-Reviewed Guard ──────────────
  //
  // If the application status is NOT "APPLIED" (e.g. already VIEWED,
  // SHORTLISTED, INTERVIEW etc.), the service must throw
  // AppError("Application already reviewed", 400) without touching the DB.
  test(
    "markApplicationViewed — throws AppError(400, 'Application already reviewed') " +
      "when the application has already been progressed past the APPLIED state",
    async () => {
      const alreadyViewedApp = makeApplication({ status: "SHORTLISTED" });

      (prisma.jobApplication.findFirst as any) = vi
        .fn()
        .mockResolvedValue(alreadyViewedApp);

      const updateSpy = vi.fn();
      (prisma.jobApplication.update as any) = updateSpy;

      await expect(
        markApplicationViewed(RECRUITER_ID, APP_ID),
      ).rejects.toMatchObject({
        message: "Application already reviewed",
        statusCode: 400,
      });

      expect(updateSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 3c: markApplicationViewed — Unauthorized Recruiter (404) ─────────
  //
  // If the recruiter does not own the job associated with this application,
  // getApplicationForRecruiter returns null and throws AppError(404).
  test(
    "markApplicationViewed — throws AppError(404, 'Application not found or unauthorized') " +
      "when the requesting recruiter does not own the job (unauthorized access guard)",
    async () => {
      // Prisma finds no application for this recruiter + applicationId combo
      (prisma.jobApplication.findFirst as any) = vi.fn().mockResolvedValue(null);

      const updateSpy = vi.fn();
      (prisma.jobApplication.update as any) = updateSpy;

      const INTRUDER_RECRUITER = "user-intruder-recruiter";

      await expect(
        markApplicationViewed(INTRUDER_RECRUITER, APP_ID),
      ).rejects.toMatchObject({
        message: "Application not found or unauthorized",
        statusCode: 404,
      });

      expect(updateSpy).not.toHaveBeenCalled();
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — Zod Validation Layer
// ─────────────────────────────────────────────────────────────────────────────
describe("JobApplications — Suite 4: Zod Validation Schema Layer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Test 4a: applyToJobSchema — accepts full valid payload ─────────────────
  test(
    "applyToJobSchema — accepts a fully populated valid payload with all optional " +
      "fields present (resume, cover letter, github, portfolio, linkedin)",
    () => {
      const result = applyToJobSchema.safeParse({
        resumeUrl: "https://mock-s3.local/resumes/student-resume.pdf",
        coverLetter: "I am passionate about building distributed systems.",
        githubUrl: "https://github.com/studentaaa",
        portfolioUrl: "https://portfolio.studentaaa.dev",
        linkedinUrl: "https://linkedin.com/in/studentaaa",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resumeUrl).toBe(
          "https://mock-s3.local/resumes/student-resume.pdf",
        );
        expect(result.data.coverLetter).toBe(
          "I am passionate about building distributed systems.",
        );
      }
    },
  );

  // ── Test 4b: applyToJobSchema — accepts empty object (all fields optional) ─
  //
  // The schema has no required fields — a bare {} must parse successfully.
  // This confirms the service can be called without a resume (resume is optional).
  test(
    "applyToJobSchema — accepts an empty object because all fields are optional " +
      "(minimum application without resume or cover letter)",
    () => {
      const result = applyToJobSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resumeUrl).toBeUndefined();
        expect(result.data.coverLetter).toBeUndefined();
      }
    },
  );

  // ── Test 4c: updateApplicationStatusSchema — accepts all valid enum values ─
  test.each([
    ["SHORTLISTED"],
    ["INTERVIEW"],
    ["REJECTED"],
    ["HIRED"],
  ] as const)(
    "updateApplicationStatusSchema — accepts status '%s' as a valid enum value",
    (status) => {
      const result = updateApplicationStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    },
  );

  // ── Test 4d: updateApplicationStatusSchema — rejects invalid status string ─
  //
  // Status values outside the enum (e.g. "PENDING", "APPROVED", "VIEWED",
  // or an arbitrary string) must be rejected by Zod with an invalid_enum_value
  // error. This prevents corrupted automation inputs from reaching the service.
  test(
    "updateApplicationStatusSchema — rejects invalid status value 'PENDING' that " +
      "is not in the allowed enum (invalid status string / corrupt automation input guard)",
    () => {
      const result = updateApplicationStatusSchema.safeParse({
        status: "PENDING",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const statusIssue = result.error.issues.find((i) =>
          i.path.includes("status"),
        );
        expect(statusIssue).toBeDefined();
        // Zod v4 uses "invalid_value" for enum violations (was "invalid_enum_value" in v3)
        expect(["invalid_enum_value", "invalid_value"]).toContain(statusIssue?.code);
      }
    },
  );

  // ── Test 4e: updateApplicationStatusSchema — rejects missing status field ──
  //
  // status is a required field in updateApplicationStatusSchema.
  // An empty object {} must fail Zod parsing with an `invalid_type` or
  // `required_at` error on the `status` path.
  test(
    "updateApplicationStatusSchema — rejects payload with missing required 'status' field",
    () => {
      const result = updateApplicationStatusSchema.safeParse({
        recruiterNotes: "Looks good",
        // status: missing intentionally
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const statusIssue = result.error.issues.find((i) =>
          i.path.includes("status"),
        );
        expect(statusIssue).toBeDefined();
      }
    },
  );

  // ── Test 4f: updateApplicationStatusSchema — recruiterNotes is optional ────
  //
  // A payload with only the required status field (no recruiterNotes) must
  // parse successfully, since recruiterNotes is optional.
  test(
    "updateApplicationStatusSchema — successfully parses payload with only 'status' " +
      "when optional 'recruiterNotes' field is omitted",
    () => {
      const result = updateApplicationStatusSchema.safeParse({
        status: "INTERVIEW",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("INTERVIEW");
        expect(result.data.recruiterNotes).toBeUndefined();
      }
    },
  );
});

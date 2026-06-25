/**
 * @file recruiter-claim.controller.ts
 * @module Modules/Recruiter
 *
 * Backend controller for the Recruiter Claim Workspace.
 *
 * Provides typed handlers for:
 *  GET  /recruiter/claim/status                        — claim request status
 *  GET  /recruiter/claim/jobs                          — jobs posted under claimed company
 *  PATCH /recruiter/claim/jobs/:jobId/status           — update job status (OPEN/CLOSED/ARCHIVED)
 *  GET  /recruiter/claim/jobs/:jobId/applications      — applications for a job
 *  PATCH /recruiter/claim/jobs/:jobId/applications/:appId/status — shortlist/update applicant
 *
 * Ownership enforcement:
 *  Every write handler validates that the job's companyId matches a company
 *  the authenticated user is a CompanyAdmin for. Read handlers use the same
 *  check. Returns 403 on ownership mismatch.
 */

import { Response } from "express";
import { z } from "zod";
import winston from "winston";

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import { JobStatus, JobApplicationStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [RecruiterClaim] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// VALIDATION SCHEMAS
// ---------------------------------------------------------------------------

const updateJobStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"] as const),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum([
    "APPLIED",
    "VIEWED",
    "SHORTLISTED",
    "INTERVIEW",
    "REJECTED",
    "HIRED",
  ] as const),
  recruiterNotes: z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Returns the set of companyIds that the authenticated user has CompanyAdmin rights to.
 */
async function getAdminCompanyIds(userId: string): Promise<Set<string>> {
  const adminRows = await prisma.companyAdmin.findMany({
    where: { userId },
    select: { companyId: true },
  });
  return new Set(adminRows.map((r) => r.companyId));
}

/**
 * Asserts that the given jobId belongs to a company that the authenticated user admins.
 * Returns the companyId on success. Throws 404/403 on failure.
 */
async function assertJobOwnership(
  jobId: string,
  userId: string
): Promise<{ companyId: string; companyName: string }> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, deletedAt: null },
    select: { companyId: true, company: { select: { name: true } } },
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  const adminCompanyIds = await getAdminCompanyIds(userId);
  if (!adminCompanyIds.has(job.companyId)) {
    throw new AppError(
      "Access denied: you are not an admin of the company that posted this job.",
      403
    );
  }

  return { companyId: job.companyId, companyName: job.company.name };
}

// ---------------------------------------------------------------------------
// HANDLER: GET /recruiter/claim/status
// ---------------------------------------------------------------------------

/**
 * Returns all CompanyRequest rows submitted by the authenticated user
 * (both COMPANY_CLAIM and RECRUITER_ONBOARDING types), with current statuses.
 */
export const getMyClaimStatus = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.user.id as string;

    const claims = await prisma.companyRequest.findMany({
      where: { requestedById: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyName: true,
        requestType: true,
        status: true,
        businessEmail: true,
        reviewNotes: true,
        createdAt: true,
        updatedAt: true,
        reviewedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            verificationStatus: true,
          },
        },
      },
    });

    logger.info(`getMyClaimStatus: user=${userId}, found ${claims.length} request(s)`);

    return res.json(
      successResponse(claims, "Claim status retrieved")
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: GET /recruiter/claim/jobs
// ---------------------------------------------------------------------------

/**
 * Returns all non-deleted jobs posted by companies the authenticated user admins.
 * Groups by status and includes application counts.
 */
export const getMyPostedJobsClaimView = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.user.id as string;

    const adminCompanyIds = await getAdminCompanyIds(userId);
    if (adminCompanyIds.size === 0) {
      return res.json(
        successResponse([], "No jobs found — you are not an admin of any company")
      );
    }

    const jobs = await prisma.job.findMany({
      where: {
        companyId: { in: Array.from(adminCompanyIds) },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        type: true,
        workMode: true,
        location: true,
        applicationDeadline: true,
        applicationsCount: true,
        views: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        company: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    logger.info(
      `getMyPostedJobsClaimView: user=${userId}, companies=${Array.from(adminCompanyIds).join(",")}, jobs=${jobs.length}`
    );

    return res.json(
      successResponse(jobs, "Recruiter claim jobs")
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: PATCH /recruiter/claim/jobs/:jobId/status
// ---------------------------------------------------------------------------

/**
 * Updates the status of a job posted by the authenticated recruiter.
 * Valid transitions: OPEN ↔ CLOSED, CLOSED → ARCHIVED.
 * Ownership-guarded — returns 403 if the recruiter doesn't admin the job's company.
 */
export const updateClaimJobStatus = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.user.id as string;
    const { jobId } = req.params as { jobId: string };

    const { status } = updateJobStatusSchema.parse(req.body);

    // Ownership check
    const { companyName } = await assertJobOwnership(jobId, userId);

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: status as JobStatus,
        ...(status === "ARCHIVED" || status === "CLOSED"
          ? { archivedAt: new Date() }
          : { archivedAt: null }),
      },
      select: { id: true, title: true, status: true, archivedAt: true },
    });

    logger.info(
      `updateClaimJobStatus: user=${userId}, job=${jobId} (${companyName}) → ${status}`
    );

    return res.json(
      successResponse(updated, `Job status updated to ${status}`)
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: GET /recruiter/claim/jobs/:jobId/applications
// ---------------------------------------------------------------------------

/**
 * Returns the application list for a specific job.
 * Ownership-guarded — returns 403 if the recruiter doesn't admin the job's company.
 *
 * Query params:
 *  - status  (optional filter: APPLIED | VIEWED | SHORTLISTED | INTERVIEW | REJECTED | HIRED)
 *  - page    (default 1)
 *  - limit   (default 20, max 50)
 */
export const getClaimJobApplications = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.user.id as string;
    const { jobId } = req.params as { jobId: string };

    const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? "20", 10)));
    const skip = (page - 1) * limit;
    const statusFilter = (req.query.status as string) || undefined;

    // Ownership check
    await assertJobOwnership(jobId, userId);

    const where: Record<string, any> = {
      jobId,
      ...(statusFilter && { status: statusFilter }),
    };

    const [total, applications] = await Promise.all([
      prisma.jobApplication.count({ where }),
      prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          resumeUrl: true,
          coverLetter: true,
          recruiterNotes: true,
          shortlistedAt: true,
          interviewScheduledAt: true,
          hiredAt: true,
          rejectedAt: true,
          createdAt: true,
          applicant: {
            select: {
              id: true,
              username: true,
              reputationScore: true,
              engineeringScore: true,
              trustLevel: true,
              verifiedEngineer: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                  headline: true,
                  location: true,
                  resumeUrl: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  portfolioUrl: true,
                },
              },
              skills: {
                take: 10,
                select: { skill: { select: { name: true } }, level: true },
              },
            },
          },
        },
      }),
    ]);

    return res.json(
      successResponse(
        {
          applications,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
        "Job applications"
      )
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: PATCH /recruiter/claim/jobs/:jobId/applications/:appId/status
// ---------------------------------------------------------------------------

/**
 * Updates the status of a job application (shortlist, interview, hire, reject).
 * Ownership-guarded via the parent jobId.
 * Sets the appropriate timestamp field (shortlistedAt, interviewScheduledAt, etc.)
 */
export const updateClaimApplicationStatus = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.user.id as string;
    const { jobId, appId } = req.params as { jobId: string; appId: string };

    const { status, recruiterNotes } = updateApplicationStatusSchema.parse(req.body);

    // Ownership check
    await assertJobOwnership(jobId, userId);

    // Verify the application belongs to this job
    const existing = await prisma.jobApplication.findFirst({
      where: { id: appId, jobId },
      select: { id: true, applicantId: true },
    });

    if (!existing) {
      throw new AppError("Application not found for this job.", 404);
    }

    const now = new Date();
    const timestampUpdates: Record<string, Date | null> = {
      shortlistedAt: null,
      interviewScheduledAt: null,
      hiredAt: null,
      rejectedAt: null,
    };

    if (status === "SHORTLISTED") timestampUpdates.shortlistedAt = now;
    else if (status === "INTERVIEW") timestampUpdates.interviewScheduledAt = now;
    else if (status === "HIRED") timestampUpdates.hiredAt = now;
    else if (status === "REJECTED") timestampUpdates.rejectedAt = now;

    const updated = await prisma.jobApplication.update({
      where: { id: appId },
      data: {
        status: status as JobApplicationStatus,
        ...(recruiterNotes !== undefined && { recruiterNotes }),
        ...timestampUpdates,
      },
      select: {
        id: true,
        status: true,
        recruiterNotes: true,
        shortlistedAt: true,
        interviewScheduledAt: true,
        hiredAt: true,
        rejectedAt: true,
      },
    });

    logger.info(
      `updateClaimApplicationStatus: user=${userId}, job=${jobId}, app=${appId} → ${status}`
    );

    return res.json(
      successResponse(updated, `Application status updated to ${status}`)
    );
  }
);

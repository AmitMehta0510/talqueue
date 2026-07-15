/**
 * @file tpo-dashboard.controller.ts
 * @module Modules/TPO
 *
 * Backend controller for the TPO (Training & Placement Officer) Dashboard.
 *
 * All handlers require:
 *  1. `protect` middleware — authenticated session
 *  2. `requireTpoRole` middleware — caller must be the tpoUserId of at least one College
 *
 * Endpoints:
 *  GET  /tpo/dashboard/stats          — overview stat counts
 *  GET  /tpo/dashboard/students       — paginated, filterable student list
 *  GET  /tpo/dashboard/placements     — active placement drives for the TPO's college
 *  GET  /tpo/dashboard/alumni         — pending alumni verification requests
 *  PATCH /tpo/dashboard/alumni/:educationId/approve — approve alumni claim
 *  PATCH /tpo/dashboard/alumni/:educationId/reject  — reject alumni claim
 *  GET  /tpo/dashboard/company-claims — company claims/recruiter interactions
 *  GET  /tpo/dashboard/recruiters     — recruiters who interacted with the college
 */

import { Response, Request, NextFunction } from "express";
import winston from "winston";

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import { createNotification } from "modules/notifications/notifications.service";
import { NotificationType } from "@prisma/client";

import { parseCsv, bulkUpsertStudentData } from "./tpo-bulk-upload.service";
import { generatePlacementCsv, generatePlacementPdf, validateAcademicYear } from "./tpo-reports.service";
import { getCollegePlacementStats } from "modules/placementDrives/driveAnalytics.service";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [TpoDashboard] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// GUARD MIDDLEWARE — requireTpoRole
// ---------------------------------------------------------------------------

/**
 * Verifies that the authenticated user is the TPO of at least one College
 * (via the CollegeTpo table).
 * Attaches `req.tpoCollegeIds` — the set of college IDs the caller administers as TPO.
 *
 * @throws 403 if the user is not a TPO of any college.
 */
export const requireTpoRole = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    const tpoRecords = await prisma.collegeTpo.findMany({
      where: { userId },
      select: { collegeId: true, college: { select: { id: true, name: true } } },
    });

    if (tpoRecords.length === 0) {
      return next(
        new AppError(
          "Access denied: Training & Placement Officer privileges required.",
          403
        )
      );
    }

    // Attach college IDs for use in subsequent handlers
    req.tpoCollegeIds = tpoRecords.map((r) => r.collegeId);
    req.tpoColleges = tpoRecords.map((r) => r.college);
    next();
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

/** Returns the array of college IDs attached by requireTpoRole middleware. */
function getCollegeIds(req: any): string[] {
  return (req.tpoCollegeIds as string[]) ?? [];
}

// ---------------------------------------------------------------------------
// HANDLER: GET /tpo/dashboard/stats
// ---------------------------------------------------------------------------

/**
 * Returns aggregated overview stats for the TPO's college(s):
 *  - totalStudents       — unique students enrolled in the TPO's colleges
 *  - activeDrives        — placement drives with status UPCOMING or ONGOING
 *  - pendingAlumni       — Education rows where isAlumni=true and alumniVerified=false
 *  - recruiterCount      — distinct companies with at least one CompanyRequest CLAIM for the college's drives
 */
export const getTpoDashboardStats = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);

    const [totalStudents, activeDrives, pendingAlumni] = await Promise.all([
      // Unique students: count profiles linked to the TPO's colleges
      prisma.profile.count({
        where: { collegeId: { in: collegeIds } },
      }),

      // Active drives: UPCOMING or ONGOING
      prisma.placementDrive.count({
        where: {
          targetCollegeId: { in: collegeIds },
          status: { in: ["UPCOMING", "ONGOING"] },
        },
      }),

      // Pending alumni verification requests
      prisma.education.count({
        where: {
          collegeId: { in: collegeIds },
          isAlumni: true,
          alumniVerified: false,
        },
      }),
    ]);

    // Recruiter count: distinct companies that have placement drives with the college
    const drives = await prisma.placementDrive.findMany({
      where: { targetCollegeId: { in: collegeIds } },
      select: { companyId: true },
      distinct: ["companyId"],
    });
    const recruiterCount = drives.filter((d) => d.companyId).length;

    logger.info(
      `TPO stats fetched for colleges=[${collegeIds.join(",")}]: students=${totalStudents}, drives=${activeDrives}, alumni=${pendingAlumni}, recruiters=${recruiterCount}`
    );

    return res.json(
      successResponse(
        {
          totalStudents,
          activeDrives,
          pendingAlumniVerifications: pendingAlumni,
          recruiterCount,
        },
        "TPO dashboard stats"
      )
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: GET /tpo/dashboard/students
// ---------------------------------------------------------------------------

/**
 * Returns a paginated, filterable list of students enrolled in the TPO's college.
 *
 * Query params:
 *  - page            (default 1)
 *  - limit           (default 20, max 50)
 *  - graduationYear  (number filter on Education.endYear)
 *  - departmentId    (UUID filter on Profile.departmentId)
 *  - currentYear     (number filter on Education.currentYear)
 *  - search          (partial match on profile.fullName or user.username)
 */
export const getTpoStudents = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);

    const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? "20", 10)));
    const skip = (page - 1) * limit;

    const graduationYear = req.query.graduationYear
      ? parseInt(req.query.graduationYear as string, 10)
      : undefined;
    const departmentId = (req.query.departmentId as string) || undefined;
    const currentYear = req.query.currentYear
      ? parseInt(req.query.currentYear as string, 10)
      : undefined;
    const search = (req.query.search as string) || undefined;

    // Build education filter
    const educationWhere: Record<string, any> = {
      collegeId: { in: collegeIds },
      ...(graduationYear !== undefined && { endYear: graduationYear }),
      ...(currentYear !== undefined && { currentYear }),
    };

    // Find user IDs from education records that match the college + filters
    const matchingEdus = await prisma.education.findMany({
      where: educationWhere,
      select: { userId: true },
      distinct: ["userId"],
    });

    const userIdsFromEdu = matchingEdus.map((e) => e.userId);

    // Build profile filter with optional search and departmentId
    const profileWhere: Record<string, any> = {
      userId: { in: userIdsFromEdu },
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { user: { username: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [total, profiles] = await Promise.all([
      prisma.profile.count({ where: profileWhere }),
      prisma.profile.findMany({
        where: profileWhere,
        skip,
        take: limit,
        orderBy: { fullName: "asc" },
        select: {
          userId: true,
          fullName: true,
          avatarUrl: true,
          headline: true,
          graduationYear: true,
          department: { select: { id: true, name: true } },
          college: { select: { id: true, name: true } },
          user: {
            select: {
              id: true,
              username: true,
              reputationScore: true,
              openToWork: true,
              openToInternship: true,
              educations: {
                where: { collegeId: { in: collegeIds } },
                select: {
                  endYear: true,
                  currentYear: true,
                  cgpa: true,
                  isAlumni: true,
                  alumniVerified: true,
                },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    return res.json(
      successResponse(
        {
          students: profiles,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
        "TPO students list"
      )
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: GET /tpo/dashboard/placements
// ---------------------------------------------------------------------------

/**
 * Returns all placement drives linked to the TPO's colleges with key stats.
 */
export const getTpoPlacements = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);

    const drives = await prisma.placementDrive.findMany({
      where: { targetCollegeId: { in: collegeIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        driveTitle: true,
        status: true,
        driveType: true,
        driveDate: true,
        minCgpa: true,
        salaryMin: true,
        salaryMax: true,
        college: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
    });

    return res.json(
      successResponse(drives, "TPO placement drives")
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: GET /tpo/dashboard/alumni
// ---------------------------------------------------------------------------

/**
 * Returns all Education rows where isAlumni=true AND alumniVerified=false
 * for the TPO's colleges. Includes student profile info for the verification card.
 */
export const getTpoAlumniVerifications = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);

    const pending = await prisma.education.findMany({
      where: {
        collegeId: { in: collegeIds },
        isAlumni: true,
        alumniVerified: false,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        endYear: true,
        degree: true,
        fieldOfStudy: true,
        createdAt: true,
        college: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { fullName: true, avatarUrl: true, headline: true },
            },
          },
        },
      },
    });

    return res.json(
      successResponse(pending, "Pending alumni verification requests")
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: PATCH /tpo/dashboard/alumni/:educationId/approve
// ---------------------------------------------------------------------------

/**
 * Approves an alumni verification request.
 * Sets alumniVerified=true, alumniVerifiedAt=now on the Education row.
 * Sends a platform notification to the student.
 */
export const approveAlumniVerification = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);
    const { educationId } = req.params as { educationId: string };

    const education = await prisma.education.findFirst({
      where: {
        id: educationId,
        collegeId: { in: collegeIds },
        isAlumni: true,
        alumniVerified: false,
      },
      select: { id: true, userId: true, user: { select: { username: true } } },
    });

    if (!education) {
      throw new AppError("Alumni verification request not found or already processed.", 404);
    }

    await prisma.education.update({
      where: { id: educationId },
      data: { alumniVerified: true, alumniVerifiedAt: new Date() },
    });

    // Notify the student
    await createNotification({
      userId: education.userId,
      type: NotificationType.SYSTEM,
      actorId: req.user.id,
      title: "Alumni Status Verified",
      message: "Your alumni status has been verified by the college TPO.",
      entityType: "education",
      entityId: educationId,
      actionUrl: "/profile",
    }).catch((err: any) => {
      logger.warn(`Failed to notify student ${education.userId}: ${err?.message}`);
    });

    logger.info(
      `Alumni verification approved: educationId=${educationId}, student=${education.userId}`
    );

    return res.json(
      successResponse({ educationId, approved: true }, "Alumni status verified successfully")
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: PATCH /tpo/dashboard/alumni/:educationId/reject
// ---------------------------------------------------------------------------

/**
 * Rejects an alumni verification request.
 * Resets isAlumni=false on the Education row.
 * Sends a platform notification to the student.
 */
export const rejectAlumniVerification = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);
    const { educationId } = req.params as { educationId: string };

    const education = await prisma.education.findFirst({
      where: {
        id: educationId,
        collegeId: { in: collegeIds },
        isAlumni: true,
        alumniVerified: false,
      },
      select: { id: true, userId: true },
    });

    if (!education) {
      throw new AppError("Alumni verification request not found or already processed.", 404);
    }

    await prisma.education.update({
      where: { id: educationId },
      data: { isAlumni: false },
    });

    // Notify the student
    await createNotification({
      userId: education.userId,
      type: NotificationType.SYSTEM,
      actorId: req.user.id,
      title: "Alumni Verification Not Approved",
      message:
        "Your alumni verification request could not be approved. Please contact your college TPO for more information.",
      entityType: "education",
      entityId: educationId,
      actionUrl: "/profile",
    }).catch((err: any) => {
      logger.warn(`Failed to notify student ${education.userId}: ${err?.message}`);
    });

    logger.info(
      `Alumni verification rejected: educationId=${educationId}, student=${education.userId}`
    );

    return res.json(
      successResponse({ educationId, rejected: true }, "Alumni verification rejected")
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: GET /tpo/dashboard/company-claims
// ---------------------------------------------------------------------------

/**
 * Returns company claim requests that are associated with placement drives
 * linked to the TPO's colleges, giving the TPO visibility into recruiter activity.
 *
 * Also returns all CompanyRequests of type COMPANY_CLAIM where the job or company
 * has had placement drives with the TPO's colleges.
 */
export const getTpoCompanyClaims = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);

    // Find companies that have had any placement interaction with the TPO's colleges
    const drives = await prisma.placementDrive.findMany({
      where: { targetCollegeId: { in: collegeIds } },
      select: { companyId: true },
      distinct: ["companyId"],
    });

    const companyIds = drives.map((d) => d.companyId).filter(Boolean) as string[];

    const claims = await prisma.companyRequest.findMany({
      where: {
        requestType: "COMPANY_CLAIM",
        ...(companyIds.length > 0 && { companyId: { in: companyIds } }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        companyName: true,
        requestType: true,
        status: true,
        businessEmail: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, name: true, logoUrl: true, verificationStatus: true } },
        requestedBy: {
          select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } },
        },
      },
    });

    return res.json(
      successResponse(claims, "Company claims for TPO colleges")
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: GET /tpo/dashboard/recruiters
// ---------------------------------------------------------------------------

/**
 * Returns recruiters (CompanyAdmin users) from companies that have had
 * placement drives with the TPO's colleges.
 */
export const getTpoRecruiterInteractions = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);

    const drives = await prisma.placementDrive.findMany({
      where: { targetCollegeId: { in: collegeIds } },
      select: { companyId: true },
      distinct: ["companyId"],
    });

    const companyIds = drives.map((d) => d.companyId).filter(Boolean) as string[];

    if (companyIds.length === 0) {
      return res.json(successResponse([], "No recruiter interactions yet"));
    }

    const admins = await prisma.companyAdmin.findMany({
      where: { companyId: { in: companyIds } },
      select: {
        id: true,
        officeCity: true,
        company: { select: { id: true, name: true, logoUrl: true, industry: true } },
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { fullName: true, avatarUrl: true, headline: true } },
          },
        },
      },
    });

    return res.json(
      successResponse(admins, "Recruiter interactions with TPO colleges")
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: POST /tpo/dashboard/students/bulk-upload
// ---------------------------------------------------------------------------

/**
 * Accepts a CSV body (text/plain or multipart field "csv") containing:
 *   email, rollNumber, cgpa, backlogs, currentYear, branchName
 *
 * Updates Education records with TPO-authoritative data and sets tpoVerified=true.
 * Returns a summary of updated / skipped / not-found rows.
 */
export const bulkUploadStudents = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);

    // Accept CSV as raw text/plain body OR as a "csv" field in JSON
    let csvText: string | undefined;

    if (typeof req.body === "string" && req.body.trim().length > 0) {
      csvText = req.body;
    } else if (req.body?.csv && typeof req.body.csv === "string") {
      csvText = req.body.csv;
    }

    if (!csvText || !csvText.trim()) {
      throw new AppError(
        "Request body must contain CSV data as plain text or in a 'csv' JSON field.",
        400,
      );
    }

    const rows = parseCsv(csvText);
    const result = await bulkUpsertStudentData(req.user.id, collegeIds, rows);

    logger.info(
      `TPO bulk upload: collegeIds=[${collegeIds}], total=${result.total}, updated=${result.updated}, skipped=${result.skipped}, notFound=${result.notFound.length}`,
    );

    return res.json(
      successResponse(result, `Bulk upload complete: ${result.updated} records updated`),
    );
  },
);

// ---------------------------------------------------------------------------
// HANDLER: GET /tpo/dashboard/reports/placement
// ---------------------------------------------------------------------------

/**
 * Generates and streams a placement report for the TPO's college.
 *
 * Query params:
 *  - academicYear (optional) — e.g. 2024 → Aug 2024 – Jul 2025
 *  - format       (optional) — "csv" (default) | "pdf"
 */
export const getPlacementReport = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);
    const collegeId = collegeIds[0]; // primary college

    if (!collegeId) {
      throw new AppError("No college associated with this TPO account.", 403);
    }

    const format = (req.query.format as string | undefined)?.toLowerCase() ?? "csv";
    const academicYear = validateAcademicYear(req.query.academicYear as string | undefined);

    if (format === "pdf") {
      // Get college name for the report header
      const college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: { name: true },
      });
      const { pdf, filename } = await generatePlacementPdf(
        collegeId,
        college?.name ?? "Institution",
        academicYear,
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(pdf);
    }

    // Default: CSV
    const { csv, filename } = await generatePlacementCsv(collegeId, academicYear);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  },
);

// ---------------------------------------------------------------------------
// HANDLER: GET /tpo/dashboard/stats/placements  (public-safe stats subset)
// ---------------------------------------------------------------------------

/**
 * Returns verified placement statistics for the TPO's primary college.
 * Used internally by the TPO dashboard overview — matches the format
 * expected by the public placement stats page.
 */
export const getTpoPlacementStats = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);
    const collegeId = collegeIds[0];

    if (!collegeId) throw new AppError("No college associated with this TPO account.", 403);

    const academicYear = req.query.academicYear
      ? parseInt(req.query.academicYear as string, 10)
      : undefined;

    const stats = await getCollegePlacementStats(collegeId, academicYear);
    return res.json(successResponse(stats, "College placement statistics"));
  },
);

// ---------------------------------------------------------------------------
// HANDLER: GET/POST/DELETE /tpo/dashboard/cdcr
// ---------------------------------------------------------------------------

/**
 * GET /tpo/dashboard/cdcr — list all CDCR members for the TPO's college
 */
export const listCdcrMembers = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);

    const members = await prisma.cdcrMember.findMany({
      where: { collegeId: { in: collegeIds } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { fullName: true, avatarUrl: true, headline: true } },
          },
        },
        college: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json(successResponse(members, "CDCR members"));
  },
);

/**
 * POST /tpo/dashboard/cdcr — add a CDCR member by userId or email
 * Body: { userId?: string, email?: string }
 */
export const addCdcrMember = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);
    const collegeId = collegeIds[0];
    if (!collegeId) throw new AppError("No college associated with this TPO account.", 403);

    const { userId, email } = req.body as { userId?: string; email?: string };

    let targetUserId = userId;

    if (!targetUserId && email) {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });
      if (!user) throw new AppError(`No user found with email: ${email}`, 404);
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new AppError("Provide either userId or email to add a CDCR member.", 400);
    }

    // Prevent duplicates
    const existing = await prisma.cdcrMember.findFirst({
      where: { userId: targetUserId, collegeId },
    });
    if (existing) throw new AppError("This user is already a CDCR member for this college.", 409);

    const member = await prisma.cdcrMember.create({
      data: {
        userId: targetUserId,
        collegeId,
        assignedById: req.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { fullName: true, avatarUrl: true } },
          },
        },
      },
    });

    // Notify the new CDCR member
    setImmediate(() => {
      createNotification({
        userId: targetUserId!,
        actorId: req.user.id,
        type: NotificationType.SYSTEM,
        title: "CDCR Role Assigned",
        message: "You have been assigned as a Career Development Cell Representative (CDCR) for your college. You can now access placement coordination features.",
        actionUrl: "/tpo",
      }).catch(() => {});
    });

    logger.info(`CDCR member added: userId=${targetUserId}, collegeId=${collegeId}`);
    return res.status(201).json(successResponse(member, "CDCR member added successfully"));
  },
);

/**
 * DELETE /tpo/dashboard/cdcr/:memberId — remove a CDCR member
 */
export const removeCdcrMember = asyncHandler(
  async (req: any, res: Response) => {
    const collegeIds = getCollegeIds(req);
    const { memberId } = req.params as { memberId: string };

    const member = await prisma.cdcrMember.findFirst({
      where: { id: memberId, collegeId: { in: collegeIds } },
      select: { id: true, userId: true },
    });

    if (!member) throw new AppError("CDCR member not found or not in your college.", 404);

    await prisma.cdcrMember.delete({ where: { id: memberId } });

    logger.info(`CDCR member removed: memberId=${memberId}`);
    return res.json(successResponse({ memberId }, "CDCR member removed"));
  },
);


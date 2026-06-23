import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse, errorResponse } from "shared/utils/apiResponse";

import {
  assignCollegeAdminSchema,
  assignCompanyAdminSchema,
  updateUserStatusSchema,
  reviewBusinessRequestSchema,
} from "./admin.validation";

import {
  assignCollegeAdmin,
  removeCollegeAdmin,
  listCollegeAdmins,
  assignCompanyAdmin,
  removeCompanyAdmin,
  listCompanyAdmins,
  getAdminStats,
  listUsers,
  getUserDetail,
  updateUserStatus,
  assignPlatformAdmin,
  removePlatformAdmin,
  adminListPosts,
  adminDeletePost,
  adminListHackathons,
  adminUpdateHackathonStatus,
  adminUpdateHackathon,
  adminListProjects,
  adminUpdateProjectStatus,
  adminListJobs,
  adminDeleteJob,
  adminUpdateJob,
  adminCreateJob,
  adminListCommunities,
  adminUpdateCommunity,
  adminListReferrals,
  adminCreateDepartment,
  adminListDepartments,
  adminListCompanyRequests,
  adminApproveCompanyRequest,
  adminRejectCompanyRequest,
  reviewBusinessRequest,
  // College Request B2B
  listCollegeRequests,
  getCollegeRequest,
  reviewCollegeRequest,
} from "./admin.service";

import { runAllScrapers } from "modules/hackathons/scraper/hackathon-scraper.service";
import { runJobScrape } from "modules/companies/scraper/job-scraper.service";
import { runCompanyDiscovery } from "modules/companies/scraper/company-discovery.service";

// Background Scraper Locks
let isScraperRunning = false;
let isJobScraperRunning = false;
let isCompanyDiscoveryRunning = false;

// ============================================================
// COLLEGE ADMIN HANDLERS
// ============================================================

export const assignCollegeAdminHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { collegeId } = req.params as { collegeId: string };
    const { userId } = assignCollegeAdminSchema.parse(req.body);

    const result = await assignCollegeAdmin(req.user!.id, userId, collegeId);

    res.status(201).json(successResponse(result, result.message));
  },
);

export const removeCollegeAdminHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { collegeId, userId } = req.params as { collegeId: string; userId: string };

    const result = await removeCollegeAdmin(userId, collegeId);

    res.json(successResponse(result, result.message));
  },
);

export const listCollegeAdminsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { collegeId } = req.params as { collegeId: string };

    const admins = await listCollegeAdmins(collegeId);

    res.json(successResponse(admins));
  },
);

// ============================================================
// COMPANY ADMIN HANDLERS
// ============================================================

export const assignCompanyAdminHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = req.params as { companyId: string };
    const { userId, officeCity } = assignCompanyAdminSchema.parse(req.body);

    const result = await assignCompanyAdmin(req.user!.id, userId, companyId, officeCity);

    res.status(201).json(successResponse(result, result.message));
  },
);

export const removeCompanyAdminHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId, userId } = req.params as { companyId: string; userId: string };
    const { officeCity } = req.query as { officeCity?: string };

    const result = await removeCompanyAdmin(userId, companyId, officeCity);

    res.json(successResponse(result, result.message));
  },
);

export const listCompanyAdminsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = req.params as { companyId: string };

    const admins = await listCompanyAdmins(companyId);

    res.json(successResponse(admins));
  },
);

// ============================================================
// PLATFORM ADMIN HANDLERS
// ============================================================

export const getAdminStatsHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await getAdminStats();
    res.json(successResponse(stats));
  },
);

export const listUsersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { search, limit, cursor } = req.query as {
      search?: string;
      limit?: string;
      cursor?: string;
    };

    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    // Clamp to a safe ceiling so callers cannot trigger unbounded table scans
    const safeLimit = Math.min(parsedLimit, 100);
    const result = await listUsers(search, safeLimit, cursor);

    res.json(successResponse(result));
  },
);

export const getUserDetailHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    const user = await getUserDetail(userId);
    res.json(successResponse(user));
  },
);

export const updateUserStatusHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    const { status } = updateUserStatusSchema.parse(req.body);

    const result = await updateUserStatus(userId, status, req.user!.id);

    res.json(successResponse(result, `User status updated to ${status}`));
  },
);

export const assignPlatformAdminHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };

    const result = await assignPlatformAdmin(req.user!.id, userId);

    res.status(201).json(successResponse(result, result.message));
  },
);

export const removePlatformAdminHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };

    const result = await removePlatformAdmin(userId, req.user!.id);

    res.json(successResponse(result, result.message));
  },
);

// ============================================================
// CONTENT MODERATION HANDLERS
// ============================================================

export const adminListPostsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { q, limit, cursor } = req.query as { q?: string; limit?: string; cursor?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const result = await adminListPosts({
      q,
      limit: Math.min(parsedLimit, 100),
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminDeletePostHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId } = req.params as { postId: string };
    const result = await adminDeletePost(postId);
    res.json(successResponse(result, result.message));
  },
);

export const adminListHackathonsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { q, limit, cursor } = req.query as { q?: string; limit?: string; cursor?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const result = await adminListHackathons({
      q,
      limit: Math.min(parsedLimit, 100),
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminUpdateHackathonStatusHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { hackathonId } = req.params as { hackathonId: string };
    const { status } = req.body as { status: string };
    const result = await adminUpdateHackathonStatus(hackathonId, status);
    res.json(successResponse(result));
  },
);

export const adminListProjectsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { q, limit, cursor } = req.query as { q?: string; limit?: string; cursor?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const result = await adminListProjects({
      q,
      limit: Math.min(parsedLimit, 100),
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminUpdateProjectStatusHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    const { status } = req.body as { status: string };
    const result = await adminUpdateProjectStatus(projectId, status);
    res.json(successResponse(result));
  },
);

export const adminListJobsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { q, limit, cursor } = req.query as { q?: string; limit?: string; cursor?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const result = await adminListJobs({
      q,
      limit: Math.min(parsedLimit, 100),
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminDeleteJobHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { jobId } = req.params as { jobId: string };
    const result = await adminDeleteJob(jobId);
    res.json(successResponse(result, result.message));
  },
);

export const adminUpdateJobHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { jobId } = req.params as { jobId: string };
    const result = await adminUpdateJob(jobId, req.body);
    res.json(successResponse(result, "Job updated successfully"));
  },
);

export const adminCreateJobHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminCreateJob(req.user!.id, req.body);
    res.status(201).json(successResponse(result, "Job created successfully"));
  },
);

export const adminListCommunitiesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { q, limit, cursor } = req.query as { q?: string; limit?: string; cursor?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const result = await adminListCommunities({
      q,
      limit: Math.min(parsedLimit, 100),
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminUpdateCommunityHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { communityId } = req.params as { communityId: string };
    const { archived, verified } = req.body as { archived?: boolean; verified?: boolean };
    const result = await adminUpdateCommunity(communityId, { archived, verified });
    res.json(successResponse(result));
  },
);

export const adminListReferralsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { q, limit, cursor } = req.query as { q?: string; limit?: string; cursor?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const result = await adminListReferrals({
      q,
      limit: Math.min(parsedLimit, 100),
      cursor,
    });
    res.json(successResponse(result));
  },
);

// ============================================================
// DEPARTMENT MANAGEMENT
// ============================================================

export const adminCreateDepartmentHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { collegeId } = req.params as { collegeId: string };
    const { name, hod } = req.body as { name: string; hod?: string };
    const result = await adminCreateDepartment(req.user!.id, { name, collegeId, hod });
    res.status(201).json(successResponse(result, "Department created successfully"));
  },
);

export const adminListDepartmentsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { collegeId } = req.params as { collegeId: string };
    const { limit } = req.query as { limit?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const departments = await adminListDepartments(collegeId, parsedLimit);
    res.json(successResponse(departments));
  },
);

// ============================================================
// COMPANY REQUEST HANDLERS
// ============================================================

export const adminListCompanyRequestsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, limit } = req.query as { status?: string; limit?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const requests = await adminListCompanyRequests(status, parsedLimit);
    res.json(successResponse(requests));
  },
);

export const adminApproveCompanyRequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params as { requestId: string };
    const options = (req.body as Record<string, unknown>) || {};
    const result = await adminApproveCompanyRequest(req.user!.id, requestId, options);
    res.json(successResponse(result, "Company approved and job posted successfully"));
  },
);

export const adminRejectCompanyRequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params as { requestId: string };
    const { reviewNotes } = (req.body as { reviewNotes?: string }) || {};
    const result = await adminRejectCompanyRequest(req.user!.id, requestId, reviewNotes);
    res.json(successResponse(result, "Company request rejected"));
  },
);

export const adminUpdateHackathonHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { hackathonId } = req.params as { hackathonId: string };
    const result = await adminUpdateHackathon(hackathonId, req.body);
    res.json(successResponse(result, "Hackathon updated successfully"));
  },
);

export const adminTriggerScraperHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    if (isScraperRunning) {
      res.status(409).json(errorResponse("Scraper is already running in the background. Please wait for it to complete."));
      return;
    }
    isScraperRunning = true;
    
    runAllScrapers()
      .then((result) => {
        console.log("[Scraper] Background hackathon scraper completed successfully:", result);
      })
      .catch((err) => {
        console.error("[Scraper] Background hackathon scraper failed:", err);
      })
      .finally(() => {
        isScraperRunning = false;
      });

    res.status(202).json(successResponse({ status: "started" }, "Scraper run started in the background"));
  },
);

export const adminTriggerJobScraperHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    if (isJobScraperRunning) {
      res.status(409).json(errorResponse("Job scraper is already running in the background. Please wait for it to complete."));
      return;
    }
    isJobScraperRunning = true;

    runJobScrape()
      .then((result) => {
        console.log("[Job Scraper] Background job scraper completed successfully:", result);
      })
      .catch((err) => {
        console.error("[Job Scraper] Background job scraper failed:", err);
      })
      .finally(() => {
        isJobScraperRunning = false;
      });

    res.status(202).json(successResponse({ status: "started" }, "Job scraper run started in the background"));
  },
);

export const adminTriggerCompanyDiscoveryHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    if (isCompanyDiscoveryRunning) {
      res.status(409).json(errorResponse("Company discovery is already running in the background. Please wait for it to complete."));
      return;
    }
    isCompanyDiscoveryRunning = true;

    runCompanyDiscovery()
      .then((result) => {
        console.log("[Discovery] Background company discovery completed successfully:", result);
      })
      .catch((err) => {
        console.error("[Discovery] Background company discovery failed:", err);
      })
      .finally(() => {
        isCompanyDiscoveryRunning = false;
      });

    res.status(202).json(successResponse({ status: "started" }, "Company discovery run started in the background"));
  },
);

export const reviewBusinessRequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params as { requestId: string };
    const { action } = reviewBusinessRequestSchema.parse(req.body);

    const result = await reviewBusinessRequest(req.user!.id, requestId, action);

    res.json(successResponse(result, `Request was successfully ${action.toLowerCase()}d.`));
  }
);

// ============================================================
// COLLEGE REQUEST HANDLERS (INSTITUTIONAL B2B ONBOARDING)
// ============================================================

/**
 * GET /admin/college-requests
 * List institutional college onboarding requests, optionally filtered by status.
 */
export const listCollegeRequestsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, limit, cursor } = req.query as {
      status?: string;
      limit?: string;
      cursor?: string;
    };
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const result = await listCollegeRequests({
      status,
      limit: Math.min(parsedLimit, 100),
      cursor,
    });
    res.json(successResponse(result));
  },
);

/**
 * GET /admin/college-requests/:requestId
 * Get a single college onboarding request by ID.
 */
export const getCollegeRequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params as { requestId: string };
    const result = await getCollegeRequest(requestId);
    res.json(successResponse(result));
  },
);

/**
 * POST /admin/college-requests/:requestId/review
 * Body: { action: "APPROVE" | "REJECT" | "DUPLICATE", adminNote?: string }
 *
 * On APPROVE:
 *   - Upsert College catalog record
 *   - Set college.masterAdminUserId to the requesting user
 *   - Insert CollegeAdmin row
 *   - Mark request VERIFIED
 *   - Notify requesting user
 *
 * STRICT: No auto role-grants for TPO/HOD/CDCR are made here.
 */
export const reviewCollegeRequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params as { requestId: string };
    const { action, adminNote } = req.body as {
      action: "APPROVE" | "REJECT" | "DUPLICATE";
      adminNote?: string;
    };

    if (!action || !["APPROVE", "REJECT", "DUPLICATE"].includes(action)) {
      res.status(400).json({ success: false, message: "action must be APPROVE, REJECT, or DUPLICATE" });
      return;
    }

    const result = await reviewCollegeRequest(
      req.user!.id,
      requestId,
      action,
      adminNote,
    );

    res.json(successResponse(result, result.message));
  },
);

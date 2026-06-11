import { Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";

import {
  assignCollegeAdminSchema,
  assignCompanyAdminSchema,
  updateUserStatusSchema,
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
  adminListProjects,
  adminUpdateProjectStatus,
  adminListJobs,
  adminDeleteJob,
  adminListCommunities,
  adminUpdateCommunity,
  adminListReferrals,
  adminCreateDepartment,
  adminListDepartments,
} from "./admin.service";

// ============================================================
// COLLEGE ADMIN HANDLERS
// ============================================================

export const assignCollegeAdminHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId } = req.params;
    const { userId } = assignCollegeAdminSchema.parse(req.body);

    const result = await assignCollegeAdmin(req.user.id, userId, collegeId);

    res.status(201).json(successResponse(result, result.message));
  },
);

export const removeCollegeAdminHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId, userId } = req.params;

    const result = await removeCollegeAdmin(userId, collegeId);

    res.json(successResponse(result, result.message));
  },
);

export const listCollegeAdminsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId } = req.params as { collegeId: string };

    const admins = await listCollegeAdmins(collegeId);

    res.json(successResponse(admins));
  },
);

// ============================================================
// COMPANY ADMIN HANDLERS
// ============================================================

export const assignCompanyAdminHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId } = req.params;
    const { userId, officeCity } = assignCompanyAdminSchema.parse(req.body);

    const result = await assignCompanyAdmin(req.user.id, userId, companyId, officeCity);

    res.status(201).json(successResponse(result, result.message));
  },
);

export const removeCompanyAdminHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId, userId } = req.params;
    const { officeCity } = req.query as { officeCity?: string };

    const result = await removeCompanyAdmin(userId, companyId, officeCity);

    res.json(successResponse(result, result.message));
  },
);

export const listCompanyAdminsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId } = req.params as { companyId: string };

    const admins = await listCompanyAdmins(companyId);

    res.json(successResponse(admins));
  },
);

// ============================================================
// PLATFORM ADMIN HANDLERS
// ============================================================

export const getAdminStatsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const stats = await getAdminStats();
    res.json(successResponse(stats));
  },
);

export const listUsersHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { search, limit, cursor } = req.query as {
      search?: string;
      limit?: string;
      cursor?: string;
    };

    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const result = await listUsers(search, parsedLimit, cursor);

    res.json(successResponse(result));
  },
);

export const getUserDetailHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { userId } = req.params;
    const user = await getUserDetail(userId);
    res.json(successResponse(user));
  },
);

export const updateUserStatusHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { userId } = req.params;
    const { status } = updateUserStatusSchema.parse(req.body);

    const result = await updateUserStatus(userId, status);

    res.json(successResponse(result, `User status updated to ${status}`));
  },
);

export const assignPlatformAdminHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { userId } = req.params;

    const result = await assignPlatformAdmin(req.user.id, userId);

    res.status(201).json(successResponse(result, result.message));
  },
);

export const removePlatformAdminHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { userId } = req.params;

    const result = await removePlatformAdmin(userId, req.user.id);

    res.json(successResponse(result, result.message));
  },
);

// ============================================================
// CONTENT MODERATION HANDLERS
// ============================================================

export const adminListPostsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { q, limit, cursor } = req.query as any;
    const result = await adminListPosts({
      q,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminDeletePostHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { postId } = req.params;
    const result = await adminDeletePost(postId);
    res.json(successResponse(result, result.message));
  },
);

export const adminListHackathonsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { q, limit, cursor } = req.query as any;
    const result = await adminListHackathons({
      q,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminUpdateHackathonStatusHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { hackathonId } = req.params;
    const { status } = req.body;
    const result = await adminUpdateHackathonStatus(hackathonId, status);
    res.json(successResponse(result));
  },
);

export const adminListProjectsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { q, limit, cursor } = req.query as any;
    const result = await adminListProjects({
      q,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminUpdateProjectStatusHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { projectId } = req.params;
    const { status } = req.body;
    const result = await adminUpdateProjectStatus(projectId, status);
    res.json(successResponse(result));
  },
);

export const adminListJobsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { q, limit, cursor } = req.query as any;
    const result = await adminListJobs({
      q,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminDeleteJobHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { jobId } = req.params;
    const result = await adminDeleteJob(jobId);
    res.json(successResponse(result, result.message));
  },
);

export const adminListCommunitiesHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { q, limit, cursor } = req.query as any;
    const result = await adminListCommunities({
      q,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
    res.json(successResponse(result));
  },
);

export const adminUpdateCommunityHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { communityId } = req.params;
    const { archived, verified } = req.body;
    const result = await adminUpdateCommunity(communityId, { archived, verified });
    res.json(successResponse(result));
  },
);

export const adminListReferralsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { q, limit, cursor } = req.query as any;
    const result = await adminListReferrals({
      q,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
    res.json(successResponse(result));
  },
);

// ============================================================
// DEPARTMENT MANAGEMENT
// ============================================================

export const adminCreateDepartmentHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId } = req.params;
    const { name, hod } = req.body;
    const result = await adminCreateDepartment(req.user.id, { name, collegeId, hod });
    res.status(201).json(successResponse(result, "Department created successfully"));
  },
);

export const adminListDepartmentsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId } = req.params;
    const departments = await adminListDepartments(collegeId);
    res.json(successResponse(departments));
  },
);

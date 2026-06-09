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
  updateUserStatus,
  assignPlatformAdmin,
  removePlatformAdmin,
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

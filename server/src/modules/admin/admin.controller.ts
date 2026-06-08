import { Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";

import {
  assignCollegeAdminSchema,
  assignCompanyAdminSchema,
} from "./admin.validation";

import {
  assignCollegeAdmin,
  removeCollegeAdmin,
  listCollegeAdmins,
  assignCompanyAdmin,
  removeCompanyAdmin,
  listCompanyAdmins,
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

import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import AppError from "shared/errors/AppError";

import { searchResdexCandidates, ResdexSearchFilters } from "./resdex.service";

/**
 * POST /api/v1/resdex/search
 *
 * Request body (all fields optional):
 * {
 *   query?:         string,         // fuzzy text match on fullName + about
 *   skills?:        string[],       // array of skills — ALL must match
 *   minCgpa?:       number,         // minimum CGPA (float, e.g. 8.0)
 *   graduationYear?: number,        // exact graduation year (e.g. 2025)
 *   collegeName?:   string,         // fuzzy match inside education.collegeName
 *   companyName?:   string,         // fuzzy match inside experience.companyName
 *   size?:          number,         // page size, default 20
 *   from?:          number,         // offset, default 0
 * }
 */
export const resdexSearchHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = req.body ?? {};

    // Validate skills is an array if provided
    if (body.skills !== undefined && !Array.isArray(body.skills)) {
      throw new AppError("'skills' must be an array of strings.", 400);
    }

    // Validate numeric fields
    if (body.minCgpa !== undefined && isNaN(Number(body.minCgpa))) {
      throw new AppError("'minCgpa' must be a valid number.", 400);
    }

    if (body.graduationYear !== undefined && isNaN(Number(body.graduationYear))) {
      throw new AppError("'graduationYear' must be a valid integer.", 400);
    }

    const filters: ResdexSearchFilters = {
      query: body.query?.toString() || undefined,
      skills: body.skills as string[] | undefined,
      minCgpa: body.minCgpa !== undefined ? Number(body.minCgpa) : undefined,
      graduationYear:
        body.graduationYear !== undefined ? Number(body.graduationYear) : undefined,
      collegeName: body.collegeName?.toString() || undefined,
      companyName: body.companyName?.toString() || undefined,
      size: body.size !== undefined ? Number(body.size) : 20,
      from: body.from !== undefined ? Number(body.from) : 0,
    };

    const result = await searchResdexCandidates(filters);

    res.json(
      successResponse(result, `Found ${result.total} candidate(s).`)
    );
  }
);

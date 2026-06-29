import { Request, Response } from "express";

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
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
  async (req: any, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AppError("Authentication required.", 401);
    }

    // Role-based Access Control checks
    const isPlatformAdmin =
      user.primaryRole === "SUPER_ADMIN" ||
      user.roles?.some((ur: any) =>
        ["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN"].includes(ur.role?.name)
      );

    const isRecruiter =
      user.primaryRole === "RECRUITER" ||
      user.roles?.some((ur: any) => ur.role?.name === "RECRUITER") ||
      (await prisma.companyAdmin.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }));

    const isTpo =
      user.primaryRole === "TPO" ||
      user.roles?.some((ur: any) => ur.role?.name === "TPO") ||
      (await prisma.collegeTpo.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }));

    const isCollegeAdmin =
      user.primaryRole === "COLLEGE_ADMIN" ||
      (await prisma.collegeAdmin.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }));

    if (!isPlatformAdmin && !isRecruiter && !isTpo && !isCollegeAdmin) {
      throw new AppError("Access denied. Candidate search is only available to Recruiters, TPOs, and Admins.", 403);
    }

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

    if (body.size !== undefined && (isNaN(Number(body.size)) || Number(body.size) < 0)) {
      throw new AppError("'size' must be a non-negative number.", 400);
    }

    if (body.from !== undefined && (isNaN(Number(body.from)) || Number(body.from) < 0)) {
      throw new AppError("'from' must be a non-negative number.", 400);
    }

    // Daily search quota check for FREE recruiters
    const isFreeTier = user.tier === "FREE";
    const dailyLimit = 5;
    const today = new Date().toISOString().split("T")[0];
    const limitKey = `resdex:search-count:${user.id}:${today}`;

    // Apply limit to Free Recruiters (Platform Admin / TPOs / College Admins bypass limits)
    const isSubjectToLimit = !!(isRecruiter && !isPlatformAdmin && !isTpo && !isCollegeAdmin);

    let currentSearchCount = 0;
    if (isSubjectToLimit && isFreeTier) {
      const storedCount = await redis.get(limitKey);
      currentSearchCount = storedCount ? parseInt(storedCount, 10) : 0;

      if (currentSearchCount >= dailyLimit) {
        throw new AppError("Daily search limit reached. Upgrade to premium for unlimited searches.", 429);
      }
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

    if (isSubjectToLimit && isFreeTier) {
      currentSearchCount++;
      await redis.set(limitKey, currentSearchCount, "EX", 86400); // 24 hours TTL
    }

    res.json(
      successResponse(
        {
          ...result,
          searchLimitInfo: {
            isLimited: isSubjectToLimit && isFreeTier,
            dailyLimit,
            currentCount: isSubjectToLimit && isFreeTier ? currentSearchCount : 0,
          },
        },
        `Found ${result.total} candidate(s).`
      )
    );
  }
);

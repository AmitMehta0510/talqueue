import { Request, Response } from "express";

import { CompanySize, CompanyType } from "@prisma/client";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  createCompany,
  getCompanies,
  getCompanyBySlug,
  getCompanyEmployees,
  seedCompanies,
  getCompanyReferrers,
  requestCompanyRegistration,
  followCompany,
  unfollowCompany,
} from "./companies.service";

import { createCompanySchema } from "./companies.validation";

export const createCompanyHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = createCompanySchema.parse(req.body);

    const company = await createCompany(req.user.id, validatedData);

    res.status(201).json(successResponse(company, "Company created"));
  },
);

export const getCompaniesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(
      1,
      Number.parseInt((req.query.page as string) || "1", 10) || 1,
    );
    const rawLimit =
      Number.parseInt((req.query.limit as string) || "20", 10) || 20;
    const limit = Math.min(100, Math.max(1, rawLimit));

    const parseBoolean = (value?: string) => {
      if (!value) return undefined;
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
      return undefined;
    };

    const search =
      (req.query.q as string) || (req.query.search as string) || undefined;
    const industry = (req.query.industry as string) || undefined;
    const location = (req.query.location as string) || undefined;
    const type = (req.query.type as CompanyType) || undefined;
    const size = (req.query.size as CompanySize) || undefined;
    const verified = parseBoolean(req.query.verified as string | undefined);
    const hiringEnabled = parseBoolean(
      req.query.hiringEnabled as string | undefined,
    );
    const hasJobs = parseBoolean(req.query.hasJobs as string | undefined);

    const companies = await getCompanies(page, limit, {
      q: search,
      industry,
      verified,
      hiringEnabled,
      location,
      type,
      size,
      hasJobs,
    });

    res.json(successResponse(companies));
  },
);

export const getCompanyBySlugHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const slug = req.params.slug as string;

    const company = await getCompanyBySlug(req.user?.id, slug);

    res.json(successResponse(company));
  },
);

export const getCompanyEmployeesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;

    const page = Math.max(
      1,
      Number.parseInt((req.query.page as string) || "1", 10) || 1,
    );
    const rawLimit =
      Number.parseInt((req.query.limit as string) || "20", 10) || 20;
    const limit = Math.min(100, Math.max(1, rawLimit));

    const employees = await getCompanyEmployees(companyId, page, limit);

    res.json(successResponse(employees));
  },
);

export const seedCompaniesHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await seedCompanies(req.user.id);
    res.json(successResponse(result, "Company directory seeded successfully"));
  },
);

export const getCompanyReferrersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;
    const referrers = await getCompanyReferrers(companyId);
    res.json(successResponse(referrers));
  },
);

export const requestCompanyRegistrationHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await requestCompanyRegistration(req.user.id, req.body);
    res.status(202).json(successResponse(result, result.message));
  },
);

export const followCompanyHandler = asyncHandler(
  async (req: any, res: Response) => {
    const companyId = req.params.companyId as string;
    const result = await followCompany(req.user.id, companyId);
    res.json(successResponse(result, result.message));
  },
);

export const unfollowCompanyHandler = asyncHandler(
  async (req: any, res: Response) => {
    const companyId = req.params.companyId as string;
    const result = await unfollowCompany(req.user.id, companyId);
    res.json(successResponse(result, result.message));
  },
);



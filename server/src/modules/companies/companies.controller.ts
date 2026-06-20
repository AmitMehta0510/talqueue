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
  getCompanyAdminStats,
  listCompanyRecruiters,
  assignCompanyRecruiter,
  removeCompanyRecruiter,
  listDiscoveredCompanies,
  bulkReviewDiscoveredCompanies,
  submitCompanyClaim,
  submitRecruiterOnboarding,
  createCompanyOffice,
  createCompanyDepartment,
} from "./companies.service";

import {
  listCompanyAdmins,
  assignCompanyAdmin,
  removeCompanyAdmin,
} from "modules/admin/admin.service";

import {
  createCompanySchema,
  submitCompanyClaimSchema,
  submitRecruiterOnboardingSchema,
  createCompanyOfficeSchema,
  createCompanyDepartmentSchema,
} from "./companies.validation";

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

export const getCompanyAdminStatsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId } = req.params;
    const stats = await getCompanyAdminStats(companyId);
    res.json(successResponse(stats));
  }
);

export const listCompanyAdminsForDashboardHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId } = req.params;
    const admins = await listCompanyAdmins(companyId);
    res.json(successResponse(admins));
  }
);

export const assignCompanyAdminFromDashboardHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId } = req.params;
    const { userId, officeCity } = req.body;
    const result = await assignCompanyAdmin(req.user.id, userId, companyId, officeCity);
    res.json(successResponse(result, "Company admin assigned successfully"));
  }
);

export const removeCompanyAdminFromDashboardHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId, userId } = req.params;
    const { officeCity } = req.query;
    const result = await removeCompanyAdmin(userId, companyId, officeCity as string | undefined);
    res.json(successResponse(result, "Company admin removed successfully"));
  }
);

export const listCompanyRecruitersHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId } = req.params;
    const recruiters = await listCompanyRecruiters(companyId);
    res.json(successResponse(recruiters));
  }
);

export const assignCompanyRecruiterHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId } = req.params;
    const { userId, title } = req.body;
    const result = await assignCompanyRecruiter(req.user.id, companyId, userId, title);
    res.json(successResponse(result, "Recruiter assigned successfully"));
  }
);

export const removeCompanyRecruiterHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyId, userId } = req.params;
    const result = await removeCompanyRecruiter(companyId, userId);
    res.json(successResponse(result, "Recruiter removed successfully"));
  }
);

// ---------------------------------------------------------------------------
// DISCOVERED COMPANY MODERATION (Admin)
// ---------------------------------------------------------------------------

export const listDiscoveredCompaniesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, Number.parseInt((req.query.page as string) || "1", 10) || 1);
    const rawLimit = Number.parseInt((req.query.limit as string) || "30", 10) || 30;
    const limit = Math.min(100, Math.max(1, rawLimit));

    const result = await listDiscoveredCompanies(page, limit);
    res.json(successResponse(result));
  }
);

export const bulkReviewDiscoveredCompaniesHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { companyIds, action } = req.body as {
      companyIds: string[];
      action: "VERIFY" | "REJECT";
    };

    if (!action || !(["VERIFY", "REJECT"].includes(action))) {
      res.status(400).json({ error: 'action must be "VERIFY" or "REJECT"' });
      return;
    }

    const result = await bulkReviewDiscoveredCompanies(req.user.id, companyIds, action);
    const message =
      action === "VERIFY"
        ? `Successfully verified ${result.processed} company/companies.`
        : `Successfully rejected and removed ${result.processed} company/companies.`;
    res.json(successResponse(result, message));
  }
);

export const submitCompanyClaimHandler = asyncHandler(
  async (req: any, res: Response) => {
    const payload = {
      ...req.body,
      companyId: req.params.companyId,
    };
    const validatedData = submitCompanyClaimSchema.parse(payload);
    const result = await submitCompanyClaim(req.user.id, validatedData);
    res.json(successResponse(result, "Company claim request submitted successfully"));
  }
);

export const submitRecruiterOnboardingHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = submitRecruiterOnboardingSchema.parse(req.body);
    const result = await submitRecruiterOnboarding(req.user.id, validatedData);
    res.json(successResponse(result, "Recruiter onboarding request processed"));
  }
);

export const createCompanyOfficeHandler = asyncHandler(
  async (req: any, res: Response) => {
    const payload = {
      ...req.body,
      companyId: req.params.companyId,
    };
    const validatedData = createCompanyOfficeSchema.parse(payload);
    const office = await createCompanyOffice(req.user.id, validatedData);
    res.status(201).json(successResponse(office, "Company office created successfully"));
  }
);

export const createCompanyDepartmentHandler = asyncHandler(
  async (req: any, res: Response) => {
    const payload = {
      ...req.body,
      companyId: req.params.companyId,
    };
    const validatedData = createCompanyDepartmentSchema.parse(payload);
    const department = await createCompanyDepartment(req.user.id, validatedData);
    res.status(201).json(successResponse(department, "Company department created successfully"));
  }
);

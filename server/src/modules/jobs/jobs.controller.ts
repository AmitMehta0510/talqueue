import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import {
  createJob,
  requestCompanyAndCreateJob,
  getJobs,
  getJobBySlug,
  getCompanyJobs,
  getRecruiterJobs,
  getJobSkillsAutocomplete,
  getJobLocationsAutocomplete,
  seedJobs,
} from "./jobs.service";
import { createJobSchema } from "./jobs.validation";

//
// CREATE JOB (or request pending company approval)
//
export const createJobHandler = asyncHandler(async (req: any, res: Response) => {
  const validatedData = createJobSchema.parse(req.body);

  // If recruiter selected an existing company → post directly
  if (validatedData.companyId) {
    const job = await createJob(req.user.id, validatedData);
    return res.status(201).json(successResponse(job, "Job posted successfully"));
  }

  // If recruiter entered a new company name → submit for admin approval
  const result = await requestCompanyAndCreateJob(req.user.id, validatedData);
  return res.status(202).json(successResponse(result, result.message));
});

//
// GET JOBS — supports server-side filtering via query params
//
export const getJobsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, parseInt(req.query.page  as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

  // Parse multi-value params (sent as comma-separated strings or repeated keys)
  const parseMulti = (val: unknown, uppercase = false): string[] => {
    if (!val) return [];
    const arr = Array.isArray(val)
      ? (val as string[]).filter(Boolean)
      : (val as string).split(",").map((s) => s.trim()).filter(Boolean);
    return uppercase ? arr.map((s) => s.toUpperCase()) : arr;
  };

  const workMode  = parseMulti(req.query.workMode, true);
  const jobType   = parseMulti(req.query.jobType, true);
  const skills    = parseMulti(req.query.skills);
  const location  = parseMulti(req.query.location);
  const roles     = parseMulti(req.query.roles);
  const search    = (req.query.search as string | undefined)?.trim() || undefined;
  const freshness = (req.query.freshness as string | undefined) || undefined;

  const jobs = await getJobs({
    page,
    limit,
    search,
    workMode:  workMode.length  ? workMode  : undefined,
    jobType:   jobType.length   ? jobType   : undefined,
    skills:    skills.length    ? skills    : undefined,
    location:  location.length  ? location  : undefined,
    roles:     roles.length     ? roles     : undefined,
    freshness: (freshness as any) || null,
  });

  res.json(successResponse(jobs));
});

export const getJobBySlugHandler = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const job = await getJobBySlug(slug);
  res.json(successResponse(job));
});

export const getCompanyJobsHandler = asyncHandler(async (req: Request, res: Response) => {
  const companyId = req.params.companyId as string;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
  const result = await getCompanyJobs(companyId, page, limit);
  res.json(successResponse(result));
});

export const getRecruiterJobsHandler = asyncHandler(async (req: any, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const jobs = await getRecruiterJobs(req.user.id, page, limit);
  res.json(successResponse(jobs));
});

export const seedJobsHandler = asyncHandler(async (req: any, res: Response) => {
  const result = await seedJobs(req.user.id);
  res.json(successResponse(result, "Jobs seeded successfully"));
});

//
// SKILLS AUTOCOMPLETE — GET /jobs/skills/autocomplete?q=react&limit=10
//
export const getJobSkillsAutocompleteHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const q     = ((req.query.q as string) || "").trim();
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 15);
    const skills = await getJobSkillsAutocomplete(q, limit);
    res.json(successResponse(skills));
  },
);

//
// LOCATIONS AUTOCOMPLETE — GET /jobs/locations/autocomplete?q=beng&limit=10
//
export const getJobLocationsAutocompleteHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const q     = ((req.query.q as string) || "").trim();
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 15);
    const locations = await getJobLocationsAutocomplete(q, limit);
    res.json(successResponse(locations));
  },
);
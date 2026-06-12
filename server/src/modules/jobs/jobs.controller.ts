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

export const getJobsHandler = asyncHandler(async (req: Request, res: Response) => {
  const jobs = await getJobs();
  res.json(successResponse(jobs));
});

export const getJobBySlugHandler = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const job = await getJobBySlug(slug);
  res.json(successResponse(job));
});

export const getCompanyJobsHandler = asyncHandler(async (req: Request, res: Response) => {
  const companyId = req.params.companyId as string;
  const jobs = await getCompanyJobs(companyId);
  res.json(successResponse(jobs));
});

export const getRecruiterJobsHandler = asyncHandler(async (req: any, res: Response) => {
  const jobs = await getRecruiterJobs(req.user.id);
  res.json(successResponse(jobs));
});
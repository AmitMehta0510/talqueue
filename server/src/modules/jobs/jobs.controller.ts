import {
  Request,
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  createJob,
  getJobs,
  getJobBySlug,
  getCompanyJobs,
  getRecruiterJobs,
} from "./jobs.service";

import {
  createJobSchema,
} from "./jobs.validation";

export const createJobHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        createJobSchema.parse(
          req.body
        );

      const job =
        await createJob(
          req.user.id,
          validatedData
        );

      res.status(201).json(
        successResponse(
          job,
          "Job created"
        )
      );
    }
  );

export const getJobsHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const jobs =
        await getJobs();

      res.json(
        successResponse(jobs)
      );
    }
  );

export const getJobBySlugHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const slug =
        req.params.slug  as string;

      const job =
        await getJobBySlug(
          slug
        );

      res.json(
        successResponse(job)
      );
    }
  );

export const getCompanyJobsHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const companyId =
        req.params.companyId  as string;

      const jobs =
        await getCompanyJobs(
          companyId
        );

      res.json(
        successResponse(jobs)
      );
    }
  );

export const getRecruiterJobsHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const jobs =
        await getRecruiterJobs(
          req.user.id
        );

      res.json(
        successResponse(jobs)
      );
    }
  );
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
  toggleSaveJob,
  getSavedJobs,
  getRecommendedJobs,
  getTrendingJobs,
  getInternshipRecommendations,
} from "./recommendations.service";

import {
  recommendJobsForUserAdvanced,
  recommendCollaborators,
  recommendProjectsForUser,
} from "./recommendation-engine.service";


export const toggleSaveJobHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await toggleSaveJob(
          req.user.id,
          req.params.jobId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const getSavedJobsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const safePage = isNaN(page as number) ? 1 : page;
      const safeLimitParam = isNaN(limit as number) ? 20 : limit;

      const jobs =
        await getSavedJobs(
          req.user.id,
          safePage,
          safeLimitParam
        );

      res.json(
        successResponse(jobs)
      );
    }
  );

export const getRecommendedJobsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const safePage = isNaN(page as number) ? 1 : page;
      const safeLimitParam = isNaN(limit as number) ? 20 : limit;

      const jobs =
        await getRecommendedJobs(
          req.user.id,
          safePage,
          safeLimitParam
        );

      res.json(
        successResponse(jobs)
      );
    }
  );

export const getTrendingJobsHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const safePage = isNaN(page as number) ? 1 : page;
      const safeLimitParam = isNaN(limit as number) ? 15 : limit;

      const jobs =
        await getTrendingJobs(
          safePage,
          safeLimitParam
        );

      res.json(
        successResponse(jobs)
      );
    }
  );

export const getInternshipRecommendationsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const safePage = isNaN(page as number) ? 1 : page;
      const safeLimitParam = isNaN(limit as number) ? 20 : limit;

      const jobs =
        await getInternshipRecommendations(
          req.user.id,
          safePage,
          safeLimitParam
        );

      res.json(
        successResponse(jobs)
      );
    }
  );

export const getAdvancedRecommendedJobsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const safePage = isNaN(page as number) ? 1 : page;
      const safeLimitParam = isNaN(limit as number) ? 20 : limit;

      const jobs =
        await recommendJobsForUserAdvanced(
          req.user.id,
          safePage,
          safeLimitParam
        );

      res.json(
        successResponse(jobs)
      );
    }
  );

export const getRecommendedCollaboratorsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const safePage = isNaN(page as number) ? 1 : page;
      const safeLimitParam = isNaN(limit as number) ? 20 : limit;

      const collaborators =
        await recommendCollaborators(
          req.user.id,
          safePage,
          safeLimitParam
        );

      res.json(
        successResponse(
          collaborators
        )
      );
    }
  );

export const getRecommendedProjectsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const safePage = isNaN(page as number) ? 1 : page;
      const safeLimitParam = isNaN(limit as number) ? 20 : limit;

      const projects =
        await recommendProjectsForUser(
          req.user.id,
          safePage,
          safeLimitParam
        );

      res.json(
        successResponse(
          projects
        )
      );
    }
  );
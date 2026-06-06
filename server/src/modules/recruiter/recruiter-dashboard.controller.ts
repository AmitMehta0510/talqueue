import {
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  getRecruiterDashboard,
  getJobPipeline,
} from "./recruiter-dashboard.service";

export const getRecruiterDashboardHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const dashboard =
        await getRecruiterDashboard(
          req.user.id
        );

      res.json(
        successResponse(
          dashboard
        )
      );
    }
  );

export const getJobPipelineHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const pipeline =
        await getJobPipeline(
          req.user.id,
          req.params.jobId
        );

      res.json(
        successResponse(
          pipeline
        )
      );
    }
  );
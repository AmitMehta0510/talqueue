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
  applyToJob,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  markApplicationViewed,
} from "./jobApplications.service";

import {
  applyToJobSchema,
  updateApplicationStatusSchema,
} from "./jobApplications.validation";

import { paginationQuerySchema } from "shared/validation/query";

export const applyToJobHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        applyToJobSchema.parse(
          req.body
        );

      const application =
        await applyToJob(
          req.user.id,
          req.params.jobId,
          validatedData
        );

      res.status(201).json(
        successResponse(
          application,
          "Applied successfully"
        )
      );
    }
  );

export const getMyApplicationsHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const query = paginationQuerySchema.parse(req.query);

      const applications =
        await getMyApplications(
          req.user.id,
          query.page,
          query.limit
        );

      res.json(
        successResponse(
          applications
        )
      );
    }
  );

export const getJobApplicationsHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const query = paginationQuerySchema.parse(req.query);

      const applications =
        await getJobApplications(
          req.user.id,
          req.params.jobId as string,
          query.page,
          query.limit
        );

      res.json(
        successResponse(
          applications
        )
      );
    }
  );

export const updateApplicationStatusHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        updateApplicationStatusSchema.parse(
          req.body
        );

      const application =
        await updateApplicationStatus(
          req.user.id,
          req.params.applicationId  as string,
          validatedData
        );

      res.json(
        successResponse(
          application,
          "Application updated"
        )
      );
    }
  );

export const markApplicationViewedHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const application =
        await markApplicationViewed(
          req.user.id,
          req.params.applicationId  as string
        );

      res.json(
        successResponse(
          application
        )
      );
    }
  );
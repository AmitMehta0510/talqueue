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
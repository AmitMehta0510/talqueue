import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import {
  getUserTimeline,
} from "./activity.service";

import {
  successResponse,
} from "shared/utils/apiResponse";

export const getMyTimelineHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const timeline =
        await getUserTimeline(
          req.user.id
        );

      res.json(
        successResponse(
          timeline
        )
      );
    }
  );
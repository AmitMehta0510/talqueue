import {
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  trackInteraction,
} from "./interaction-tracking.service";

export const trackInteractionHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await trackInteraction(
          req.user.id,
          req.body
        );

      res.json(
        successResponse(result)
      );
    }
  );
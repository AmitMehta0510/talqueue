import {
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  rebuildUserAffinities,
} from "./affinity.service";

export const rebuildMyAffinitiesHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await rebuildUserAffinities(
          req.user.id
        );

      res.json(
        successResponse(result)
      );
    }
  );
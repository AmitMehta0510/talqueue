import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {

  getTrendingFeed,

  refreshTrendingSnapshots,

} from "./trending.service";

export const getTrendingFeedHandler =
  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const feed =
        await getTrendingFeed();

      res.json(
        successResponse(feed)
      );
    }
  );

export const refreshTrendingHandler =
  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await refreshTrendingSnapshots();

      res.json(
        successResponse(result)
      );
    }
  );
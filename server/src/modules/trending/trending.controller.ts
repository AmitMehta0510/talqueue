import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {

  getTrendingFeed,

  refreshTrendingSnapshots,

} from "./trending.service";

import { trackRecommendationImpression } from "modules/discovery/recommendation-memory.service";
import { trendingQuerySchema } from "shared/validation/query";

export const getTrendingFeedHandler =
  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {
      const query = trendingQuerySchema.parse(req.query);

      const feed =
        await getTrendingFeed(query.limit);

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

export const trackTrendingImpressionHandler =
  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      await trackRecommendationImpression(
        req.user!.id,

        req.body
      );

      res.json(
        successResponse({
          success: true,
        })
      );
    }
  );

import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import { getDiscoveryFeed } from "./discovery.service";

import { trackRecommendationImpression } from "./recommendation-memory.service";

export const getDiscoveryFeedHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const feed = await getDiscoveryFeed(req.user!.id);

    res.json(successResponse(feed));
  },
);

export const trackDiscoveryImpressionHandler =
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
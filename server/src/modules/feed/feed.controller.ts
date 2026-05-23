import {  Response,} from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse,} from "shared/utils/apiResponse";

import { getPersonalizedFeedV2,} from "./feed.service";

import { trackRecommendationImpression } from "modules/discovery/recommendation-memory.service";
import { feedQuerySchema } from "shared/validation/query";

export const getPersonalizedFeedHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const query = feedQuerySchema.parse(req.query);

      const feed =
        await getPersonalizedFeedV2(
          req.user.id
        );

      res.json(
        successResponse(feed.slice(0, query.limit))
      );
    }
  );

export const trackFeedImpressionHandler = asyncHandler(
  async (
    req: any,
    res: Response
  ) => {
    await trackRecommendationImpression(
      req.user.id,

      req.body,
    );

    res.json(
      successResponse({
        success: true,
      })
    );
  }
);

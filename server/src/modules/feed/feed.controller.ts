import {  Response,} from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse,} from "shared/utils/apiResponse";

import { getPersonalizedFeedV2,} from "./feed.service";

export const getPersonalizedFeedHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const feed =
        await getPersonalizedFeedV2(
          req.user.id
        );

      res.json(
        successResponse(feed)
      );
    }
  );
import { Request, Response } from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import { successResponse }
from "shared/utils/apiResponse";

import {
  joinCompanyCommunity,
  getCompanyCommunityFeed,
  getVerifiedEmployees,
  createHiringAlert,
  createReferralDiscussion,
  getCompanyCommunityLeaderboard,
} from "./company-community.service";


export const joinCompanyCommunityHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await joinCompanyCommunity(
          req.user!.id,
          req.params.communityId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

  export const getCompanyCommunityFeedHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getCompanyCommunityFeed(
          req.user!.id,
          req.params.communityId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

  export const getVerifiedEmployeesHandler = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getVerifiedEmployees(
          req.params.communityId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const createHiringAlertHandler = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await createHiringAlert(
          req.user!.id,
          req.params.communityId as string,
          req.body
        );

      res.json(
        successResponse(result)
      );
    }
  );


  export const createReferralDiscussionHandler = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await createReferralDiscussion(
          req.user!.id,
          req.params.communityId as string,
          req.body
        );

      res.json(
        successResponse(result)
      );
    }
  );

  export const getCompanyCommunityLeaderboardHandler = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getCompanyCommunityLeaderboard(
          req.params.communityId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );
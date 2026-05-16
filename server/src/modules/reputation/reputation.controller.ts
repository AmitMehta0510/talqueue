import {
  Request,
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  getLeaderboard,
  getUserReputation,
    getUserReputationByUsername,

  getMyReputationHistory,

  getAllBadges,

  getTopBadges,
} from "./reputation.service";

export const getLeaderboardHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const leaderboard =
        await getLeaderboard();

      res.json(
        successResponse(
          leaderboard
        )
      );
    }
  );

export const getUserReputationHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const reputation =
        await getUserReputation(
          req.user.id
        );

      res.json(
        successResponse(
          reputation
        )
      );
    }
  );

export const getUserReputationByUsernameHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const reputation =
        await getUserReputationByUsername(
          req.params
            .username as string
        );

      res.json(
        successResponse(
          reputation
        )
      );
    }
  );  

export const getMyReputationHistoryHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const history =
        await getMyReputationHistory(
          req.user.id
        );

      res.json(
        successResponse(
          history
        )
      );
    }
  );  

export const getAllBadgesHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const badges =
        await getAllBadges();

      res.json(
        successResponse(
          badges
        )
      );
    }
  );  

export const getTopBadgesHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const badges =
        await getTopBadges();

      res.json(
        successResponse(
          badges
        )
      );
    }
  );  
import { Request, Response } from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import { successResponse }
from "shared/utils/apiResponse";

import {
  autoJoinCollegeCommunity,
  getCollegeFeed,
  getCollegeLeaderboard,
  getCollegeMembers,
  createCollegeAnnouncement,
} from "./college-community.service";

export const joinCollegeCommunityHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await autoJoinCollegeCommunity(
          req.user!.id,
          req.params.collegeId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

  export const getCollegeFeedHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getCollegeFeed(
          req.user!.id,
          req.params.collegeId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

  export const getCollegeLeaderboardHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getCollegeLeaderboard(
          req.params.collegeId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

  export const getCollegeMembersHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getCollegeMembers(
          req.user!.id,
          req.params.collegeId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

  export const createCollegeAnnouncementHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await createCollegeAnnouncement(
          req.user!.id,
          req.params.collegeId as string,
          req.body
        );

      res.json(
        successResponse(result)
      );
    }
  );
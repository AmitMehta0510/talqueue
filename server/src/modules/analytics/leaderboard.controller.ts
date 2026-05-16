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

  getTopEngineers,

  getTopProjects,

  getTopHackathonEngineers,

  getTopTeams,

  getFastestGrowingEngineers,

} from "./leaderboard.service";

export const getTopEngineersHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getTopEngineers();

      res.json(
        successResponse(
          result
        )
      );
    }
  );

export const getTopProjectsHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getTopProjects();

      res.json(
        successResponse(
          result
        )
      );
    }
  );

export const getTopHackathonEngineersHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getTopHackathonEngineers();

      res.json(
        successResponse(
          result
        )
      );
    }
  );

export const getTopTeamsHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getTopTeams();

      res.json(
        successResponse(
          result
        )
      );
    }
  );

export const getFastestGrowingEngineersHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await getFastestGrowingEngineers();

      res.json(
        successResponse(
          result
        )
      );
    }
  );
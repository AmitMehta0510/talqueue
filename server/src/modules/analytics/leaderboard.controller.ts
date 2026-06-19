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
      const rawLimit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
      const limit = Number.isNaN(rawLimit) ? 50 : Math.min(rawLimit, 100);

      const result =
        await getTopEngineers(limit);

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
      const rawLimit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;
      const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 100);

      const result =
        await getTopProjects(limit);

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
      const rawLimit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;
      const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 100);

      const result =
        await getTopHackathonEngineers(limit);

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
      const rawLimit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;
      const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 100);

      const result =
        await getTopTeams(limit);

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
      const rawLimit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;
      const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 100);

      const result =
        await getFastestGrowingEngineers(limit);

      res.json(
        successResponse(
          result
        )
      );
    }
  );
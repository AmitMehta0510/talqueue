import {
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  rankJobCandidates,
  generateRecruiterInsights,
} from "./candidate-ranking.service";

export const rankJobCandidatesHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const candidates =
        await rankJobCandidates(
          req.user.id,
          req.params.jobId
        );

      res.json(
        successResponse(
          candidates
        )
      );
    }
  );

export const getRecruiterInsightsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const insights =
        await generateRecruiterInsights(
          req.user.id
        );

      res.json(
        successResponse(
          insights
        )
      );
    }
  );
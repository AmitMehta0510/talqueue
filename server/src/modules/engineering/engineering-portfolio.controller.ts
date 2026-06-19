import {
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  getEngineeringPortfolio,
} from "./engineering-portfolio.service";

export const getEngineeringPortfolioHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const { username } = req.params || {};
      const safeUsername = typeof username === "string" ? username : "";
      const portfolio =
        await getEngineeringPortfolio(
          safeUsername
        );

      res.json(
        successResponse(
          portfolio
        )
      );
    }
  );
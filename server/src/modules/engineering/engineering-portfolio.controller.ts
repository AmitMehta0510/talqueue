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

      const portfolio =
        await getEngineeringPortfolio(
          req.params
            .username as string
        );

      res.json(
        successResponse(
          portfolio
        )
      );
    }
  );
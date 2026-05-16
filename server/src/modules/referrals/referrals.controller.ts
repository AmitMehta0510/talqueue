import {
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  createReferralRequest,
  reviewReferralRequest,
  getReceivedReferralRequests,
  getSentReferralRequests,
} from "./referrals.service";

import {
  createReferralRequestSchema,
  reviewReferralSchema,
} from "./referrals.validation";

export const createReferralRequestHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        createReferralRequestSchema.parse(
          req.body
        );

      const request =
        await createReferralRequest(
          req.user.id,
          req.params.userId,
          validatedData
        );

      res.status(201).json(
        successResponse(
          request,
          "Referral request sent"
        )
      );
    }
  );

export const reviewReferralRequestHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        reviewReferralSchema.parse(
          req.body
        );

      const request =
        await reviewReferralRequest(
          req.user.id,
          req.params.requestId,
          validatedData.status
        );

      res.json(
        successResponse(
          request,
          "Referral request reviewed"
        )
      );
    }
  );

export const receivedReferralRequestsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const requests =
        await getReceivedReferralRequests(
          req.user.id
        );

      res.json(
        successResponse(requests)
      );
    }
  );

export const sentReferralRequestsHandler =
  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const requests =
        await getSentReferralRequests(
          req.user.id
        );

      res.json(
        successResponse(requests)
      );
    }
  );
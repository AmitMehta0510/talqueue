import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

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

export const createReferralRequestHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = createReferralRequestSchema.parse(req.body);

    const request = await createReferralRequest(
      req.user.id,
      req.params.userId,
      validatedData,
    );

    res.status(201).json(successResponse(request, "Referral request sent"));
  },
);

export const reviewReferralRequestHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = reviewReferralSchema.parse(req.body);

    const request = await reviewReferralRequest(
      req.user.id,
      req.params.requestId,
      validatedData.status,
    );

    res.json(successResponse(request, "Referral request reviewed"));
  },
);

export const receivedReferralRequestsHandler = asyncHandler(
  async (req: any, res: Response) => {
    // Cursor-only pagination: pass optional `cursor` and `limit`.
    const cursor = (req.query.cursor as string) || undefined;
    const rawLimit =
      Number.parseInt((req.query.limit as string) || "20", 10) || 20;
    const limit = Math.min(100, Math.max(1, rawLimit));

    const params = { cursor, limit };

    const requests = await getReceivedReferralRequests(req.user.id, params);

    res.json(successResponse(requests));
  },
);

export const sentReferralRequestsHandler = asyncHandler(
  async (req: any, res: Response) => {
    // Cursor-only pagination: pass optional `cursor` and `limit`.
    const cursor = (req.query.cursor as string) || undefined;
    const rawLimit =
      Number.parseInt((req.query.limit as string) || "20", 10) || 20;
    const limit = Math.min(100, Math.max(1, rawLimit));

    const params = { cursor, limit };

    const requests = await getSentReferralRequests(req.user.id, params);

    res.json(successResponse(requests));
  },
);

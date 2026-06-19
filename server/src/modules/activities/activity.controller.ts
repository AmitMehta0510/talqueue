import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { getUserTimeline } from "./activity.service";

import { successResponse } from "shared/utils/apiResponse";

export const getMyTimelineHandler = asyncHandler(
  async (req: any, res: Response) => {
    const cursor = (req.query.cursor as string) || undefined;
    const rawLimit =
      Number.parseInt((req.query.limit as string) || "20", 10) || 20;
    const limit = Math.min(Math.max(1, rawLimit), 50);

    const timeline = await getUserTimeline(req.user.id, {
      cursor,
      limit,
    });

    res.json(successResponse(timeline));
  },
);

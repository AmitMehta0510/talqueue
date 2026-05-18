import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  getSuggestedEngineers,
  getSuggestedMentors,
  getSuggestedRecruiters,
  getSuggestedCollaborators,
  getSuggestedTeammates,
} from "./user-recommendation.service";

export const getSuggestedEngineersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await getSuggestedEngineers(req.user!.id);

    res.json(successResponse(users));
  },
);

export const getSuggestedMentorsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await getSuggestedMentors(req.user!.id);

    res.json(successResponse(users));
  },
);

export const getSuggestedRecruitersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await getSuggestedRecruiters(req.user!.id);

    res.json(successResponse(users));
  },
);

export const getSuggestedCollaboratorsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await getSuggestedCollaborators(req.user!.id);

    res.json(successResponse(users));
  },
);

export const getSuggestedTeammatesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await getSuggestedTeammates(req.user!.id);

    res.json(successResponse(users));
  },
);

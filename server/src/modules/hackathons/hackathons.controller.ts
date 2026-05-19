import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  createHackathon,
  getHackathons,
  getHackathonById,
  registerTeamForHackathon,
  submitProjectToHackathon,
  reviewRegistration,
  archiveHackathon,
  deleteHackathon,
  assignJudgeToHackathon,
  evaluateSubmission,
  declareHackathonWinners,
  getHackathonLeaderboard,
} from "./hackathons.service";

import {
  createHackathonSchema,
  registerTeamSchema,
  submitProjectSchema,
  reviewRegistrationSchema,
  assignJudgeSchema,
  evaluateSubmissionSchema,
} from "./hackathons.validation";

export const createHackathonHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = createHackathonSchema.parse(req.body);

    const hackathon = await createHackathon(req.user.id, validatedData);

    res.status(201).json(successResponse(hackathon, "Hackathon created"));
  },
);

export const registerTeamHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = registerTeamSchema.parse(req.body);

    const registration = await registerTeamForHackathon(
      req.user.id,
      req.params.id,
      validatedData.teamId,
    );

    res.status(201).json(successResponse(registration, "Team registered"));
  },
);

export const reviewRegistrationHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = reviewRegistrationSchema.parse(req.body);

    const result = await reviewRegistration(
      req.user.id,
      req.params.registrationId,
      validatedData.status,
    );

    res.json(successResponse(result, "Registration reviewed"));
  },
);

export const assignJudgeHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = assignJudgeSchema.parse(req.body);

    const assignment = await assignJudgeToHackathon(
      req.user.id,
      req.params.hackathonId,
      validatedData.userId,
    );

    res
      .status(201)
      .json(successResponse(assignment, "Judge assigned successfully"));
  },
);

export const getHackathonsHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const hackathons = await getHackathons();

    res.json(successResponse(hackathons));
  },
);

export const getHackathonHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const hackathon = await getHackathonById(
      req.user?.id,
      req.params.id as string,
    );

    res.json(successResponse(hackathon));
  },
);

export const submitProjectHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = submitProjectSchema.parse(req.body);

    const submission = await submitProjectToHackathon(
      req.user.id,
      req.params.id,
      validatedData,
    );

    res.status(201).json(successResponse(submission, "Project submitted"));
  },
);

export const evaluateSubmissionHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = evaluateSubmissionSchema.parse(req.body);

    const evaluation = await evaluateSubmission(
      req.user.id,
      req.params.submissionId,
      validatedData,
    );

    res.status(201).json(successResponse(evaluation, "Submission evaluated"));
  },
);

export const declareHackathonWinnersHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await declareHackathonWinners(
      req.user.id,
      req.params.hackathonId,
    );

    res.json(successResponse(result, "Winners declared"));
  },
);

export const getHackathonLeaderboardHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const leaderboard = await getHackathonLeaderboard(
      req.params.hackathonId as string,
    );

    res.json(successResponse(leaderboard));
  },
);

export const archiveHackathonHandler = asyncHandler(
  async (req: any, res: Response) => {
    const hackathon = await archiveHackathon(
      req.user.id,
      req.params.hackathonId,
    );

    res.json(successResponse(hackathon, "Hackathon archived"));
  },
);

export const deleteHackathonHandler = asyncHandler(
  async (req: any, res: Response) => {
    const hackathon = await deleteHackathon(
      req.user.id,
      req.params.hackathonId,
    );

    res.json(successResponse(hackathon, "Hackathon deleted"));
  },
);

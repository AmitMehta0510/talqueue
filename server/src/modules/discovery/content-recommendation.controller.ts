import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  getSuggestedProjects,
  getSuggestedJobs,
  getSuggestedHackathons,
  getSuggestedCompanies,
  getSuggestedPosts,
  getSuggestedCommunities,
} from "./content-recommendation.service";

export const getSuggestedProjectsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const projects = await getSuggestedProjects(req.user!.id);

    res.json(successResponse(projects));
  },
);

export const getSuggestedJobsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const jobs = await getSuggestedJobs(req.user!.id);

    res.json(successResponse(jobs));
  },
);

export const getSuggestedHackathonsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const hackathons = await getSuggestedHackathons(req.user!.id);

    res.json(successResponse(hackathons));
  },
);

export const getSuggestedCompaniesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const companies = await getSuggestedCompanies(req.user!.id);

    res.json(successResponse(companies));
  },
);

export const getSuggestedPostsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const posts = await getSuggestedPosts(req.user!.id);

    res.json(successResponse(posts));
  },
);

export const getSuggestedCommunitiesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const communities = await getSuggestedCommunities(req.user!.id);

    res.json(successResponse(communities));
  },
);

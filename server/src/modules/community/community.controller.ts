import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  createCommunity,
  getCommunityBySlug,
  archiveCommunity,
  getJoinedCommunities,
  joinCommunity,
  leaveCommunity,
} from "./community.service";

// CREATE COMMUNITY
export const createCommunityHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const community = await createCommunity(
      req.user!.id,

      req.body,
    );

    res.status(201).json(successResponse(community));
  },
);

// GET COMMUNITY
export const getCommunityBySlugHandler = asyncHandler(
  async (
    req: Request<{
      slug: string;
    }>,

    res: Response,
  ) => {
    const community = await getCommunityBySlug(req.params.slug);

    res.json(successResponse(community));
  },
);

// ARCHIVE COMMUNITY
export const archiveCommunityHandler = asyncHandler(
  async (
    req: Request<{
      communityId: string;
    }>,

    res: Response,
  ) => {
    const result = await archiveCommunity(
      req.user!.id,

      req.params.communityId,
    );

    res.json(successResponse(result));
  },
);

export const getJoinedCommunitiesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const communities = await getJoinedCommunities(req.user!.id);
    res.json(successResponse(communities));
  },
);

export const joinCommunityHandler = asyncHandler(
  async (req: Request<{ communityId: string }>, res: Response) => {
    const result = await joinCommunity(req.user!.id, req.params.communityId);
    res.json(successResponse(result));
  },
);

export const leaveCommunityHandler = asyncHandler(
  async (req: Request<{ communityId: string }>, res: Response) => {
    const result = await leaveCommunity(req.user!.id, req.params.communityId);
    res.json(successResponse(result));
  },
);


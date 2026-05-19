import {
  Request,
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  followUser,
  unfollowUser,
  sendConnectionRequest,
  reviewConnectionRequest,
  getFollowers,
  getFollowing,
  getConnections,
  getSuggestedConnections,
  getMutualConnections,
} from "./social.service";

import {
  reviewConnectionSchema,
} from "./social.validation";

const getPaginationParams = (req: any) => ({
  cursor:
    (req.query.cursor as string) ||
    undefined,

  limit:
    Number.parseInt(
      (req.query.limit as string) || "20",
      10
    ) || 20,
});

export const followUserHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await followUser(
          req.user.id,
          req.params.userId
        );

      res.status(201).json(
        successResponse(
          result,
          "User followed"
        )
      );
    }
  );

export const unfollowUserHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await unfollowUser(
          req.user.id,
          req.params.userId
        );

      res.json(
        successResponse(
          result,
          "User unfollowed"
        )
      );
    }
  );

export const sendConnectionRequestHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await sendConnectionRequest(
          req.user.id,
          req.params.userId
        );

      res.status(201).json(
        successResponse(
          result,
          "Connection request sent"
        )
      );
    }
  );

  export const reviewConnectionRequestHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        reviewConnectionSchema.parse(
          req.body
        );

      const result =
        await reviewConnectionRequest(
          req.user.id,
          req.params.connectionId,
          validatedData.status
        );

      res.json(
        successResponse(
          result,
          "Connection reviewed"
        )
      );
    }
  );

export const getFollowersHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const userId =
        req.params.userId as string;

      const followers =
        await getFollowers(
          userId,
          getPaginationParams(req)
        );

      res.json(
        successResponse(
          followers
        )
      );
    }
  );

export const getFollowingHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const userId =
        req.params.userId as string;

      const following =
        await getFollowing(
          userId,
          getPaginationParams(req)
        );

      res.json(
        successResponse(
          following
        )
      );
    }
  );

export const getConnectionsHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const userId =
        req.params.userId as string;

      const connections =
        await getConnections(
          userId,
          getPaginationParams(req)
        );

      res.json(
        successResponse(
          connections
        )
      );
    }
  );


export const suggestedConnectionsHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const users =
        await getSuggestedConnections(
          req.user.id,
          getPaginationParams(req)
        );

      res.json(
        successResponse(users)
      );
    }
  );

export const mutualConnectionsHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const users =
        await getMutualConnections(
          req.user.id,
          req.params.userId,
          getPaginationParams(req)
        );

      res.json(
        successResponse(users)
      );
    }
  );

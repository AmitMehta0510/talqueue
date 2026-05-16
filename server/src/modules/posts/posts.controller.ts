import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";
interface Params {
  id: string;
}

import {
  createComment,
  createPost,
  getFeed,
  getPostById,
  toggleLike,
} from "./posts.service";

import {
  createCommentSchema,
  createPostSchema,
} from "./posts.validation";

export const createPostHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      const validatedData =
        createPostSchema.parse(req.body);

      const post = await createPost(
        req.user.id,
        validatedData
      );

      res.status(201).json(
        successResponse(
          post,
          "Post created"
        )
      );
    }
  );

export const getFeedHandler =
  asyncHandler(
    async (req: Request, res: Response) => {
      const feed = await getFeed();

      res.json(
        successResponse(feed)
      );
    }
  );

export const getPostHandler = asyncHandler(
  async (
    req: Request<Params>,
    res: Response
  ) => {
    const post = await getPostById(
      req.params.id
    );

    res.json(
      successResponse(post)
    );
  }
);

export const createCommentHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      const validatedData =
        createCommentSchema.parse(req.body);

      const comment =
        await createComment(
          req.user.id,
          req.params.id,
          validatedData
        );

      res.status(201).json(
        successResponse(
          comment,
          "Comment added"
        )
      );
    }
  );

export const toggleLikeHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      const result = await toggleLike(
        req.user.id,
        req.params.id
      );

      res.json(
        successResponse(result)
      );
    }
  );
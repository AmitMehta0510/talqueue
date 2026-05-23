import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {

  createPost,
  getFeed,
  getPostById,
  createComment,
  toggleLike,
  updatePost,
  deletePost,
  repostPost,
  toggleSavePost,
  deleteComment,

} from "./posts.service";

import {

  createPostSchema,
  createCommentSchema,
  updatePostSchema,

} from "./posts.validation";
import {
  paginationQuerySchema,
  postDetailQuerySchema,
} from "shared/validation/query";

// CREATE POST
export const createPostHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        createPostSchema.parse(
          req.body
        );

      const post =
        await createPost(
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

// FEED
export const getFeedHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {
      const query = paginationQuerySchema.parse(req.query);

      const feed =
        await getFeed(
          req.user?.id,
          {
            cursor: query.cursor,

            limit: query.limit,
          }
        );

      res.json(
        successResponse(feed)
      );
    }
  );

// GET POST
export const getPostHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const query = postDetailQuerySchema.parse(req.query);

      const post =
        await getPostById(
          req.user?.id,
          req.params.id as string,
          {
            commentsLimit: query.commentsLimit,

            repliesLimit: query.repliesLimit,
          }
        );

      res.json(
        successResponse(post)
      );
    }
  );

// UPDATE POST
export const updatePostHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        updatePostSchema.parse(
          req.body
        );

      const updatedPost =
        await updatePost(
          req.user.id,
          req.params.id,
          validatedData
        );

      res.json(
        successResponse(
          updatedPost,
          "Post updated"
        )
      );
    }
  );

// DELETE POST
export const deletePostHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await deletePost(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(
          result,
          "Post deleted"
        )
      );
    }
  );

// COMMENT
export const createCommentHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        createCommentSchema.parse(
          req.body
        );

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

// LIKE
export const toggleLikeHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await toggleLike(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(result)
      );
    }
  );

  export const toggleSavePostHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await toggleSavePost(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const repostPostHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const repost =
        await repostPost(
          req.user.id,
          req.params.id,
          req.body.caption
        );

      res.json(
        successResponse(
          repost,
          "Post reposted"
        )
      );
    }
  );

export const deleteCommentHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await deleteComment(
          req.user.id,
          req.params.commentId
        );

      res.json(
        successResponse(
          result,
          "Comment deleted"
        )
      );
    }
  );

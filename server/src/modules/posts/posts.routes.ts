import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createPostHandler,
  getFeedHandler,
  getPostHandler,
  updatePostHandler,
  deletePostHandler,
  createCommentHandler,
  toggleLikeHandler,
  repostPostHandler,
  toggleSavePostHandler,
  deleteCommentHandler

} from "./posts.controller";

const router = Router();

// Create post
router.post(
  "/",
  protect,
  createPostHandler
);

// Feed
router.get(
  "/feed",
  getFeedHandler
);

// Single post
router.get(
  "/:id",
  getPostHandler
);

// Update post
router.patch(
  "/:id",
  protect,
  updatePostHandler
);

// Delete post
router.delete(
  "/:id",
  protect,
  deletePostHandler
);

// Create comment / reply
router.post(
  "/:id/comments",
  protect,
  createCommentHandler
);

// Toggle like/unlike
router.post(
  "/:id/like",
  protect,
  toggleLikeHandler
);

router.post(
  "/:id/save",
  protect,
  toggleSavePostHandler
);

router.post(
  "/:id/repost",
  protect,
  repostPostHandler
);

router.delete(
  "/comments/:commentId",
  protect,
  deleteCommentHandler
);

export default router;
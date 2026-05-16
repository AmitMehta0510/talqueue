import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createCommentHandler,
  createPostHandler,
  getFeedHandler,
  getPostHandler,
  toggleLikeHandler,
} from "./posts.controller";

const router = Router();

router.post("/", protect, createPostHandler);

router.get("/feed", getFeedHandler);

router.get("/:id", getPostHandler);

router.post(
  "/:id/comments",
  protect,
  createCommentHandler
);

router.post(
  "/:id/like",
  protect,
  toggleLikeHandler
);

export default router;
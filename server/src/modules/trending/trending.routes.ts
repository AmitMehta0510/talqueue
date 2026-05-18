import { Router } from "express";

import { protect } from "../auth/auth.middleware";

import {
  getTrendingFeedHandler,
  refreshTrendingHandler,
} from "./trending.controller";

const router = Router();

//
// GET TRENDING FEED
//
router.get("/feed", protect, getTrendingFeedHandler);

//
// MANUAL REFRESH
//
router.post("/refresh", protect, refreshTrendingHandler);

export default router;

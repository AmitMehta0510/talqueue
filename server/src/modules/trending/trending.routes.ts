import { Router } from "express";

import { protect } from "../auth/auth.middleware";

import {
  getTrendingFeedHandler,
  refreshTrendingHandler,
  trackTrendingImpressionHandler,
} from "./trending.controller";

const router = Router();

// GET TRENDING FEED
router.get("/feed", protect, getTrendingFeedHandler);

router.post("/impressions", protect, trackTrendingImpressionHandler);

// MANUAL REFRESH
router.post("/refresh", protect, refreshTrendingHandler);

export default router;

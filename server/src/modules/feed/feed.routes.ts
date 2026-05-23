import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  getPersonalizedFeedHandler,
  trackFeedImpressionHandler,
} from "./feed.controller";

const router = Router();

router.get(
  "/",
  protect,
  getPersonalizedFeedHandler
);

router.post(
  "/impressions",
  protect,
  trackFeedImpressionHandler,
);

export default router;

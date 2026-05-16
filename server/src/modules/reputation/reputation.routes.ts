import { Router }
from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  getLeaderboardHandler,
  getUserReputationHandler,
    getUserReputationByUsernameHandler,

  getMyReputationHistoryHandler,

  getAllBadgesHandler,

  getTopBadgesHandler,
} from "./reputation.controller";

const router = Router();

router.get(
  "/leaderboard",
  getLeaderboardHandler
);

router.get(
  "/me",
  protect,
  getUserReputationHandler
);

router.get(
  "/users/:username",
  getUserReputationByUsernameHandler
);

router.get(
  "/me/history",
  protect,
  getMyReputationHistoryHandler
);

router.get(
  "/badges",
  getAllBadgesHandler
);

router.get(
  "/top-badges",
  getTopBadgesHandler
);

export default router;
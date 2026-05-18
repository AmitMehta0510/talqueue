import { protect } from 'modules/auth/auth.middleware';
import { Router } from "express";

import {
  joinCollegeCommunityHandler,
  getCollegeFeedHandler,
  getCollegeLeaderboardHandler,
  getCollegeMembersHandler,
  createCollegeAnnouncementHandler,
} from "./college-community.controller";

const router = Router();

router.post(
  "/join/:collegeId",
  protect,
  joinCollegeCommunityHandler
);

router.get(
  "/feed/:collegeId",
  protect,
  getCollegeFeedHandler
);

router.get(
  "/leaderboard/:collegeId",
  protect,
  getCollegeLeaderboardHandler
);

router.get(
  "/members/:collegeId",
  protect,
  getCollegeMembersHandler
);

router.post(
  "/announcement/:collegeId",
  protect,
  createCollegeAnnouncementHandler
);

export default router;
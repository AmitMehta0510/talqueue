import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {

  joinCompanyCommunityHandler,

  getCompanyCommunityFeedHandler,

  getVerifiedEmployeesHandler,

  createHiringAlertHandler,

  createReferralDiscussionHandler,

  getCompanyCommunityLeaderboardHandler,

} from "./company-community.controller";

const router = Router();

router.post(
  "/join/:communityId",
  protect,
  joinCompanyCommunityHandler
);

router.get(
  "/feed/:communityId",
  protect ,
  getCompanyCommunityFeedHandler
);

router.get(
  "/verified-employees/:communityId",
  protect,
  getVerifiedEmployeesHandler
);

router.post(
  "/hiring-alert/:communityId",
  protect,
  createHiringAlertHandler
);

router.post(
  "/referral-discussion/:communityId",
  protect,
  createReferralDiscussionHandler
);

router.get(
  "/leaderboard/:communityId",
  protect,
  getCompanyCommunityLeaderboardHandler
);

export default router;
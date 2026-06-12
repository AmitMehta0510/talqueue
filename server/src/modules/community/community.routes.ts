import {
  Router,
} from "express";

import {
  protect,
} from "../auth/auth.middleware";

import {
  createCommunityHandler,
  getCommunityBySlugHandler,
  archiveCommunityHandler,
  getJoinedCommunitiesHandler,
  joinCommunityHandler,
  leaveCommunityHandler,
  getCommunityJoinRequestsHandler,
  reviewCommunityJoinRequestHandler,
} from "./community.controller";

const router =
  Router();

//
// CREATE
//
router.post(
  "/",
  protect,
  createCommunityHandler
);

//
// ME JOINED
//
router.get(
  "/me/joined",
  protect,
  getJoinedCommunitiesHandler
);

//
// GET COMMUNITY BY SLUG
//
router.get(
  "/:slug",
  protect,
  getCommunityBySlugHandler
);

//
// ARCHIVE
//
router.patch(
  "/:communityId/archive",
  protect,
  archiveCommunityHandler
);

//
// JOIN
//
router.post(
  "/:communityId/join",
  protect,
  joinCommunityHandler
);

//
// LEAVE
//
router.post(
  "/:communityId/leave",
  protect,
  leaveCommunityHandler
);

// JOIN REQUESTS
//
router.get(
  "/:slug/join-requests",
  protect,
  getCommunityJoinRequestsHandler
);

router.patch(
  "/:slug/join-requests/:pendingUserId",
  protect,
  reviewCommunityJoinRequestHandler
);

export default router;
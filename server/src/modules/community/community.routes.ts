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

export default router;
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
// GET COMMUNITY
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

export default router;
import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {  getPersonalizedFeedHandler,} from "./feed.controller";

const router = Router();

router.get(
  "/",
  protect,
  getPersonalizedFeedHandler
);

export default router;
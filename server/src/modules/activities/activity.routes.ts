import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  getMyTimelineHandler,
} from "./activity.controller";

const router = Router();

router.get(
  "/me",
  protect,
  getMyTimelineHandler
);

export default router;
import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  trackInteractionHandler,
} from "./interaction-tracking.controller";

const router = Router();

router.post(
  "/track",
  protect,
  trackInteractionHandler
);

export default router;
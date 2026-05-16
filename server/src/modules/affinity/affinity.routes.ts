import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  rebuildMyAffinitiesHandler,
} from "./affinity.controller";

const router = Router();

router.post(
  "/rebuild",
  protect,
  rebuildMyAffinitiesHandler
);

export default router;
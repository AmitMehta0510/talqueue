import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  getRecruiterDashboardHandler,
} from "./recruiter-dashboard.controller";

const router =
  Router();

router.get(
  "/dashboard",
  protect,
  getRecruiterDashboardHandler
);

export default router;
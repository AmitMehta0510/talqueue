import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  getRecruiterDashboardHandler,
  getJobPipelineHandler,
} from "./recruiter-dashboard.controller";

const router =
  Router();

router.get(
  "/dashboard",
  protect,
  getRecruiterDashboardHandler
);

router.get(
  "/jobs/:jobId/pipeline",
  protect,
  getJobPipelineHandler
);

export default router;
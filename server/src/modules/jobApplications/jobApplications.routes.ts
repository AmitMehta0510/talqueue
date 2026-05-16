import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  applyToJobHandler,
  getMyApplicationsHandler,
  getJobApplicationsHandler,
  updateApplicationStatusHandler,
  markApplicationViewedHandler,
} from "./jobApplications.controller";

const router = Router();

router.post(
  "/jobs/:jobId/apply",
  protect,
  applyToJobHandler
);

router.get(
  "/my",
  protect,
  getMyApplicationsHandler
);

router.get(
  "/jobs/:jobId",
  protect,
  getJobApplicationsHandler
);

router.patch(
  "/:applicationId/status",
  protect,
  updateApplicationStatusHandler
);

router.patch(
  "/:applicationId/view",
  protect,
  markApplicationViewedHandler
);

export default router;
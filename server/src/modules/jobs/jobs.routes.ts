import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  createJobHandler,
  getJobsHandler,
  getJobBySlugHandler,
  getCompanyJobsHandler,
  getRecruiterJobsHandler,
} from "./jobs.controller";

const router = Router();

router.post(
  "/",
  protect,
  createJobHandler
);

router.get(
  "/",
  getJobsHandler
);

router.get(
  "/my/jobs",
  protect,
  getRecruiterJobsHandler
);

router.get(
  "/company/:companyId",
  getCompanyJobsHandler
);

router.get(
  "/:slug",
  getJobBySlugHandler
);

export default router;
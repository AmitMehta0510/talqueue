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
  seedJobsHandler,
} from "./jobs.controller";

const router = Router();

router.post(
  "/",
  protect,
  createJobHandler
);

router.post(
  "/seed",
  protect,
  seedJobsHandler
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
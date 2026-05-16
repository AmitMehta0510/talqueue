import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  toggleSaveJobHandler,
  getSavedJobsHandler,
  getRecommendedJobsHandler,
  getTrendingJobsHandler,
  getInternshipRecommendationsHandler,
  getAdvancedRecommendedJobsHandler,

getRecommendedCollaboratorsHandler,

getRecommendedProjectsHandler,
} from "./recommendations.controller";

const router = Router();

router.post(
  "/jobs/:jobId/save",
  protect,
  toggleSaveJobHandler
);

router.get(
  "/saved-jobs",
  protect,
  getSavedJobsHandler
);

router.get(
  "/recommended-jobs",
  protect,
  getRecommendedJobsHandler
);

router.get(
  "/internships",
  protect,
  getInternshipRecommendationsHandler
);

router.get(
  "/trending-jobs",
  getTrendingJobsHandler
);

router.get(
  "/advanced-jobs",
  protect,
  getAdvancedRecommendedJobsHandler
);

router.get(
  "/collaborators",
  protect,
  getRecommendedCollaboratorsHandler
);

router.get(
  "/projects",
  protect,
  getRecommendedProjectsHandler
);

export default router;
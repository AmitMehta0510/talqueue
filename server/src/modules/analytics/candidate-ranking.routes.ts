import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {

  rankJobCandidatesHandler,

  getRecruiterInsightsHandler,

} from "./candidate-ranking.controller";

const router =
  Router();

router.get(
  "/jobs/:jobId/rankings",
  protect,
  rankJobCandidatesHandler
);

router.get(
  "/recruiter-insights",
  protect,
  getRecruiterInsightsHandler
);

export default router;
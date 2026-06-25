import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  getRecruiterDashboardHandler,
  getJobPipelineHandler,
} from "./recruiter-dashboard.controller";

import {
  getMyClaimStatus,
  getMyPostedJobsClaimView,
  updateClaimJobStatus,
  getClaimJobApplications,
  updateClaimApplicationStatus,
} from "./recruiter-claim.controller";

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

// ---------------------------------------------------------------------------
// Recruiter Claim Workspace routes
// ---------------------------------------------------------------------------

/** GET /recruiter/claim/status — status of all claim requests by this recruiter */
router.get("/claim/status", protect, getMyClaimStatus);

/** GET /recruiter/claim/jobs — all jobs posted under the recruiter's claimed company */
router.get("/claim/jobs", protect, getMyPostedJobsClaimView);

/** PATCH /recruiter/claim/jobs/:jobId/status — update job status (OPEN/CLOSED/ARCHIVED) */
router.patch("/claim/jobs/:jobId/status", protect, updateClaimJobStatus);

/** GET /recruiter/claim/jobs/:jobId/applications — paginated application list */
router.get("/claim/jobs/:jobId/applications", protect, getClaimJobApplications);

/** PATCH /recruiter/claim/jobs/:jobId/applications/:appId/status — advance applicant status */
router.patch(
  "/claim/jobs/:jobId/applications/:appId/status",
  protect,
  updateClaimApplicationStatus
);

export default router;
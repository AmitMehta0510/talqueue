import { Router } from "express";

import { protect } from "../auth/auth.middleware";

import { getDiscoveryFeedHandler } from "./discovery.controller";

import {
  getSuggestedEngineersHandler,
  getSuggestedMentorsHandler,
  getSuggestedRecruitersHandler,
  getSuggestedCollaboratorsHandler,
  getSuggestedTeammatesHandler,
} from "./user-recommendation.controller";

import {
  getSuggestedProjectsHandler,
  getSuggestedJobsHandler,
  getSuggestedHackathonsHandler,
  getSuggestedCompaniesHandler,
  getSuggestedPostsHandler,
  getSuggestedCommunitiesHandler,
} from "./content-recommendation.controller";

const router = Router();

// DISCOVERY FEED
router.get("/feed", protect, getDiscoveryFeedHandler);

// USER RECOMMENDATIONS
router.get("/suggested-engineers", protect, getSuggestedEngineersHandler);

router.get("/suggested-mentors", protect, getSuggestedMentorsHandler);

router.get("/suggested-recruiters", protect, getSuggestedRecruitersHandler);

router.get(
  "/suggested-collaborators",
  protect,
  getSuggestedCollaboratorsHandler,
);

router.get("/suggested-teammates", protect, getSuggestedTeammatesHandler);

//
// CONTENT RECOMMENDATIONS
//
router.get("/suggested-projects", protect, getSuggestedProjectsHandler);

router.get("/suggested-jobs", protect, getSuggestedJobsHandler);

router.get("/suggested-hackathons", protect, getSuggestedHackathonsHandler);

router.get("/suggested-companies", protect, getSuggestedCompaniesHandler);

router.get("/suggested-posts", protect, getSuggestedPostsHandler);

router.get("/suggested-communities", protect, getSuggestedCommunitiesHandler);

export default router;

import { Router } from "express";
import { protect } from "../auth/auth.middleware";

import {
  globalSearchHandler,
  searchUsersHandler,
  searchProjectsHandler,
  searchHackathonsHandler,
  searchJobsHandler,
  searchCompaniesHandler,
  searchCommunitiesHandler,
} from "./search.controller";

const router = Router();

router.get("/global", globalSearchHandler);
router.get("/users", searchUsersHandler);
router.get("/projects", searchProjectsHandler);
router.get("/hackathons", searchHackathonsHandler);
router.get("/jobs", searchJobsHandler);
router.get("/companies", searchCompaniesHandler);
router.get("/communities", searchCommunitiesHandler);

export default router;
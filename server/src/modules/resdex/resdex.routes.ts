import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";
import { resdexSearchHandler } from "./resdex.controller";

const router = Router();

/**
 * POST /api/v1/resdex/search
 * Requires authentication (recruiter-facing endpoint).
 * Body: ResdexSearchFilters (skills[], minCgpa, graduationYear, collegeName, companyName, query, size, from)
 */
router.post("/search", protect, resdexSearchHandler);

export default router;

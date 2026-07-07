import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";
import { resdexSearchHandler, nlSearchHandler } from "./resdex.controller";

const router = Router();

/**
 * POST /api/v1/resdex/search
 * Structured filter search — recruiter-facing, auth required.
 */
router.post("/search", protect, resdexSearchHandler);

/**
 * POST /api/v1/resdex/nl-search
 * Natural language search — converts free English text to Elasticsearch filters.
 */
router.post("/nl-search", protect, nlSearchHandler);

export default router;

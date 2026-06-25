import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import {
  claimInitiateHandler,
  claimVerifyHandler,
} from "./growth-loops.controller";

const router = Router();

/**
 * POST /api/companies/claim/initiate
 * Step 1: Validate business email domain against company's emailDomains[] and
 *         generate a Redis-backed OTP (10-min TTL).
 */
router.post("/claim/initiate", protect, claimInitiateHandler);

/**
 * POST /api/companies/claim/verify
 * Step 2: Verify the OTP, consume it (single-use), and create a CompanyRequest
 *         (COMPANY_CLAIM) for admin review.
 */
router.post("/claim/verify", protect, claimVerifyHandler);

export default router;

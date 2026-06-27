import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import {
  claimInitiateHandler,
  claimVerifyHandler,
  tpoClaimInitiateHandler,
  tpoClaimVerifyHandler,
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

/**
 * POST /api/companies/tpo/claim/initiate
 * Step 1 (TPO): Validate official email domain as institutional, generate OTP.
 */
router.post("/tpo/claim/initiate", protect, tpoClaimInitiateHandler);

/**
 * POST /api/companies/tpo/claim/verify
 * Step 2 (TPO): Verify OTP and create CollegeRequest for admin review.
 */
router.post("/tpo/claim/verify", protect, tpoClaimVerifyHandler);

export default router;

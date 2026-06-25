import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { tpoOnboardCollegeHandler } from "./growth-loops.controller";

const router = Router();

/**
 * POST /api/tpo/onboard-college
 * Institutional onboarding endpoint for Training & Placement Officers.
 *
 * Creates a CollegeRequest (status: PENDING) tied to the authenticated user,
 * and notifies platform super-admins for manual review and approval.
 *
 * Required body fields:
 *  - collegeName:      string (min 3 chars)
 *  - officialEmail:    string (valid email — institutional contact)
 *
 * Optional body fields:
 *  - city, state, country, website
 *  - aisheCode:               AISHE code for the institution
 *  - authorityLetterheadDoc:  S3 URL of authority letterhead upload
 */
router.post("/onboard-college", protect, tpoOnboardCollegeHandler);

export default router;

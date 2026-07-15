import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import {
  requireTpoRole,
  getTpoDashboardStats,
  getTpoStudents,
  getTpoPlacements,
  getTpoAlumniVerifications,
  approveAlumniVerification,
  rejectAlumniVerification,
  getTpoCompanyClaims,
  getTpoRecruiterInteractions,
  // Feature 2: Bulk student upload
  bulkUploadStudents,
  // Feature 4: Placement reports
  getPlacementReport,
  getTpoPlacementStats,
  // Feature 5: CDCR management
  listCdcrMembers,
  addCdcrMember,
  removeCdcrMember,
} from "./tpo-dashboard.controller";

const router = Router();

// All TPO routes require authentication + TPO role on at least one college
router.use(protect, requireTpoRole);

// ──────────────────────────────────────────────────────────────────────────────
// OVERVIEW
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/tpo/dashboard/stats — overview stat counts */
router.get("/dashboard/stats", getTpoDashboardStats);

// ──────────────────────────────────────────────────────────────────────────────
// STUDENTS
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/tpo/dashboard/students — paginated student list */
router.get("/dashboard/students", getTpoStudents);

/**
 * POST /api/v1/tpo/dashboard/students/bulk-upload
 * Body: raw CSV (text/plain) OR JSON { csv: "..." }
 * Columns: email, rollNumber, cgpa, backlogs, currentYear, branchName
 */
router.post("/dashboard/students/bulk-upload", bulkUploadStudents);

// ──────────────────────────────────────────────────────────────────────────────
// PLACEMENTS
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/tpo/dashboard/placements — active placement drives */
router.get("/dashboard/placements", getTpoPlacements);

/**
 * GET /api/v1/tpo/dashboard/stats/placements
 * Full analytics stats (branch-wise, company-wise, summary).
 * Query: academicYear (e.g. 2024)
 */
router.get("/dashboard/stats/placements", getTpoPlacementStats);

// ──────────────────────────────────────────────────────────────────────────────
// PLACEMENT REPORTS (Feature 4)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/tpo/dashboard/reports/placement
 * Generates and streams placement data report.
 * Query: academicYear (e.g. 2024), format ("csv" | "pdf")
 */
router.get("/dashboard/reports/placement", getPlacementReport);

// ──────────────────────────────────────────────────────────────────────────────
// ALUMNI
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/tpo/dashboard/alumni — pending alumni verification requests */
router.get("/dashboard/alumni", getTpoAlumniVerifications);

/** PATCH /api/v1/tpo/dashboard/alumni/:educationId/approve */
router.patch("/dashboard/alumni/:educationId/approve", approveAlumniVerification);

/** PATCH /api/v1/tpo/dashboard/alumni/:educationId/reject */
router.patch("/dashboard/alumni/:educationId/reject", rejectAlumniVerification);

// ──────────────────────────────────────────────────────────────────────────────
// COMPANY CLAIMS & RECRUITERS
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/tpo/dashboard/company-claims */
router.get("/dashboard/company-claims", getTpoCompanyClaims);

/** GET /api/v1/tpo/dashboard/recruiters */
router.get("/dashboard/recruiters", getTpoRecruiterInteractions);

// ──────────────────────────────────────────────────────────────────────────────
// CDCR MANAGEMENT (Feature 5)
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/tpo/dashboard/cdcr — list all CDCR members */
router.get("/dashboard/cdcr", listCdcrMembers);

/** POST /api/v1/tpo/dashboard/cdcr — add CDCR member. Body: { userId?, email? } */
router.post("/dashboard/cdcr", addCdcrMember);

/** DELETE /api/v1/tpo/dashboard/cdcr/:memberId — remove CDCR member */
router.delete("/dashboard/cdcr/:memberId", removeCdcrMember);

export default router;

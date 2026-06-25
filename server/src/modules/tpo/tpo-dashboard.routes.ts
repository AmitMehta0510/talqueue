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
} from "./tpo-dashboard.controller";

const router = Router();

// All TPO routes require authentication + TPO role on at least one college
router.use(protect, requireTpoRole);

/**
 * GET /api/v1/tpo/dashboard/stats
 * Overview stat counts for the TPO's college(s).
 */
router.get("/dashboard/stats", getTpoDashboardStats);

/**
 * GET /api/v1/tpo/dashboard/students
 * Paginated, filterable student list.
 * Query: page, limit, graduationYear, departmentId, currentYear, search
 */
router.get("/dashboard/students", getTpoStudents);

/**
 * GET /api/v1/tpo/dashboard/placements
 * Active placement drives for the TPO's college.
 */
router.get("/dashboard/placements", getTpoPlacements);

/**
 * GET /api/v1/tpo/dashboard/alumni
 * Pending alumni verification requests (isAlumni=true, alumniVerified=false).
 */
router.get("/dashboard/alumni", getTpoAlumniVerifications);

/**
 * PATCH /api/v1/tpo/dashboard/alumni/:educationId/approve
 * Approve an alumni claim — sets alumniVerified=true, sends student notification.
 */
router.patch("/dashboard/alumni/:educationId/approve", approveAlumniVerification);

/**
 * PATCH /api/v1/tpo/dashboard/alumni/:educationId/reject
 * Reject an alumni claim — resets isAlumni=false, sends student notification.
 */
router.patch("/dashboard/alumni/:educationId/reject", rejectAlumniVerification);

/**
 * GET /api/v1/tpo/dashboard/company-claims
 * Company claim requests linked to the TPO's college drives.
 */
router.get("/dashboard/company-claims", getTpoCompanyClaims);

/**
 * GET /api/v1/tpo/dashboard/recruiters
 * Recruiters (CompanyAdmin users) from companies that have interacted with the TPO's colleges.
 */
router.get("/dashboard/recruiters", getTpoRecruiterInteractions);

export default router;

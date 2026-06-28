import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";
import { requireCollegeAdmin } from "shared/middleware/requireCollegeAdmin";
import { requireCdcrAccess } from "shared/middleware/requireCdcrAccess";

import {
  createCollegeHandler,
  createDepartmentHandler,
  getCollegesHandler,
  getCollegeHandler,
  getDepartmentsHandler,
  searchCollegesHandler,
  importCollegesHandler,
  getStandardDepartmentsHandler,
  deleteCollegeHandler,
  listCdcrMembersHandler,
  assignCdcrMemberHandler,
  removeCdcrMemberHandler,
  searchCollegeStudentsHandler,
  claimAlumniStatusHandler,
  getPendingAlumniClaimsHandler,
  approveAlumniClaimHandler,
  rejectAlumniClaimHandler,
  // Institutional B2B
  submitCollegeOnboardingHandler,
  assignOrRemoveInstitutionalStaffHandler,
  assignCellRepresentativesHandler,
  getCollegePlacementSummaryHandler,
} from "./colleges.controller";
import prisma from "shared/database/prisma";

const router = Router();

router.param("collegeId", async (req: any, res, next, collegeId) => {
  if (collegeId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collegeId);
    if (!isUuid) {
      const college = await prisma.college.findUnique({
        where: { normalizedKey: collegeId },
        select: { id: true },
      });
      if (college) {
        req.params.collegeId = college.id;
      }
    }
  }
  next();
});

router.post(
  "/",
  protect,
  createCollegeHandler
);

router.post(
  "/import",
  protect,
  importCollegesHandler
);

router.get("/", getCollegesHandler);

router.get("/search", searchCollegesHandler);

router.post(
  "/departments",
  protect,
  createDepartmentHandler
);

router.get(
  "/standard-departments",
  getStandardDepartmentsHandler
);

router.get("/:collegeId", getCollegeHandler);

// Public placement summary — no auth required
router.get("/:collegeId/placement-summary", getCollegePlacementSummaryHandler);

router.get(
  "/:collegeId/departments",
  getDepartmentsHandler
);

router.delete(
  "/:collegeId",
  protect,
  deleteCollegeHandler
);

// TPO Admin CDCR management routes
// Listing CDCR members: CDCR+ can view
router.get(
  "/:collegeId/tpo/cdcr",
  protect,
  requireCdcrAccess,
  listCdcrMembersHandler
);

// Assigning CDCR: CollegeAdmin only
router.post(
  "/:collegeId/tpo/cdcr",
  protect,
  requireCollegeAdmin,
  assignCdcrMemberHandler
);

// Removing CDCR: CollegeAdmin only
router.delete(
  "/:collegeId/tpo/cdcr/:userId",
  protect,
  requireCollegeAdmin,
  removeCdcrMemberHandler
);

// Student search: CDCR+ can view
router.get(
  "/:collegeId/tpo/students",
  protect,
  requireCdcrAccess,
  searchCollegeStudentsHandler
);

// Alumni claim: anyone authenticated
router.post(
  "/:collegeId/alumni-claim",
  protect,
  claimAlumniStatusHandler
);

// Pending alumni list and approve/reject: CDCR+ can view and action
router.get(
  "/:collegeId/alumni-claims",
  protect,
  requireCdcrAccess,
  getPendingAlumniClaimsHandler
);

router.post(
  "/:collegeId/alumni-claims/:educationId/approve",
  protect,
  requireCdcrAccess,
  approveAlumniClaimHandler
);

router.post(
  "/:collegeId/alumni-claims/:educationId/reject",
  protect,
  requireCdcrAccess,
  rejectAlumniClaimHandler
);

// ============================================================
// INSTITUTIONAL B2B — ONBOARDING
// ============================================================

/**
 * POST /colleges/onboarding
 * Submit an institutional college onboarding request.
 * Auth: any authenticated user. Token-verified.
 */
router.post(
  "/onboarding",
  protect,
  submitCollegeOnboardingHandler
);

// ============================================================
// INSTITUTIONAL B2B — STAFF GOVERNANCE
// ============================================================

/**
 * POST   /colleges/:collegeId/staff  — assign TPO or HOD
 * DELETE /colleges/:collegeId/staff  — remove TPO or HOD
 * Auth: must be the verified master CollegeAdmin (college.masterAdminUserId).
 */
router.post(
  "/:collegeId/staff",
  protect,
  assignOrRemoveInstitutionalStaffHandler
);

router.delete(
  "/:collegeId/staff",
  protect,
  assignOrRemoveInstitutionalStaffHandler
);

// ============================================================
// INSTITUTIONAL B2B — CDCR MANAGEMENT (SCOPED)
// ============================================================

/**
 * POST   /colleges/:collegeId/cdcr         — assign CDCR representative
 * DELETE /colleges/:collegeId/cdcr/:userId — remove CDCR representative
 *
 * Auth: TPO (college-wide) or HOD (dept-scoped) or master CollegeAdmin.
 * Optional query param `departmentId` on DELETE to scope the removal.
 *
 * Note: The legacy /:collegeId/tpo/cdcr routes (using requireCollegeAdmin) are
 * preserved below for backward compatibility with existing clients.
 */
router.post(
  "/:collegeId/cdcr",
  protect,
  assignCellRepresentativesHandler
);

router.delete(
  "/:collegeId/cdcr/:userId",
  protect,
  assignCellRepresentativesHandler
);

export default router;

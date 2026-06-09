import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { requirePlatformAdmin } from "shared/middleware/requirePlatformAdmin";

import {
  assignCollegeAdminHandler,
  removeCollegeAdminHandler,
  listCollegeAdminsHandler,
  assignCompanyAdminHandler,
  removeCompanyAdminHandler,
  listCompanyAdminsHandler,
  getAdminStatsHandler,
  listUsersHandler,
  updateUserStatusHandler,
  assignPlatformAdminHandler,
  removePlatformAdminHandler,
} from "./admin.controller";

const router = Router();

// All admin routes require authentication + platform admin role
router.use(protect, requirePlatformAdmin);

// ============================================================
// GENERAL PLATFORM ADMIN ROUTES
// ============================================================

router.get("/stats", getAdminStatsHandler);

router.get("/users", listUsersHandler);

router.patch("/users/:userId/status", updateUserStatusHandler);

router.post("/users/:userId/platform-admin", assignPlatformAdminHandler);

router.delete("/users/:userId/platform-admin", removePlatformAdminHandler);

// ============================================================
// COLLEGE ADMIN ROUTES
// POST   /admin/colleges/:collegeId/admins          → assign a college admin
// DELETE /admin/colleges/:collegeId/admins/:userId  → remove a college admin
// GET    /admin/colleges/:collegeId/admins          → list all admins of a college
// ============================================================

router.post("/colleges/:collegeId/admins", assignCollegeAdminHandler);

router.delete("/colleges/:collegeId/admins/:userId", removeCollegeAdminHandler);

router.get("/colleges/:collegeId/admins", listCollegeAdminsHandler);

// ============================================================
// COMPANY ADMIN ROUTES
// POST   /admin/companies/:companyId/admins          → assign a company admin
// DELETE /admin/companies/:companyId/admins/:userId  → remove a company admin (?officeCity=...)
// GET    /admin/companies/:companyId/admins          → list all admins of a company
// ============================================================

router.post("/companies/:companyId/admins", assignCompanyAdminHandler);

router.delete("/companies/:companyId/admins/:userId", removeCompanyAdminHandler);

router.get("/companies/:companyId/admins", listCompanyAdminsHandler);

export default router;

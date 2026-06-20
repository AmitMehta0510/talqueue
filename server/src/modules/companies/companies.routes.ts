import { Router }
from "express";

import { protect, optionalProtect }
from "modules/auth/auth.middleware";

import { requireCompanyGlobalAdmin }
from "./company-admin.middleware";

import {
  createCompanyHandler,
  getCompaniesHandler,
  getCompanyBySlugHandler,
  getCompanyEmployeesHandler,
  seedCompaniesHandler,
  getCompanyReferrersHandler,
  requestCompanyRegistrationHandler,
  followCompanyHandler,
  unfollowCompanyHandler,
  getCompanyAdminStatsHandler,
  listCompanyAdminsForDashboardHandler,
  assignCompanyAdminFromDashboardHandler,
  removeCompanyAdminFromDashboardHandler,
  listCompanyRecruitersHandler,
  assignCompanyRecruiterHandler,
  removeCompanyRecruiterHandler,
  listDiscoveredCompaniesHandler,
  bulkReviewDiscoveredCompaniesHandler,
} from "./companies.controller";

const router = Router();

router.post(
  "/",
  protect,
  createCompanyHandler
);

router.post(
  "/seed",
  protect,
  seedCompaniesHandler
);

router.post(
  "/request",
  protect,
  requestCompanyRegistrationHandler
);

router.post(
  "/:companyId/follow",
  protect,
  followCompanyHandler
);

router.post(
  "/:companyId/unfollow",
  protect,
  unfollowCompanyHandler
);

router.get(
  "/",
  getCompaniesHandler
);

router.get(
  "/:slug",
  optionalProtect,
  getCompanyBySlugHandler
);

router.get(
  "/:companyId/employees",
  getCompanyEmployeesHandler
);

router.get(
  "/:companyId/referrers",
  protect,
  getCompanyReferrersHandler
);

// ── Company Global Admin Dashboard Routes ──
router.get(
  "/:companyId/admin-dashboard/stats",
  protect,
  requireCompanyGlobalAdmin,
  getCompanyAdminStatsHandler
);

router.get(
  "/:companyId/admin-dashboard/admins",
  protect,
  requireCompanyGlobalAdmin,
  listCompanyAdminsForDashboardHandler
);

router.post(
  "/:companyId/admin-dashboard/admins",
  protect,
  requireCompanyGlobalAdmin,
  assignCompanyAdminFromDashboardHandler
);

router.delete(
  "/:companyId/admin-dashboard/admins/:userId",
  protect,
  requireCompanyGlobalAdmin,
  removeCompanyAdminFromDashboardHandler
);

router.get(
  "/:companyId/admin-dashboard/recruiters",
  protect,
  requireCompanyGlobalAdmin,
  listCompanyRecruitersHandler
);

router.post(
  "/:companyId/admin-dashboard/recruiters",
  protect,
  requireCompanyGlobalAdmin,
  assignCompanyRecruiterHandler
);

router.delete(
  "/:companyId/admin-dashboard/recruiters/:userId",
  protect,
  requireCompanyGlobalAdmin,
  removeCompanyRecruiterHandler
);

// ── Platform Admin: Discovered Company Moderation ──
// GET  /companies/discovered         — list auto-discovered, unverified companies
// POST /companies/discovered/review  — bulk verify or reject discovered companies
router.get(
  "/discovered",
  protect,
  listDiscoveredCompaniesHandler
);

router.post(
  "/discovered/review",
  protect,
  bulkReviewDiscoveredCompaniesHandler
);

export default router;
import { Router } from "express";
import { protect, protect as isAuthenticated } from "modules/auth/auth.middleware";
import { requirePlatformAdmin, requirePlatformAdmin as isAdminOrSuperAdmin } from "shared/middleware/requirePlatformAdmin";
import { requireSuperAdmin } from "shared/middleware/requireSuperAdmin";
import { scraperAuthMiddleware } from "shared/middleware/scraper-auth.middleware";

import {
  assignCollegeAdminHandler,
  removeCollegeAdminHandler,
  listCollegeAdminsHandler,
  assignCompanyAdminHandler,
  removeCompanyAdminHandler,
  listCompanyAdminsHandler,
  getAdminStatsHandler,
  listUsersHandler,
  getUserDetailHandler,
  updateUserStatusHandler,
  assignPlatformAdminHandler,
  removePlatformAdminHandler,
  adminListPostsHandler,
  adminDeletePostHandler,
  adminListHackathonsHandler,
  adminUpdateHackathonStatusHandler,
  adminUpdateHackathonHandler,
  adminListProjectsHandler,
  adminUpdateProjectStatusHandler,
   adminListJobsHandler,
  adminDeleteJobHandler,
  adminUpdateJobHandler,
  adminCreateJobHandler,
  adminListCommunitiesHandler,
  adminUpdateCommunityHandler,
  adminListReferralsHandler,
  adminCreateDepartmentHandler,
  adminListDepartmentsHandler,
  adminListCompanyRequestsHandler,
  adminApproveCompanyRequestHandler,
  adminRejectCompanyRequestHandler,
  adminTriggerScraperHandler,
  adminTriggerJobScraperHandler,
  adminTriggerCompanyDiscoveryHandler,
  reviewBusinessRequestHandler,
  // College Request B2B
  listCollegeRequestsHandler,
  getCollegeRequestHandler,
  reviewCollegeRequestHandler,
} from "./admin.controller";

import { getAdminDashboardAnalyticsHandler } from "./admin-analytics.controller";
import {
  getEventsHandler,
  getEventAttendeesHandler,
  updateEventHandler,
  deleteEventHandler,
} from "modules/events/events.controller";

const router = Router();

// ============================================================
// SERVERLESS CRON / TRIGGER ENDPOINTS (Protected via Scraper Cron Key or platform admin session)
// ============================================================
router.post("/scraper/run", scraperAuthMiddleware, adminTriggerScraperHandler);
router.post("/scraper/jobs", scraperAuthMiddleware, adminTriggerJobScraperHandler);
router.post("/scraper/companies-discovery", scraperAuthMiddleware, adminTriggerCompanyDiscoveryHandler);

// All other admin routes require authentication + platform admin role
router.use(protect, requirePlatformAdmin);

// ============================================================
// GENERAL PLATFORM ADMIN ROUTES
// ============================================================

router.get("/stats", getAdminStatsHandler);

// Analytics dashboard (SUPER_ADMIN | PLATFORM_ADMIN only — enforced in controller)
router.get("/analytics/dashboard", getAdminDashboardAnalyticsHandler);

router.get("/users", listUsersHandler);
router.get("/users/:userId", getUserDetailHandler);
router.patch("/users/:userId/status", updateUserStatusHandler);
// ⬇ Super-admin only: granting/revoking platform admin is a privileged escalation action
router.post("/users/:userId/platform-admin", requireSuperAdmin, assignPlatformAdminHandler);
router.delete("/users/:userId/platform-admin", requireSuperAdmin, removePlatformAdminHandler);

// ============================================================
// COLLEGE ADMIN ROUTES
// ============================================================

router.post("/colleges/:collegeId/admins", assignCollegeAdminHandler);
router.delete("/colleges/:collegeId/admins/:userId", removeCollegeAdminHandler);
router.get("/colleges/:collegeId/admins", listCollegeAdminsHandler);

// Department management (accessible by platform admins AND college admins)
router.post("/colleges/:collegeId/departments", adminCreateDepartmentHandler);
router.get("/colleges/:collegeId/departments", adminListDepartmentsHandler);

// ============================================================
// COMPANY ADMIN ROUTES
// ============================================================

router.post("/companies/:companyId/admins", assignCompanyAdminHandler);
router.delete("/companies/:companyId/admins/:userId", removeCompanyAdminHandler);
router.get("/companies/:companyId/admins", listCompanyAdminsHandler);

// ============================================================
// CONTENT MODERATION ROUTES
// ============================================================

// Posts
router.get("/content/posts", adminListPostsHandler);
router.delete("/content/posts/:postId", adminDeletePostHandler);

// Hackathons
router.get("/content/hackathons", adminListHackathonsHandler);
router.patch("/content/hackathons/:hackathonId/status", adminUpdateHackathonStatusHandler);
router.patch("/content/hackathons/:hackathonId", adminUpdateHackathonHandler);

// Projects
router.get("/content/projects", adminListProjectsHandler);
router.patch("/content/projects/:projectId/status", adminUpdateProjectStatusHandler);

// Jobs
router.get("/content/jobs", adminListJobsHandler);
router.post("/content/jobs", adminCreateJobHandler);
router.patch("/content/jobs/:jobId", adminUpdateJobHandler);
router.delete("/content/jobs/:jobId", adminDeleteJobHandler);

// Communities
router.get("/content/communities", adminListCommunitiesHandler);
router.patch("/content/communities/:communityId", adminUpdateCommunityHandler);

// Referrals
router.get("/content/referrals", adminListReferralsHandler);

// Events
router.get("/events", isAuthenticated, isAdminOrSuperAdmin, getEventsHandler);
router.get("/events/:id/attendees", isAuthenticated, isAdminOrSuperAdmin, getEventAttendeesHandler);
router.put("/events/:id", isAuthenticated, isAdminOrSuperAdmin, updateEventHandler);
router.delete("/events/:id", isAuthenticated, isAdminOrSuperAdmin, deleteEventHandler);

// ============================================================
// COMPANY REQUESTS (recruiter-submitted, pending admin approval)
// ============================================================

router.get("/company-requests", adminListCompanyRequestsHandler);
router.post("/company-requests/:requestId/approve", adminApproveCompanyRequestHandler);
router.post("/company-requests/:requestId/reject", adminRejectCompanyRequestHandler);
router.post("/company-requests/:requestId/review", reviewBusinessRequestHandler);

// ============================================================
// COLLEGE REQUESTS (institutional B2B onboarding, pending admin review)
// ============================================================

router.get("/college-requests", listCollegeRequestsHandler);
router.get("/college-requests/:requestId", getCollegeRequestHandler);
router.post("/college-requests/:requestId/review", reviewCollegeRequestHandler);

export default router;

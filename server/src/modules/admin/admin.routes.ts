import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { requirePlatformAdmin } from "shared/middleware/requirePlatformAdmin";
import { requireSuperAdmin } from "shared/middleware/requireSuperAdmin";

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
  adminListCommunitiesHandler,
  adminUpdateCommunityHandler,
  adminListReferralsHandler,
  adminCreateDepartmentHandler,
  adminListDepartmentsHandler,
  adminListCompanyRequestsHandler,
  adminApproveCompanyRequestHandler,
  adminRejectCompanyRequestHandler,
  adminTriggerScraperHandler,
} from "./admin.controller";

const router = Router();

// All admin routes require authentication + platform admin role
router.use(protect, requirePlatformAdmin);

// ============================================================
// GENERAL PLATFORM ADMIN ROUTES
// ============================================================

router.get("/stats", getAdminStatsHandler);

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
router.post("/scraper/run", adminTriggerScraperHandler);

// Projects
router.get("/content/projects", adminListProjectsHandler);
router.patch("/content/projects/:projectId/status", adminUpdateProjectStatusHandler);

// Jobs
router.get("/content/jobs", adminListJobsHandler);
router.delete("/content/jobs/:jobId", adminDeleteJobHandler);

// Communities
router.get("/content/communities", adminListCommunitiesHandler);
router.patch("/content/communities/:communityId", adminUpdateCommunityHandler);

// Referrals
router.get("/content/referrals", adminListReferralsHandler);

// ============================================================
// COMPANY REQUESTS (recruiter-submitted, pending admin approval)
// ============================================================

router.get("/company-requests", adminListCompanyRequestsHandler);
router.post("/company-requests/:requestId/approve", adminApproveCompanyRequestHandler);
router.post("/company-requests/:requestId/reject", adminRejectCompanyRequestHandler);

export default router;

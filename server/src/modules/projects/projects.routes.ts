import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createProjectHandler,
  getProjectHandler,
  getProjectsHandler,
  joinProjectHandler,
  getProjectJoinRequestsHandler,
  reviewJoinRequestHandler,
  withdrawJoinRequestHandler,
  inviteUserToProjectHandler,
  reviewProjectInviteHandler,
  leaveProjectHandler,
  removeProjectMemberHandler,
  receivedProjectInvitesHandler,
  sentProjectInvitesHandler,
  completeProjectHandler,
  archiveProjectHandler,
  restoreProjectHandler,
  deleteProjectHandler,
  updateProjectHandler,
  syncGithubProjectHandler
} from "./projects.controller";

const router = Router();

router.post(
  "/",
  protect,
  createProjectHandler
);

router.get(
  "/",
  getProjectsHandler
);

router.get(
  "/:id",
  getProjectHandler
);

router.post(
  "/:id/join",
  protect,
  joinProjectHandler
);

router.get(
  "/:id/requests",
  protect,
  getProjectJoinRequestsHandler
);

router.patch(
  "/requests/:requestId/review",
  protect,
  reviewJoinRequestHandler
);

router.patch(
  "/requests/:requestId/withdraw",
  protect,
  withdrawJoinRequestHandler
);

router.post(
  "/:projectId/invite/:userId",
  protect,
  inviteUserToProjectHandler
);

router.patch(
  "/invites/:inviteId/review",
  protect,
  reviewProjectInviteHandler
);

router.delete(
  "/:projectId/leave",
  protect,
  leaveProjectHandler
);

router.delete(
  "/:projectId/members/:memberId",
  protect,
  removeProjectMemberHandler
);

router.get(
  "/invites/received",
  protect,
  receivedProjectInvitesHandler
);

router.get(
  "/:projectId/invites",
  protect,
  sentProjectInvitesHandler
);

router.patch(
  "/:id/complete",
  protect,
  completeProjectHandler
);

router.patch(
  "/:id/archive",
  protect,
  archiveProjectHandler
);

router.patch(
  "/:id/restore",
  protect,
  restoreProjectHandler
);

router.delete(
  "/:id",
  protect,
  deleteProjectHandler
);

router.patch(
  "/:projectId",
  protect,
  updateProjectHandler
);

router.post(
  "/:projectId/sync-github",
  protect,
  syncGithubProjectHandler
);

export default router;
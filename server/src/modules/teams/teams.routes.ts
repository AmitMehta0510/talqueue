import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createTeamHandler,
  getMyTeamsHandler,
  getTeamHandler,
  inviteMemberHandler,
  reviewInviteHandler,
  withdrawInviteHandler,
  removeMemberHandler,
  leaveTeamHandler,
  deleteTeamHandler
} from "./teams.controller";

const router = Router();

router.post(
  "/",
  protect,
  createTeamHandler
);

router.get(
  "/me",
  protect,
  getMyTeamsHandler
);

router.get(
  "/:id",
  protect,
  getTeamHandler
);

router.post(
  "/:id/invite",
  protect,
  inviteMemberHandler
);

router.patch(
  "/invites/:inviteId/review",
  protect,
  reviewInviteHandler
);

router.patch(
  "/invites/:inviteId/withdraw",
  protect,
  withdrawInviteHandler
);

router.delete(
  "/:teamId/members/:memberUserId",
  protect,
  removeMemberHandler
);

router.delete(
  "/:teamId/leave",
  protect,
  leaveTeamHandler
);
router.delete(
  "/:teamId/delete",
  protect,
  deleteTeamHandler
);

export default router;
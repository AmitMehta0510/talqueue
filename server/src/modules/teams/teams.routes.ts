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
  deleteTeamHandler,
  archiveTeamHandler,
  restoreTeamHandler,
  updateTeamHandler,
  promoteMemberHandler,
  getMyPendingInvitesHandler,
} from "./teams.controller";

const router = Router();

// ── List & Create ─────────────────────────────────────────────────────────────
router.post("/", protect, createTeamHandler);
router.get("/me", protect, getMyTeamsHandler);

// ── Pending invites for current user ─────────────────────────────────────────
router.get("/invites/pending", protect, getMyPendingInvitesHandler);

// ── Invite management ─────────────────────────────────────────────────────────
router.patch("/invites/:inviteId/review", protect, reviewInviteHandler);
router.patch("/invites/:inviteId/withdraw", protect, withdrawInviteHandler);

// ── Single team ───────────────────────────────────────────────────────────────
router.get("/:id", protect, getTeamHandler);
router.post("/:id/invite", protect, inviteMemberHandler);

// ── Team mutations (owner/admin) ──────────────────────────────────────────────
router.patch("/:teamId/update", protect, updateTeamHandler);
router.patch("/:teamId/archive", protect, archiveTeamHandler);
router.patch("/:teamId/restore", protect, restoreTeamHandler);

// ── Member management ─────────────────────────────────────────────────────────
router.delete("/:teamId/leave", protect, leaveTeamHandler);
router.delete("/:teamId/delete", protect, deleteTeamHandler);
router.delete("/:teamId/members/:memberUserId", protect, removeMemberHandler);
router.patch("/:teamId/members/:memberUserId/role", protect, promoteMemberHandler);

export default router;
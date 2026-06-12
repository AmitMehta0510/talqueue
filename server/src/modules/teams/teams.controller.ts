import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  createTeam,
  getMyTeams,
  getTeamById,
  inviteMember,
  reviewInvite,
  withdrawInvite,
  removeTeamMember,
  leaveTeam,
  deleteTeam,
  archiveTeam,
  restoreTeam,
  updateTeam,
  promoteMember,
  getMyPendingInvites,
} from "./teams.service";

import {
  createTeamSchema,
  inviteMemberSchema,
  reviewInviteSchema,
  updateTeamSchema,
  promoteMemberSchema,
} from "./teams.validation";

export const createTeamHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = createTeamSchema.parse(req.body);
    const team = await createTeam(req.user.id, validatedData);
    res.status(201).json(successResponse(team, "Team created"));
  }
);

export const getMyTeamsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const teams = await getMyTeams(req.user.id);
    res.json(successResponse(teams));
  }
);

export const getTeamHandler = asyncHandler(
  async (req: any, res: Response) => {
    const team = await getTeamById(req.user?.id, req.params.id);
    res.json(successResponse(team));
  }
);

export const inviteMemberHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = inviteMemberSchema.parse(req.body);
    const invite = await inviteMember(req.user.id, req.params.id, validatedData);
    res.status(201).json(successResponse(invite, "Invite sent"));
  }
);

export const reviewInviteHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = reviewInviteSchema.parse(req.body);
    const result = await reviewInvite(req.user.id, req.params.inviteId, validatedData.status);
    res.json(successResponse(result, "Invite reviewed"));
  }
);

export const withdrawInviteHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await withdrawInvite(req.user.id, req.params.inviteId);
    res.json(successResponse(result, "Invite withdrawn"));
  }
);

export const removeMemberHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await removeTeamMember(req.user.id, req.params.teamId, req.params.memberUserId);
    res.json(successResponse(result, "Member removed"));
  }
);

export const leaveTeamHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await leaveTeam(req.user.id, req.params.teamId);
    res.json(successResponse(result, "Left team successfully"));
  }
);

export const deleteTeamHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await deleteTeam(req.user.id, req.params.teamId);
    res.json(successResponse(result, "Team deleted successfully"));
  }
);

export const archiveTeamHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await archiveTeam(req.user.id, req.params.teamId);
    res.json(successResponse(result, "Team archived successfully"));
  }
);

export const restoreTeamHandler = asyncHandler(
  async (req: any, res: Response) => {
    const result = await restoreTeam(req.user.id, req.params.teamId);
    res.json(successResponse(result, "Team restored successfully"));
  }
);

export const updateTeamHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = updateTeamSchema.parse(req.body);
    const team = await updateTeam(req.user.id, req.params.teamId, validatedData);
    res.json(successResponse(team, "Team updated"));
  }
);

export const promoteMemberHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { role } = promoteMemberSchema.parse(req.body);
    const result = await promoteMember(
      req.user.id,
      req.params.teamId,
      req.params.memberUserId,
      role,
    );
    res.json(successResponse(result, "Member role updated"));
  }
);

export const getMyPendingInvitesHandler = asyncHandler(
  async (req: any, res: Response) => {
    const invites = await getMyPendingInvites(req.user.id);
    res.json(successResponse(invites));
  }
);
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
  deleteTeam
} from "./teams.service";

import {
  createTeamSchema,
  inviteMemberSchema,
  reviewInviteSchema,
} from "./teams.validation";

export const createTeamHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        createTeamSchema.parse(
          req.body
        );

      const team =
        await createTeam(
          req.user.id,
          validatedData
        );

      res.status(201).json(
        successResponse(
          team,
          "Team created"
        )
      );
    }
  );

export const getMyTeamsHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const teams =
        await getMyTeams(
          req.user.id
        );

      res.json(
        successResponse(teams)
      );
    }
  );

export const getTeamHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const team =
        await getTeamById(
          req.params.id
        );

      res.json(
        successResponse(team)
      );
    }
  );

export const inviteMemberHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        inviteMemberSchema.parse(
          req.body
        );

      const invite =
        await inviteMember(
          req.user.id,
          req.params.id,
          validatedData
        );

      res.status(201).json(
        successResponse(
          invite,
          "Invite sent"
        )
      );
    }
  );

export const reviewInviteHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        reviewInviteSchema.parse(
          req.body
        );

      const result =
        await reviewInvite(
          req.user.id,
          req.params.inviteId,
          validatedData.status
        );

      res.json(
        successResponse(
          result,
          "Invite reviewed"
        )
      );
    }
  );

export const withdrawInviteHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await withdrawInvite(
          req.user.id,
          req.params.inviteId
        );

      res.json(
        successResponse(
          result,
          "Invite withdrawn"
        )
      );
    }
  );

export const removeMemberHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await removeTeamMember(
          req.user.id,
          req.params.teamId,
          req.params.memberUserId
        );

      res.json(
        successResponse(
          result,
          "Member removed"
        )
      );
    }
  );  

export const leaveTeamHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await leaveTeam(
          req.user.id,
          req.params.teamId
        );

      res.json(
        successResponse(
          result,
          "Left team successfully"
        )
      );
    }
  );  

  export const deleteTeamHandler = asyncHandler(
    async(req: any,res : Response) => {

      const result = await deleteTeam(
        req.user.id,
        req.params.teamId
      );
      res.json(
        successResponse(
          result,
          "Team deleted successfully"
        )
      );
    }
    )
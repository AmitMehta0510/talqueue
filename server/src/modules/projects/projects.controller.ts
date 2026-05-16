import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  createProject,
  getProjectById,
  getProjects,
  requestToJoinProject,
  getProjectJoinRequests,
  reviewJoinRequest,
  withdrawJoinRequest,
  inviteUserToProject,
  reviewProjectInvite,
  leaveProject,
  removeProjectMember,
  getReceivedProjectInvites,
  getSentProjectInvites,
  completeProject,
  archiveProject,
  restoreProject,
  deleteProject,
  updateProject,
  syncGithubProject
} from "./projects.service";

import {
  createProjectSchema,
  joinProjectSchema,
  reviewJoinRequestSchema,
  inviteToProjectSchema,
  reviewProjectInviteSchema,
} from "./projects.validation";

export const createProjectHandler =  asyncHandler(
    async (req: any, res: Response) => {

      const validatedData =
        createProjectSchema.parse(req.body);

      const project =
        await createProject(
          req.user.id,
          validatedData
        );

      res.status(201).json(
        successResponse(
          project,
          "Project created"
        )
      );
    }
  );

export const getProjectsHandler = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const projects =
        await getProjects();

      res.json(
        successResponse(projects)
      );
    }
  );

export const getProjectHandler = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const project =
        await getProjectById(
          req.params.id as string
        );

      res.json(
        successResponse(project)
      );
    }
  );

export const joinProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        joinProjectSchema.parse(
          req.body || {}
        );

      const request =
        await requestToJoinProject(
          req.user.id,
          req.params.id,
          validatedData
        );

      res.status(201).json(
        successResponse(
          request,
          "Join request sent"
        )
      );
    }
  );

export const getProjectJoinRequestsHandler =  asyncHandler(
    async (req: any, res: Response) => {

      const requests =
        await getProjectJoinRequests(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(requests)
      );
    }
  );

export const reviewJoinRequestHandler =  asyncHandler(
    async (req: any, res: Response) => {

      const validatedData =
        reviewJoinRequestSchema.parse(
          req.body
        );

      const result =
        await reviewJoinRequest(
          req.user.id,
          req.params.requestId,
          validatedData.status
        );

      res.json(
        successResponse(
          result,
          "Request reviewed"
        )
      );
    }
  );  

export const withdrawJoinRequestHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await withdrawJoinRequest(
          req.user.id,
          req.params.requestId
        );

      res.json(
        successResponse(
          result,
          "Join request withdrawn"
        )
      );
    }
  ); 
  
export const inviteUserToProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        inviteToProjectSchema.parse(
          req.body || {}
        );

      const invite =
        await inviteUserToProject(
          req.user.id,
          req.params.projectId,
          req.params.userId,
          validatedData
        );

      res.status(201).json(
        successResponse(
          invite,
          "Project invite sent"
        )
      );
    }
  );

export const reviewProjectInviteHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        reviewProjectInviteSchema.parse(
          req.body
        );

      const invite =
        await reviewProjectInvite(
          req.user.id,
          req.params.inviteId,
          validatedData.status
        );

      res.json(
        successResponse(
          invite,
          "Project invite reviewed"
        )
      );
    }
  );

export const leaveProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await leaveProject(
          req.user.id,
          req.params.projectId
        );

      res.json(
        successResponse(
          result,
          "Left project successfully"
        )
      );
    }
  );

export const removeProjectMemberHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await removeProjectMember(
          req.user.id,
          req.params.projectId,
          req.params.memberId
        );

      res.json(
        successResponse(
          result,
          "Member removed successfully"
        )
      );
    }
  );

export const receivedProjectInvitesHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const invites =
        await getReceivedProjectInvites(
          req.user.id
        );

      res.json(
        successResponse(invites)
      );
    }
  );

export const sentProjectInvitesHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const invites =
        await getSentProjectInvites(
          req.user.id,
          req.params.projectId
        );

      res.json(
        successResponse(invites)
      );
    }
  );  

export const completeProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const project =
        await completeProject(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(
          project,
          "Project completed"
        )
      );
    }
  );

export const archiveProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const project =
        await archiveProject(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(
          project,
          "Project archived"
        )
      );
    }
  );

export const restoreProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const project =
        await restoreProject(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(
          project,
          "Project restored"
        )
      );
    }
  );

export const deleteProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const project =
        await deleteProject(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(
          project,
          "Project deleted"
        )
      );
    }
  );  

export const updateProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const project =
        await updateProject(
          req.user.id,

          req.params.projectId,

          req.body
        );

      res.json(
        successResponse(project)
      );
    }
  );  

export const syncGithubProjectHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const project =
        await syncGithubProject(
          req.user.id,

          req.params.projectId
        );

      res.json(
        successResponse(project)
      );
    }
  );  
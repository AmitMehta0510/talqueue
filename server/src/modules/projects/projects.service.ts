import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";
import { createNotification } from "modules/notificatios/notifications.service";
import { PROJECT_JOIN_REQUEST_COOLDOWN_HOURS } from "shared/constants/project";
import {
  addReputation,
  addTeamReputation,
} from "modules/reputation/reputation.service";
import { createActivity } from "modules/activities/activity.service";
import { fetchGithubRepository } from "modules/github/github.service";
import {
  calculateProjectVerificationScore,
  calculateProjectEngineeringScore,
} from "modules/projects/project-auth.service";
import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";
import { calculateTrustLevel } from "modules/engineering/engineering-trust.service";
import { calculateUserAffinity } from "modules/affinity/affinity.service";
import { trackInteraction } from "modules/interaction/interaction-tracking.service";

import slugify from "slugify";

import { calculateProjectScore, getProjectTrustLevel } from "./project.helpers";

import { recalculateProjectAffinities } from "./project-affinity.service";

import { getOwnedProject } from "./project-access.service";

import { CreateProjectData, UpdateProjectData } from "./project.types";

export const createProject = async (
  userId: string,
  data: CreateProjectData,
) => {
  //
  // SAFE UNIQUE SLUG
  //
  const baseSlug = slugify(data.title, {
    lower: true,
    strict: true,
  });

  let slug = baseSlug;

  let counter = 1;

  while (
    await prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${counter++}`;
  }

  //
  // CREATE PROJECT
  //
  const project = await prisma.project.create({
    data: {
      ownerId: userId,

      teamId: data.teamId,

      title: data.title,

      slug,

      description: data.description,

      shortDescription: data.shortDescription,

      githubUrl: data.githubUrl,

      liveUrl: data.liveUrl,

      videoDemoUrl: data.videoDemoUrl,

      screenshots: data.screenshots,

      techStack: data.techStack,

      deploymentStatus: data.deploymentStatus,

      visibility: data.visibility,

      lookingFor: data.lookingFor,

      members: {
        create: {
          userId,

          role: "OWNER",
        },
      },
    },

    include: {
      owner: {
        include: {
          profile: true,
        },
      },

      members: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  //
  // BACKGROUND SIDE EFFECTS
  //
  void Promise.all([
    addReputation(userId, "PROJECT_CREATED", 5, "Created a project", {
      projectId: project.id,
    }),

    createActivity(
      userId,
      "PROJECT_CREATED",
      "Created a project",
      `Created project "${project.title}"`,
      {
        projectId: project.id,
      },
    ),

    recalculateProjectAffinities(project.id),
  ]).catch(console.error);

  //
  // GITHUB SYNC
  //
  if (project.githubUrl) {
    void fetchGithubRepository(project.githubUrl)
      .then(async (githubData) => {
        const verificationScore = calculateProjectVerificationScore({
          ...project,
          ...githubData,
        });

        const verified = verificationScore >= 60;

        await prisma.project.update({
          where: {
            id: project.id,
          },

          data: {
            ...githubData,

            verified,

            lastGithubSyncAt: new Date(),
          },
        });

        if (verified) {
          await Promise.all([
            addReputation(
              userId,
              "PROJECT_VERIFIED",
              40,
              "Verified engineering project",
              {
                projectId: project.id,
              },
            ),

            createActivity(
              userId,
              "PROJECT_VERIFIED",
              "Verified a project",
              `Project "${project.title}" became verified`,
              {
                projectId: project.id,
              },
            ),
          ]);
        }
      })

      .catch(console.error);
  }

  return project;
};

export const getProjects = async (page = 1, limit = 20) => {
  const safeLimit = Math.min(limit, 50);

  const projects = await prisma.project.findMany({
    where: {
      visibility: "PUBLIC",

      deletedAt: null,

      NOT: {
        status: "DELETED",
      },
    },

    include: {
      owner: {
        include: {
          profile: true,
        },
      },

      _count: {
        select: {
          members: true,
        },
      },
    },

    orderBy: [
      {
        verified: "desc",
      },

      {
        starsCount: "desc",
      },

      {
        createdAt: "desc",
      },
    ],

    skip: (page - 1) * safeLimit,

    take: safeLimit,
  });

  return projects.map((project) => ({
    ...project,

    rankingScore: calculateProjectScore(project),
  }));
};

export const getProjectById = async (
  userId: string | undefined,

  projectId: string,
) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },

    include: {
      owner: {
        include: {
          profile: true,
        },
      },

      members: {
        take: 20,

        include: {
          user: {
            include: {
              profile: true,

              skills: {
                include: {
                  skill: true,
                },
              },

              badges: {
                include: {
                  badge: true,
                },
              },
            },
          },
        },
      },

      joinRequests: {
        take: 20,

        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },

      requiredRoles: true,

      hackathonSubmissions: {
        include: {
          hackathon: true,
        },
      },

      _count: {
        select: {
          members: true,

          joinRequests: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  //
  // CENTRALIZED SCORE ENGINE
  //
  const engineeringScore = calculateProjectScore(project);

  //
  // CENTRALIZED TRUST LEVEL
  //
  const trustLevel = getProjectTrustLevel(engineeringScore);

  //
  // TRACK INTERACTION
  //
  if (userId) {
    trackInteraction(userId, {
      targetId: projectId,

      targetType: "PROJECT",

      interactionType: "OPEN_PROJECT",
    }).catch(console.error);
  }

  return {
    ...project,

    engineeringScore,

    trustLevel,
  };
};

export const requestToJoinProject = async (
  userId: string,
  projectId: string,
  data: {
    message?: string;
  },
) => {
  //
  // PROJECT
  //
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },

    select: {
      id: true,

      ownerId: true,

      title: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  //
  // OWNER CHECK
  //
  if (project.ownerId === userId) {
    throw new AppError("Owner cannot join own project", 400);
  }

  //
  // PARALLEL VALIDATIONS
  //
  const [existingMember, existingPendingRequest, recentRejectedRequest] =
    await Promise.all([
      prisma.projectMember.findFirst({
        where: {
          projectId,

          userId,
        },

        select: {
          id: true,
        },
      }),

      prisma.projectJoinRequest.findFirst({
        where: {
          projectId,

          userId,

          status: "PENDING",
        },

        select: {
          id: true,
        },
      }),

      prisma.projectJoinRequest.findFirst({
        where: {
          projectId,

          userId,

          OR: [
            {
              status: "REJECTED",
            },

            {
              status: "WITHDRAWN",
            },
          ],
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          createdAt: true,
        },
      }),
    ]);

  //
  // ALREADY MEMBER
  //
  if (existingMember) {
    throw new AppError("Already a project member", 400);
  }

  //
  // DUPLICATE REQUEST
  //
  if (existingPendingRequest) {
    throw new AppError("Join request already pending", 400);
  }

  //
  // COOLDOWN
  //
  if (recentRejectedRequest) {
    const diff =
      Date.now() - new Date(recentRejectedRequest.createdAt).getTime();

    const cooldownMs = PROJECT_JOIN_REQUEST_COOLDOWN_HOURS * 60 * 60 * 1000;

    if (diff < cooldownMs) {
      throw new AppError(
        `Please wait ${PROJECT_JOIN_REQUEST_COOLDOWN_HOURS} hours before requesting again`,

        400,
      );
    }
  }

  //
  // CREATE REQUEST
  //
  const request = await prisma.projectJoinRequest.create({
    data: {
      projectId,

      userId,

      message: data.message,
    },
  });

  //
  // REQUESTER
  //
  const requester = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      username: true,

      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  //
  // SIDE EFFECTS
  //
  void Promise.all([
    createNotification({
      userId: project.ownerId,

      actorId: userId,

      type: "PROJECT_INVITE",

      title: "New Project Join Request",

      message: `${requester?.profile?.fullName || requester?.username} requested to join "${project.title}"`,

      entityType: "PROJECT",

      entityId: project.id,

      actionUrl: `/projects/${project.id}`,

      metadata: {
        projectId: project.id,

        requestId: request.id,
      },

      groupKey: `project-request-${project.id}`,
    }),

    calculateUserAffinity(userId, project.ownerId),
  ]).catch(console.error);

  return request;
};

export const getProjectJoinRequests = async (
  userId: string,

  projectId: string,
) => {
  //
  // OWNERSHIP CHECK
  //
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

      ownerId: userId,
    },

    select: {
      id: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found or unauthorized", 404);
  }

  return prisma.projectJoinRequest.findMany({
    where: {
      projectId,
    },

    include: {
      user: {
        include: {
          profile: true,

          skills: {
            include: {
              skill: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const reviewJoinRequest = async (
  ownerId: string,

  requestId: string,

  status: "ACCEPTED" | "REJECTED",
) => {
  //
  // REQUEST
  //
  const request = await prisma.projectJoinRequest.findUnique({
    where: {
      id: requestId,
    },

    include: {
      project: {
        select: {
          id: true,

          ownerId: true,

          title: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError("Request not found", 404);
  }

  //
  // AUTH
  //
  if (request.project.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // REVIEWED
  //
  if (request.status !== "PENDING") {
    throw new AppError("Request already reviewed", 400);
  }

  //
  // TRANSACTION
  //
  const result = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.projectJoinRequest.update({
      where: {
        id: requestId,
      },

      data: {
        status,

        reviewedAt: new Date(),
      },
    });

    //
    // ACCEPT
    //
    if (status === "ACCEPTED") {
      //
      // UPSERT MEMBER
      //
      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: request.projectId,

            userId: request.userId,
          },
        },

        update: {},

        create: {
          projectId: request.projectId,

          userId: request.userId,

          role: "MEMBER",
        },
      });

      //
      // AUTO REJECT OTHERS
      //
      await tx.projectJoinRequest.updateMany({
        where: {
          projectId: request.projectId,

          userId: request.userId,

          status: "PENDING",

          NOT: {
            id: requestId,
          },
        },

        data: {
          status: "REJECTED",

          reviewedAt: new Date(),
        },
      });
    }

    return updatedRequest;
  });

  //
  // OWNER
  //
  const owner = await prisma.user.findUnique({
    where: {
      id: ownerId,
    },

    select: {
      username: true,

      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [
    createNotification({
      userId: request.userId,

      actorId: ownerId,

      type: "PROJECT_INVITE",

      title:
        status === "ACCEPTED"
          ? "Project Request Accepted"
          : "Project Request Rejected",

      message:
        status === "ACCEPTED"
          ? `${owner?.profile?.fullName || owner?.username} accepted your request to join "${request.project.title}"`
          : `${owner?.profile?.fullName || owner?.username} rejected your request to join "${request.project.title}"`,

      entityType: "PROJECT",

      entityId: request.projectId,

      actionUrl: `/projects/${request.projectId}`,

      metadata: {
        projectId: request.projectId,

        requestId,
      },

      groupKey: `project-review-${request.projectId}`,
    }),
  ];

  //
  // ACCEPT SIDE EFFECTS
  //
  if (status === "ACCEPTED") {
    sideEffects.push(
      addReputation(request.userId, "PROJECT_JOINED", 10, "Joined a project", {
        projectId: request.projectId,
      }),

      calculateUserAffinity(ownerId, request.userId),

      calculateUserAffinity(request.userId, ownerId),

      recalculateProjectAffinities(request.projectId),
    );
  }

  void Promise.all(sideEffects).catch(console.error);

  return result;
};

export const withdrawJoinRequest = async (
  userId: string,

  requestId: string,
) => {
  //
  // CONDITIONAL UPDATE
  //
  const result = await prisma.projectJoinRequest.updateMany({
    where: {
      id: requestId,

      userId,

      status: "PENDING",
    },

    data: {
      status: "WITHDRAWN",

      withdrawnAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new AppError(
      "Request not found or already reviewed",

      404,
    );
  }

  return prisma.projectJoinRequest.findUnique({
    where: {
      id: requestId,
    },
  });
};

export const inviteUserToProject = async (
  ownerId: string,
  projectId: string,
  invitedUserId: string,
  data: {
    message?: string;
  },
) => {
  //
  // SELF INVITE
  //
  if (ownerId === invitedUserId) {
    throw new AppError("Cannot invite yourself", 400);
  }

  //
  // OWNERSHIP + VALIDATIONS
  //
  const [project, existingMember, existingInvite] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: projectId,

        ownerId,
      },

      select: {
        id: true,

        title: true,

        ownerId: true,
      },
    }),

    prisma.projectMember.findFirst({
      where: {
        projectId,

        userId: invitedUserId,
      },

      select: {
        id: true,
      },
    }),

    prisma.projectInvite.findFirst({
      where: {
        projectId,

        invitedUserId,

        status: "PENDING",
      },

      select: {
        id: true,
      },
    }),
  ]);

  //
  // PROJECT
  //
  if (!project) {
    throw new AppError("Project not found or unauthorized", 404);
  }

  //
  // MEMBER
  //
  if (existingMember) {
    throw new AppError("User already project member", 400);
  }

  //
  // PENDING INVITE
  //
  if (existingInvite) {
    throw new AppError("Invite already pending", 400);
  }

  //
  // CREATE INVITE
  //
  const invite = await prisma.projectInvite.create({
    data: {
      projectId,

      invitedUserId,

      invitedById: ownerId,

      message: data.message,
    },
  });

  //
  // OWNER
  //
  const owner = await prisma.user.findUnique({
    where: {
      id: ownerId,
    },

    select: {
      username: true,

      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  //
  // SIDE EFFECTS
  //
  void Promise.all([
    createNotification({
      userId: invitedUserId,

      actorId: ownerId,

      type: "PROJECT_INVITE",

      title: "Project Invitation",

      message: `${owner?.profile?.fullName || owner?.username} invited you to join "${project.title}"`,

      entityType: "PROJECT",

      entityId: projectId,

      actionUrl: `/projects/${projectId}`,

      metadata: {
        projectId,

        inviteId: invite.id,
      },

      groupKey: `project-invite-${projectId}`,
    }),

    calculateUserAffinity(ownerId, invitedUserId),
  ]).catch(console.error);

  return invite;
};

export const reviewProjectInvite = async (
  userId: string,
  inviteId: string,
  status: "ACCEPTED" | "REJECTED",
) => {
  //
  // INVITE
  //
  const invite = await prisma.projectInvite.findUnique({
    where: {
      id: inviteId,
    },

    include: {
      project: {
        select: {
          id: true,

          title: true,

          ownerId: true,
        },
      },
    },
  });

  if (!invite) {
    throw new AppError("Invite not found", 404);
  }

  //
  // AUTH
  //
  if (invite.invitedUserId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // ALREADY REVIEWED
  //
  if (invite.status !== "PENDING") {
    throw new AppError("Invite already reviewed", 400);
  }

  //
  // TRANSACTION
  //
  const result = await prisma.$transaction(async (tx) => {
    const updatedInvite = await tx.projectInvite.update({
      where: {
        id: inviteId,
      },

      data: {
        status,

        reviewedAt: new Date(),
      },
    });

    //
    // ACCEPT
    //
    if (status === "ACCEPTED") {
      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: invite.projectId,

            userId,
          },
        },

        update: {},

        create: {
          projectId: invite.projectId,

          userId,

          role: "MEMBER",
        },
      });
    }

    return updatedInvite;
  });

  //
  // USER
  //
  const invitedUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      username: true,

      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [
    createNotification({
      userId: invite.invitedById,

      actorId: userId,

      type: "PROJECT_INVITE",

      title:
        status === "ACCEPTED"
          ? "Project Invite Accepted"
          : "Project Invite Rejected",

      message:
        status === "ACCEPTED"
          ? `${invitedUser?.profile?.fullName || invitedUser?.username} accepted your invite to join "${invite.project.title}"`
          : `${invitedUser?.profile?.fullName || invitedUser?.username} rejected your invite to join "${invite.project.title}"`,

      entityType: "PROJECT",

      entityId: invite.projectId,

      actionUrl: `/projects/${invite.projectId}`,

      metadata: {
        projectId: invite.projectId,

        inviteId,
      },

      groupKey: `project-invite-review-${invite.projectId}`,
    }),
  ];

  //
  // ACCEPT SIDE EFFECTS
  //
  if (status === "ACCEPTED") {
    sideEffects.push(
      addReputation(
        userId,

        "PROJECT_JOINED",

        10,

        "Accepted project invite",

        {
          projectId: invite.projectId,
        },
      ),

      calculateUserAffinity(userId, invite.invitedById),

      calculateUserAffinity(invite.invitedById, userId),

      recalculateProjectAffinities(invite.projectId),
    );
  }

  void Promise.all(sideEffects).catch(console.error);

  return result;
};

export const leaveProject = async (userId: string, projectId: string) => {
  //
  // PROJECT
  //
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },

    select: {
      id: true,

      ownerId: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  //
  // OWNER CANNOT LEAVE
  //
  if (project.ownerId === userId) {
    throw new AppError("Owner cannot leave own project", 400);
  }

  //
  // DELETE MEMBERSHIP
  //
  const result = await prisma.projectMember.deleteMany({
    where: {
      projectId,

      userId,
    },
  });

  if (result.count === 0) {
    throw new AppError("Not a project member", 404);
  }

  //
  // SIDE EFFECTS
  //
  void Promise.all([
    addReputation(
      userId,

      "PROJECT_LEFT",

      -5,

      "Left a project",

      {
        projectId,
      },
    ),

    recalculateProjectAffinities(projectId, userId),
  ]).catch(console.error);

  return {
    success: true,
  };
};

export const removeProjectMember = async (
  ownerId: string,
  projectId: string,
  memberId: string,
) => {
  //
  // SELF REMOVE
  //
  if (memberId === ownerId) {
    throw new AppError("Owner cannot remove self", 400);
  }

  //
  // OWNERSHIP
  //
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

      ownerId,
    },

    select: {
      id: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found or unauthorized", 404);
  }

  //
  // DELETE MEMBER
  //
  const result = await prisma.projectMember.deleteMany({
    where: {
      projectId,

      userId: memberId,
    },
  });

  if (result.count === 0) {
    throw new AppError("Member not found", 404);
  }

  //
  // SIDE EFFECTS
  //
  void Promise.all([
    addReputation(
      memberId,

      "PROJECT_REMOVED",

      -10,

      "Removed from project",

      {
        projectId,
      },
    ),

    recalculateProjectAffinities(projectId, memberId),
  ]).catch(console.error);

  return {
    success: true,
  };
};

export const getReceivedProjectInvites = async (
  userId: string,
  page = 1,
  limit = 20,
) => {
  const skip = (page - 1) * limit;

  return prisma.projectInvite.findMany({
    where: {
      invitedUserId: userId,
    },

    include: {
      project: {
        include: {
          owner: {
            include: {
              profile: true,
            },
          },
        },
      },

      invitedBy: {
        include: {
          profile: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    skip,

    take: limit,
  });
};

export const getSentProjectInvites = async (
  ownerId: string,
  projectId: string,
  page = 1,
  limit = 20,
) => {
  //
  // OWNERSHIP
  //
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

      ownerId,
    },

    select: {
      id: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found or unauthorized", 404);
  }

  const skip = (page - 1) * limit;

  return prisma.projectInvite.findMany({
    where: {
      projectId,
    },

    include: {
      invitedUser: {
        include: {
          profile: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    skip,

    take: limit,
  });
};

export const completeProject = async (ownerId: string, projectId: string) => {
  //
  // PROJECT
  //
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

      ownerId,
    },

    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found or unauthorized", 404);
  }

  //
  // ALREADY COMPLETED
  //
  if (project.status === "COMPLETED") {
    throw new AppError("Project already completed", 400);
  }

  //
  // REPUTATION SCORE
  //
  let reputationReward = 20;

  if (project.githubUrl) {
    reputationReward += 15;
  }

  if (project.liveUrl) {
    reputationReward += 15;
  }

  if (project.verified) {
    reputationReward += 25;
  }

  if (project.contributorsCount >= 2) {
    reputationReward += 10;
  }

  if (project.starsCount >= 5) {
    reputationReward += 10;
  }

  //
  // RECENT REPO
  //
  if (project.repoUpdatedAt) {
    const diffDays = Math.floor(
      (Date.now() - new Date(project.repoUpdatedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 30) {
      reputationReward += 10;
    }
  }

  reputationReward = Math.min(reputationReward, 100);

  //
  // COMPLETE PROJECT
  //
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },

    data: {
      status: "COMPLETED",

      completedAt: new Date(),
    },
  });

  //
  // MEMBER IDS
  //
  const memberIds = project.members.map((member) => member.userId);

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [];

  //
  // MEMBER REWARDS
  //
  for (const memberId of memberIds) {
    sideEffects.push(
      addReputation(
        memberId,

        "PROJECT_COMPLETED",

        reputationReward,

        "Completed a project",

        {
          projectId,
        },
      ),

      createActivity(
        memberId,

        "PROJECT_COMPLETED",

        "Completed a project",

        `Completed project "${project.title}"`,

        {
          projectId,
        },
      ),

      calculateEngineeringScore(memberId),
    );
  }

  //
  // TEAM REWARD
  //
  if (project.teamId) {
    sideEffects.push(
      addTeamReputation(
        project.teamId,

        Math.floor(reputationReward / 2),
      ),

      prisma.team.update({
        where: {
          id: project.teamId,
        },

        data: {
          completedProjectsCount: {
            increment: 1,
          },
        },
      }),
    );
  }

  //
  // AFFINITIES
  //
  sideEffects.push(recalculateProjectAffinities(projectId));

  void Promise.all(sideEffects).catch(console.error);

  return updatedProject;
};

export const archiveProject = async (ownerId: string, projectId: string) => {
  //
  // PROJECT
  //
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

      ownerId,
    },

    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found or unauthorized", 404);
  }

  //
  // ALREADY ARCHIVED
  //
  if (project.status === "ARCHIVED") {
    throw new AppError("Project already archived", 400);
  }

  //
  // ARCHIVE
  //
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },

    data: {
      status: "ARCHIVED",

      archivedAt: new Date(),
    },
  });

  //
  // MEMBER IDS
  //
  const memberIds = project.members.map((member) => member.userId);

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [];

  //
  // MEMBER EFFECTS
  //
  for (const memberId of memberIds) {
    sideEffects.push(
      addReputation(
        memberId,

        "PROJECT_ARCHIVED",

        -5,

        "Archived a project",

        {
          projectId,
        },
      ),

      createActivity(
        memberId,

        "PROJECT_ARCHIVED",

        "Archived a project",

        `Archived project "${project.title}"`,

        {
          projectId,
        },
      ),
    );
  }

  //
  // TEAM PENALTY
  //
  if (project.teamId) {
    sideEffects.push(addTeamReputation(project.teamId, -5));
  }

  //
  // AFFINITIES
  //
  sideEffects.push(recalculateProjectAffinities(projectId));

  void Promise.all(sideEffects).catch(console.error);

  return updatedProject;
};

export const restoreProject = async (ownerId: string, projectId: string) => {
  //
  // PROJECT
  //
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

      ownerId,
    },

    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found or unauthorized", 404);
  }

  //
  // ONLY ARCHIVED
  //
  if (project.status !== "ARCHIVED") {
    throw new AppError("Only archived projects can be restored", 400);
  }

  //
  // RESTORE
  //
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },

    data: {
      status: "OPEN",

      archivedAt: null,
    },
  });

  //
  // MEMBER IDS
  //
  const memberIds = project.members.map((member) => member.userId);

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [];

  //
  // MEMBER EFFECTS
  //
  for (const memberId of memberIds) {
    sideEffects.push(
      addReputation(
        memberId,

        "PROJECT_RESTORED",

        3,

        "Restored a project",

        {
          projectId,
        },
      ),

      createActivity(
        memberId,

        "PROJECT_RESTORED",

        "Restored a project",

        `Restored project "${project.title}"`,

        {
          projectId,
        },
      ),
    );
  }

  //
  // TEAM RECOVERY
  //
  if (project.teamId) {
    sideEffects.push(addTeamReputation(project.teamId, 3));
  }

  //
  // AFFINITIES
  //
  sideEffects.push(recalculateProjectAffinities(projectId));

  void Promise.all(sideEffects).catch(console.error);

  return updatedProject;
};

export const deleteProject = async (ownerId: string, projectId: string) => {
  //
  // PROJECT
  //
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

      ownerId,
    },

    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found or unauthorized", 404);
  }

  //
  // ALREADY DELETED
  //
  if (project.status === "DELETED") {
    throw new AppError("Project already deleted", 400);
  }

  //
  // PENALTY
  //
  let reputationPenalty = -20;

  if (project.verified) {
    reputationPenalty += 10;
  }

  if (project.status === "COMPLETED") {
    reputationPenalty += 5;
  }

  if (project.liveUrl) {
    reputationPenalty += 5;
  }

  if (project.githubUrl) {
    reputationPenalty += 5;
  }

  if (project.contributorsCount >= 2) {
    reputationPenalty += 5;
  }

  //
  // PREVENT POSITIVE
  //
  reputationPenalty = Math.min(reputationPenalty, -2);

  //
  // SOFT DELETE
  //
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },

    data: {
      status: "DELETED",

      deletedAt: new Date(),
    },
  });

  //
  // MEMBER IDS
  //
  const memberIds = project.members.map((member) => member.userId);

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [];

  //
  // MEMBER PENALTIES
  //
  for (const memberId of memberIds) {
    sideEffects.push(
      addReputation(
        memberId,

        "PROJECT_DELETED",

        reputationPenalty,

        "Project deleted",

        {
          projectId,
        },
      ),

      createActivity(
        memberId,

        "PROJECT_DELETED",

        "Deleted a project",

        `Deleted project "${project.title}"`,

        {
          projectId,
        },
      ),
    );
  }

  //
  // TEAM PENALTY
  //
  if (project.teamId) {
    sideEffects.push(
      addTeamReputation(
        project.teamId,

        Math.floor(reputationPenalty / 2),
      ),
    );
  }

  //
  // AFFINITIES
  //
  sideEffects.push(recalculateProjectAffinities(projectId));

  void Promise.all(sideEffects).catch(console.error);

  return updatedProject;
};

export const updateProject = async (
  ownerId: string,
  projectId: string,
  data: UpdateProjectData,
) => {
  //
  // PROJECT
  //
  const existingProject = await getOwnedProject(projectId, ownerId);

  //
  // DELETED
  //
  if (existingProject.status === "DELETED") {
    throw new AppError("Deleted project cannot be updated", 400);
  }

  //
  // GITHUB CHANGE
  //
  const githubChanged =
    !!data.githubUrl && data.githubUrl !== existingProject.githubUrl;

  //
  // UPDATE
  //
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },

    data: {
      title: data.title,

      slug: data.title
        ? slugify(data.title, {
            lower: true,
            strict: true,
          })
        : undefined,

      shortDescription: data.shortDescription,

      description: data.description,

      githubUrl: data.githubUrl,

      liveUrl: data.liveUrl,

      videoDemoUrl: data.videoDemoUrl,

      screenshots: data.screenshots,

      techStack: data.techStack,

      deploymentStatus: data.deploymentStatus,

      visibility: data.visibility,

      lookingFor: data.lookingFor,

      featured: data.featured,
    },
  });

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [
    createActivity(
      ownerId,

      "PROJECT_UPDATED",

      "Updated a project",

      `Updated project "${updatedProject.title}"`,

      {
        projectId,
      },
    ),

    recalculateProjectAffinities(projectId),
  ];

  //
  // GITHUB RESYNC
  //
  if (githubChanged && updatedProject.githubUrl) {
    sideEffects.push(
      (async () => {
        try {
          const githubData = await fetchGithubRepository(
            updatedProject.githubUrl!,
          );

          const verificationScore = calculateProjectVerificationScore({
            ...updatedProject,

            ...githubData,
          });

          const verified = verificationScore >= 60;

          await prisma.project.update({
            where: {
              id: updatedProject.id,
            },

            data: {
              ...githubData,

              verified,

              lastGithubSyncAt: new Date(),
            },
          });

          //
          // VERIFIED REWARD
          //
          if (verified) {
            await addReputation(
              ownerId,

              "PROJECT_VERIFIED",

              25,

              "Verified a project",

              {
                projectId: updatedProject.id,
              },
            );
          }

          await calculateEngineeringScore(ownerId);
        } catch (error) {
          console.error("GitHub Sync Failed", error);
        }
      })(),
    );
  }

  void Promise.all(sideEffects).catch(console.error);

  return updatedProject;
};

export const syncGithubProject = async (userId: string, projectId: string) => {
  //
  // PROJECT
  //
  const project = await getOwnedProject(projectId, userId);

  //
  // GITHUB REQUIRED
  //
  if (!project.githubUrl) {
    throw new AppError("GitHub repository not linked", 400);
  }

  //
  // FETCH GITHUB DATA
  //
  const githubData = await fetchGithubRepository(project.githubUrl);

  //
  // SCORES
  //
  const verificationScore = calculateProjectVerificationScore({
    ...project,

    ...githubData,
  });

  const engineeringScore = calculateProjectEngineeringScore({
    ...project,

    ...githubData,
  });

  const verified = verificationScore >= 60;

  //
  // NEWLY VERIFIED
  //
  const becameVerified = !project.verified && verified;

  //
  // UPDATE PROJECT
  //
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },

    data: {
      ...githubData,

      verified,

      engineeringScore,

      lastGithubSyncAt: new Date(),
    },
  });

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [
    createActivity(
      userId,

      "PROJECT_SYNCED",

      "Synced GitHub project",

      `Synced GitHub metadata for "${project.title}"`,

      {
        projectId,
      },
    ),

    calculateEngineeringScore(userId),

    recalculateProjectAffinities(projectId),
  ];

  //
  // VERIFIED REWARD
  //
  if (becameVerified) {
    sideEffects.push(
      addReputation(
        userId,

        "PROJECT_VERIFIED",

        40,

        "Verified engineering project",

        {
          projectId,
        },
      ),

      createActivity(
        userId,

        "PROJECT_VERIFIED",

        "Verified a project",

        `Project "${project.title}" became verified`,

        {
          projectId,
        },
      ),
    );
  }

  void Promise.all(sideEffects).catch(console.error);

  return updatedProject;
};

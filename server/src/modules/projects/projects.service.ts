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

export const createProject = async (userId: string, data: any) => {
  // Create project
  const project = await prisma.project.create({
    data: {
      ownerId: userId,

      teamId: data.teamId,

      title: data.title,

      slug: data.title.toLowerCase().replace(/\s+/g, "-"),

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

  // Lightweight reputation
  addReputation(
    userId,

    "PROJECT_CREATED",

    5,

    "Created a project",

    {
      projectId: project.id,
    },
  ).catch(console.error);

  // Activity
  createActivity(
    userId,

    "PROJECT_CREATED",

    "Created a project",

    `Created project "${project.title}"`,

    {
      projectId: project.id,
    },
  ).catch(console.error);

  // GitHub sync
  if (project.githubUrl) {
    fetchGithubRepository(project.githubUrl)
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

        //
        // Verified project reward
        //
        if (verified) {
          addReputation(
            userId,

            "PROJECT_VERIFIED",

            40,

            "Verified engineering project",

            {
              projectId: project.id,
            },
          ).catch(console.error);

          createActivity(
            userId,

            "PROJECT_COMPLETED",

            "Verified a project",

            `Project "${project.title}" became verified`,

            {
              projectId: project.id,
            },
          ).catch(console.error);
        }
      })
      .catch(console.error);
  }

  // Initial self-network affinity
  if (project.teamId) {
    const members = await prisma.projectMember.findMany({
      where: {
        projectId: project.id,
      },
    });

    await Promise.all(
      members.map(async (member) => {
        if (member.userId !== userId) {
          await calculateUserAffinity(userId, member.userId);

          await calculateUserAffinity(member.userId, userId);
        }
      }),
    );
  }

  return project;
};

export const getProjects = async () => {
  const projects = await prisma.project.findMany({
    where: {
      visibility: "PUBLIC",

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

    take: 100,
  });

  //
  // Ranking engine
  //
  const rankedProjects = projects
    .map((project) => {
      let score = 0;

      //
      // Verified projects
      //
      if (project.verified) {
        score += 100;
      }

      //
      // Completed projects
      //
      if (project.status === "COMPLETED") {
        score += 50;
      }

      //
      // Live deployment
      //
      if (project.liveUrl) {
        score += 40;
      }

      //
      // GitHub repository
      //
      if (project.githubUrl) {
        score += 30;
      }

      //
      // Contributors
      //
      score += project.contributorsCount * 5;

      //
      // GitHub stars
      //
      score += Math.min(project.starsCount, 50);

      //
      // Forks
      //
      score += project.forksCount * 2;

      //
      // Freshness
      //
      const daysOld = Math.floor(
        (Date.now() - new Date(project.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      //
      // Newer projects get slight boost
      //
      score += Math.max(30 - daysOld, 0);

      //
      // Archived projects lower
      //
      if (project.status === "ARCHIVED") {
        score -= 30;
      }

      return {
        ...project,

        rankingScore: score,
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, 50);

  return rankedProjects;
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
        },
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  // Engineering quality score
  let engineeringScore = 0;

  //
  // Verified project
  //
  if (project.verified) {
    engineeringScore += 100;
  }

  //
  // Completed
  //
  if (project.status === "COMPLETED") {
    engineeringScore += 50;
  }

  //
  // GitHub linked
  //
  if (project.githubUrl) {
    engineeringScore += 30;
  }

  //
  // Live deployment
  //
  if (project.liveUrl) {
    engineeringScore += 40;
  }

  //
  // Contributors
  //
  engineeringScore += project.contributorsCount * 5;

  //
  // GitHub stars
  //
  engineeringScore += Math.min(project.starsCount, 50);

  //
  // Forks
  //
  engineeringScore += project.forksCount * 2;

  //
  // Hackathon submissions
  //
  engineeringScore += project.hackathonSubmissions.length * 20;

  //
  // Freshness
  //
  if (project.repoUpdatedAt) {
    const diffDays = Math.floor(
      (Date.now() - new Date(project.repoUpdatedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 30) {
      engineeringScore += 20;
    }
  }

  //
  // Trust level
  //
  let trustLevel = "LOW";

  if (engineeringScore >= 200) {
    trustLevel = "ELITE";
  } else if (engineeringScore >= 120) {
    trustLevel = "HIGH";
  } else if (engineeringScore >= 60) {
    trustLevel = "MEDIUM";
  }

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
  data: any,
) => {
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

  // Prevent owner request
  if (project.ownerId === userId) {
    throw new AppError("Owner cannot join own project", 400);
  }

  // Prevent existing member
  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  });

  if (existingMember) {
    throw new AppError("Already a project member", 400);
  }

  // Prevent duplicate pending request
  const existingPendingRequest = await prisma.projectJoinRequest.findFirst({
    where: {
      projectId,
      userId,
      status: "PENDING",
    },
  });

  if (existingPendingRequest) {
    throw new AppError("Join request already pending", 400);
  }

  // Cooldown logic
  const recentRejectedRequest = await prisma.projectJoinRequest.findFirst({
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
  });

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

  const request = await prisma.projectJoinRequest.create({
    data: {
      projectId,
      userId,
      message: data.message,
    },
  });

  // Fire-and-forget notification
  const requester = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      profile: true,
    },
  });

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
  }).catch((error) => {
    console.error("Notification Error:", error);
  });

  calculateUserAffinity(userId, project.ownerId).catch(console.error);

  return request;
};

export const getProjectJoinRequests = async (
  userId: string,
  projectId: string,
) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },

    select: {
      ownerId: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId !== userId) {
    throw new AppError("Unauthorized", 403);
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
  const request = await prisma.projectJoinRequest.findUnique({
    where: {
      id: requestId,
    },

    include: {
      project: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError("Request not found", 404);
  }

  if (request.project.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (request.status !== "PENDING") {
    throw new AppError("Request already reviewed", 400);
  }

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

    if (status === "ACCEPTED") {
      const existingMember = await tx.projectMember.findFirst({
        where: {
          projectId: request.projectId,
          userId: request.userId,
        },
      });

      if (!existingMember) {
        await tx.projectMember.create({
          data: {
            projectId: request.projectId,
            userId: request.userId,
            role: "MEMBER",
          },
        });

        // Reputation reward
        addReputation(
          request.userId,

          "PROJECT_JOINED",

          10,

          "Joined a project",

          {
            projectId: request.projectId,
          },
        ).catch(console.error);
      }

      // Auto reject remaining pending requests
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

  const owner = await prisma.user.findUnique({
    where: {
      id: ownerId,
    },

    include: {
      profile: true,
    },
  });

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
  }).catch((error) => {
    console.error("Notification Error:", error);
  });

  if (status === "ACCEPTED") {
    calculateUserAffinity(ownerId, request.userId).catch(console.error);

    calculateUserAffinity(request.userId, ownerId).catch(console.error);
  }

  return result;
};

export const withdrawJoinRequest = async (
  userId: string,
  requestId: string,
) => {
  const request = await prisma.projectJoinRequest.findUnique({
    where: {
      id: requestId,
    },
  });

  if (!request) {
    throw new AppError("Request not found", 404);
  }

  if (request.userId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  if (request.status !== "PENDING") {
    throw new AppError("Only pending requests can be withdrawn", 400);
  }

  return prisma.projectJoinRequest.update({
    where: {
      id: requestId,
    },

    data: {
      status: "WITHDRAWN",
      withdrawnAt: new Date(),
    },
  });
};

export const inviteUserToProject = async (
  ownerId: string,
  projectId: string,
  invitedUserId: string,
  data: any,
) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId !== ownerId) {
    throw new AppError("Only owner can invite", 403);
  }

  if (invitedUserId === ownerId) {
    throw new AppError("Cannot invite yourself", 400);
  }

  // Already member
  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: invitedUserId,
    },
  });

  if (existingMember) {
    throw new AppError("User already project member", 400);
  }

  // Existing pending invite
  const existingInvite = await prisma.projectInvite.findFirst({
    where: {
      projectId,

      invitedUserId,

      status: "PENDING",
    },
  });

  if (existingInvite) {
    throw new AppError("Invite already pending", 400);
  }

  const invite = await prisma.projectInvite.create({
    data: {
      projectId,

      invitedUserId,

      invitedById: ownerId,

      message: data.message,
    },

    include: {
      project: true,
    },
  });

  const owner = await prisma.user.findUnique({
    where: {
      id: ownerId,
    },

    include: {
      profile: true,
    },
  });

  createNotification({
    userId: invitedUserId,

    actorId: ownerId,

    type: "PROJECT_INVITE",

    title: "Project Invitation",

    message: `${owner?.profile?.fullName || owner?.username} invited you to join "${invite.project.title}"`,

    entityType: "PROJECT",

    entityId: projectId,

    actionUrl: `/projects/${projectId}`,

    metadata: {
      projectId,

      inviteId: invite.id,
    },

    groupKey: `project-invite-${projectId}`,
  }).catch(console.error);

  calculateUserAffinity(ownerId, invitedUserId).catch(console.error);

  return invite;
};

export const reviewProjectInvite = async (
  userId: string,
  inviteId: string,
  status: "ACCEPTED" | "REJECTED",
) => {
  const invite = await prisma.projectInvite.findUnique({
    where: {
      id: inviteId,
    },

    include: {
      project: true,
    },
  });

  if (!invite) {
    throw new AppError("Invite not found", 404);
  }

  if (invite.invitedUserId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  if (invite.status !== "PENDING") {
    throw new AppError("Invite already reviewed", 400);
  }

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

    if (status === "ACCEPTED") {
      const existingMember = await tx.projectMember.findFirst({
        where: {
          projectId: invite.projectId,

          userId,
        },
      });

      if (!existingMember) {
        await tx.projectMember.create({
          data: {
            projectId: invite.projectId,

            userId,

            role: "MEMBER",
          },
        });

        // Reputation reward
        addReputation(
          userId,

          "PROJECT_JOINED",

          10,

          "Accepted project invite",

          {
            projectId: invite.projectId,
          },
        ).catch(console.error);
      }
    }

    return updatedInvite;
  });

  const invitedUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      profile: true,
    },
  });

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
  }).catch((error) => {
    console.error("Notification Error:", error);
  });

  if (status === "ACCEPTED") {
    calculateUserAffinity(userId, invite.invitedById).catch(console.error);

    calculateUserAffinity(invite.invitedById, userId).catch(console.error);
  }

  return result;
};

export const leaveProject = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId === userId) {
    throw new AppError("Owner cannot leave own project", 400);
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  });

  if (!membership) {
    throw new AppError("Not a project member", 404);
  }

  await prisma.projectMember.delete({
    where: {
      id: membership.id,
    },
  });

  // Reputation penalty
  addReputation(
    userId,

    "PROJECT_LEFT",

    -5,

    "Left a project",

    {
      projectId,
    },
  ).catch(console.error);

  //
  // Recalculate affinities
  //
  const remainingMembers = await prisma.projectMember.findMany({
    where: {
      projectId,
    },
  });

  await Promise.all(
    remainingMembers.map(async (member) => {
      await calculateUserAffinity(userId, member.userId);

      await calculateUserAffinity(member.userId, userId);
    }),
  );

  return {
    success: true,
  };
};

export const removeProjectMember = async (
  ownerId: string,
  projectId: string,
  memberId: string,
) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId !== ownerId) {
    throw new AppError("Only owner can remove members", 403);
  }

  if (memberId === ownerId) {
    throw new AppError("Owner cannot remove self", 400);
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: memberId,
    },
  });

  if (!membership) {
    throw new AppError("Member not found", 404);
  }

  await prisma.projectMember.delete({
    where: {
      id: membership.id,
    },
  });

  // Reputation penalty
  addReputation(
    memberId,

    "PROJECT_REMOVED",

    -10,

    "Removed from project",

    {
      projectId,
    },
  ).catch(console.error);

  //
  // Recalculate affinities
  //
  const remainingMembers = await prisma.projectMember.findMany({
    where: {
      projectId,
    },
  });

  await Promise.all(
    remainingMembers.map(async (member) => {
      await calculateUserAffinity(memberId, member.userId);

      await calculateUserAffinity(member.userId, memberId);
    }),
  );

  return {
    success: true,
  };
};

export const getReceivedProjectInvites = async (userId: string) => {
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
  });
};

export const getSentProjectInvites = async (
  ownerId: string,
  projectId: string,
) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

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
  });
};

export const completeProject = async (ownerId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },

    include: {
      members: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (project.status === "COMPLETED") {
    throw new AppError("Project already completed", 400);
  }

  //
  // Verification scoring
  //
  let reputationReward = 20;

  //
  // GitHub linked
  //
  if (project.githubUrl) {
    reputationReward += 15;
  }

  //
  // Live deployment
  //
  if (project.liveUrl) {
    reputationReward += 15;
  }

  //
  // Verified project
  //
  if (project.verified) {
    reputationReward += 25;
  }

  //
  // Contributors
  //
  if (project.contributorsCount >= 2) {
    reputationReward += 10;
  }

  //
  // Stars
  //
  if (project.starsCount >= 5) {
    reputationReward += 10;
  }

  //
  // Fresh repository activity
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

  //
  // Cap reputation
  //
  reputationReward = Math.min(reputationReward, 100);

  //
  // Complete project
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
  // Reward all members
  //
  await Promise.all(
    project.members.map(async (member) => {
      await addReputation(
        member.userId,

        "PROJECT_COMPLETED",

        reputationReward,

        "Completed a project",

        {
          projectId,
        },
      );

      await createActivity(
        member.userId,

        "PROJECT_COMPLETED",

        "Completed a project",

        `Completed project "${project.title}"`,

        {
          projectId,
        },
      );
      await calculateEngineeringScore(member.userId);

      //
      // Team collaboration affinity
      //
      await Promise.all(
        project.members.map(async (otherMember) => {
          if (otherMember.userId !== member.userId) {
            await calculateUserAffinity(member.userId, otherMember.userId);
          }
        }),
      );
    }),
  );

  // Team reputation

  if (project.teamId) {
    // Team gets smaller reward
    await addTeamReputation(
      project.teamId,

      Math.floor(reputationReward / 2),
    );

    await prisma.team.update({
      where: {
        id: project.teamId,
      },

      data: {
        completedProjectsCount: {
          increment: 1,
        },
      },
    });
  }

  return updatedProject;
};

export const archiveProject = async (ownerId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },

    include: {
      members: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (project.status === "ARCHIVED") {
    throw new AppError("Project already archived", 400);
  }

  //
  // Archive project
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
  // Small reputation reduction
  //
  await Promise.all(
    project.members.map(async (member) => {
      await addReputation(
        member.userId,

        "PROJECT_ARCHIVED",

        -5,

        "Archived a project",

        {
          projectId,
        },
      );

      await createActivity(
        member.userId,

        "PROJECT_ARCHIVED",

        "Archived a project",

        `Archived project "${project.title}"`,

        {
          projectId,
        },
      );

      await calculateUserAffinity(ownerId, member.userId);
    }),
  );

  //
  // Team reputation reduction
  //
  if (project.teamId) {
    await addTeamReputation(project.teamId, -5);
  }

  return updatedProject;
};

export const restoreProject = async (ownerId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },

    include: {
      members: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (project.status !== "ARCHIVED") {
    throw new AppError("Only archived projects can be restored", 400);
  }

  //
  // Restore project
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
  // Small reputation recovery
  //
  await Promise.all(
    project.members.map(async (member) => {
      await addReputation(
        member.userId,

        "PROJECT_RESTORED",

        3,

        "Restored a project",

        {
          projectId,
        },
      );

      await createActivity(
        member.userId,

        "PROJECT_RESTORED",

        "Restored a project",

        `Restored project "${project.title}"`,

        {
          projectId,
        },
      );

      await calculateUserAffinity(ownerId, member.userId);
    }),
  );

  //
  // Team reputation recovery
  //
  if (project.teamId) {
    await addTeamReputation(project.teamId, 3);
  }

  return updatedProject;
};

export const deleteProject = async (ownerId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },

    include: {
      members: true,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (project.status === "DELETED") {
    throw new AppError("Project already deleted", 400);
  }

  // Penalty calculation
  let reputationPenalty = -20;

  // Verified project
  if (project.verified) {
    reputationPenalty += 10;
  }

  // Completed project
  if (project.status === "COMPLETED") {
    reputationPenalty += 5;
  }

  // Live deployment
  if (project.liveUrl) {
    reputationPenalty += 5;
  }

  // GitHub project
  if (project.githubUrl) {
    reputationPenalty += 5;
  }

  // Contributor collaboration
  if (project.contributorsCount >= 2) {
    reputationPenalty += 5;
  }

  // Prevent positive penalty
  reputationPenalty = Math.min(reputationPenalty, -2);

  // Soft delete
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },

    data: {
      status: "DELETED",

      deletedAt: new Date(),
    },
  });

  // Reputation penalties
  await Promise.all(
    project.members.map(async (member) => {
      await addReputation(
        member.userId,

        "PROJECT_DELETED",

        reputationPenalty,

        "Project deleted",

        {
          projectId,
        },
      );

      await createActivity(
        member.userId,

        "PROJECT_DELETED",

        "Deleted a project",

        `Deleted project "${project.title}"`,

        {
          projectId,
        },
      );

      await calculateUserAffinity(ownerId, member.userId);
    }),
  );

  //
  // Team penalty
  //
  if (project.teamId) {
    await addTeamReputation(
      project.teamId,

      Math.floor(reputationPenalty / 2),
    );
  }

  return updatedProject;
};

export const updateProject = async (
  ownerId: string,
  projectId: string,
  data: any,
) => {
  const existingProject = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!existingProject) {
    throw new AppError("Project not found", 404);
  }

  if (existingProject.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }
  // Prevent editing deleted projec
  if (existingProject.status === "DELETED") {
    throw new AppError("Deleted project cannot be updated", 400);
  }
  // Detect GitHub URL chang
  const githubChanged =
    data.githubUrl && data.githubUrl !== existingProject.githubUrl;
  // Update editable field
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },

    data: {
      title: data.title,

      slug: data.title?.toLowerCase()?.replace(/\s+/g, "-"),

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
  // Activity
  createActivity(
    ownerId,

    "PROJECT_UPDATED",

    "Updated a project",

    `Updated project "${updatedProject.title}"`,

    {
      projectId,
    },
  ).catch(console.error);

  //
  // Recalculate collaboration graph
  //
  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
    },
  });

  await Promise.all(
    members.map(async (member) => {
      if (member.userId !== ownerId) {
        await calculateUserAffinity(ownerId, member.userId);

        await calculateUserAffinity(member.userId, ownerId);
      }
    }),
  );
  // Re-sync GitHub metadat
  if (githubChanged) {
    fetchGithubRepository(updatedProject.githubUrl!)
      .then(async (githubData) => {
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

        // Reputation reward

        if (verified) {
          addReputation(
            ownerId,

            "PROJECT_VERIFIED",

            25,

            "Verified a project",

            {
              projectId: updatedProject.id,
            },
          ).catch(console.error);
        }

        await calculateEngineeringScore(ownerId);
      })
      .catch(console.error);
  }

  return updatedProject;
};

export const syncGithubProject = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  // Only owner can sync
  if (project.ownerId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  // GitHub required
  if (!project.githubUrl) {
    throw new AppError("GitHub repository not linked", 400);
  }

  // Fetch latest GitHub metadata
  const githubData = await fetchGithubRepository(project.githubUrl);

  // Calculate verification score
  const verificationScore = calculateProjectVerificationScore({
    ...project,
    ...githubData,
  });

  const engineeringScore = calculateProjectEngineeringScore({
    ...project,
    ...githubData,
  });

  const verified = verificationScore >= 60;

  // Detect newly verified
  const becameVerified = !project.verified && verified;

  // Update project
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

  // Reward ONLY once
  if (becameVerified) {
    await addReputation(
      userId,

      "PROJECT_VERIFIED",

      40,

      "Verified engineering project",

      {
        projectId,
      },
    );

    await createActivity(
      userId,

      "PROJECT_VERIFIED",

      "Verified a project",

      `Project "${project.title}" became verified`,

      {
        projectId,
      },
    );
  }

  // Sync activity
  await createActivity(
    userId,

    "PROJECT_SYNCED",

    "Synced GitHub project",

    `Synced GitHub metadata for "${project.title}"`,

    {
      projectId,
    },
  );

  await calculateEngineeringScore(userId);

  // Collaboration affinity refresh
  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
    },
  });

  await Promise.all(
    members.map(async (member) => {
      if (member.userId !== userId) {
        await calculateUserAffinity(userId, member.userId);

        await calculateUserAffinity(member.userId, userId);
      }
    }),
  );

  return updatedProject;
};
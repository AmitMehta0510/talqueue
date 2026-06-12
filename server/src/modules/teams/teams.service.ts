import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import {
  addReputation,
  addTeamReputation,
  rewardTeamMembers,
} from "modules/reputation/reputation.service";
import { createActivity } from "modules/activities/activity.service";
import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";
import { calculateUserAffinity } from "modules/affinity/affinity.service";
import { trackInteraction } from "modules/interaction/interaction-tracking.service";

export const createTeam = async (ownerId: string, data: any) => {
  //
  // Remove duplicates
  //
  const uniqueMembers = Array.from(new Set([...(data.members || []), ownerId]));

  //
  // Create team
  //
  const team = await prisma.team.create({
    data: {
      name: data.name,

      description: data.description,

      ownerId,

      members: {
        create: uniqueMembers.map((userId: string) => ({
          userId,

          role: userId === ownerId ? "OWNER" : "MEMBER",
        })),
      },
    },

    include: {
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
  // Create team conversation
  //
  await prisma.conversation.create({
    data: {
      type: "TEAM",

      teamId: team.id,

      participants: {
        create: uniqueMembers.map((userId: string) => ({
          userId,
        })),
      },
    },
  });

  //
  // Reputation reward
  //
  addReputation(
    ownerId,

    "TEAM_CREATED",

    15,

    "Created a team",

    {
      teamId: team.id,
    },
  ).catch(console.error);

  //
  // Activity
  //
  createActivity(
    ownerId,

    "TEAM_CREATED",

    "Created a team",

    `Created team "${team.name}"`,

    {
      teamId: team.id,
    },
  ).catch(console.error);

  //
  // Team creation affinity
  //
  await Promise.all(
    uniqueMembers.map(async (memberId: string) => {
      if (memberId === ownerId) {
        return;
      }

      await calculateUserAffinity(ownerId, memberId);

      await calculateUserAffinity(memberId, ownerId);

      //
      // Engineering score recalculation
      //
      await calculateEngineeringScore(memberId);

      //
      // Notify invited members
      //
      createNotification({
        userId: memberId,

        type: "TEAM_INVITE",

        title: "Added To Team",

        message: `You were added to team "${team.name}"`,
      }).catch(console.error);
    }),
  );

  await calculateEngineeringScore(ownerId);

  return team;
};

export const getMyTeams = async (userId: string) => {
  return prisma.team.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },

    include: {
      members: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },

      _count: {
        select: {
          members: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getTeamById = async (
  userId: string | undefined,
  teamId: string,
) => {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },

    include: {
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
            },
          },
        },
      },

      invites: true,
    },
  });

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  if (userId) {
    trackInteraction(userId, {
      targetId: teamId,
      targetType: "TEAM",
      interactionType: "VIEW",
    }).catch(console.error);
  }

  return team;
};

export const inviteMember = async (
  invitedById: string,
  teamId: string,
  data: any,
) => {
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: invitedById,
    },
  });

  if (!membership) {
    throw new AppError("Unauthorized", 403);
  }

  if (data.invitedUserId === invitedById) {
    throw new AppError("Cannot invite yourself", 400);
  }

  const existingMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: data.invitedUserId,
    },
  });

  if (existingMember) {
    throw new AppError("User already in team", 400);
  }

  const existingInvite = await prisma.teamInvite.findFirst({
    where: {
      teamId,

      invitedUserId: data.invitedUserId,

      status: "PENDING",
    },
  });

  if (existingInvite) {
    throw new AppError("Invite already pending", 400);
  }

  const invite = await prisma.teamInvite.create({
    data: {
      teamId,

      invitedUserId: data.invitedUserId,

      invitedById,

      message: data.message,
    },
  });

  const inviter = await prisma.user.findUnique({
    where: {
      id: invitedById,
    },

    include: {
      profile: true,
    },
  });

  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  // Affinity
  //
  await calculateUserAffinity(invitedById, data.invitedUserId);

  await calculateUserAffinity(data.invitedUserId, invitedById);

  //
  // Activity
  //
  createActivity(
    invitedById,

    "TEAM_INVITE_SENT",

    "Invited user to team",

    `Invited user to join "${team?.name}"`,

    {
      teamId,
      invitedUserId: data.invitedUserId,
    },
  ).catch(console.error);

  //
  // Notification
  //
  createNotification({
    userId: data.invitedUserId,

    type: "TEAM_INVITE",

    title: "New Team Invite",

    message: `${inviter?.profile?.fullName || inviter?.username || "Someone"} invited you to join "${team?.name}"`,
  }).catch(console.error);
};

export const reviewInvite = async (
  userId: string,
  inviteId: string,
  status: "ACCEPTED" | "REJECTED",
) => {
  const invite = await prisma.teamInvite.findUnique({
    where: {
      id: inviteId,
    },

    include: {
      team: true,
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
    const updatedInvite = await tx.teamInvite.update({
      where: {
        id: inviteId,
      },

      data: {
        status,
        reviewedAt: new Date(),
      },
    });

    if (status === "ACCEPTED") {
      const existingMember = await tx.teamMember.findFirst({
        where: {
          teamId: invite.teamId,
          userId,
        },
      });

      if (!existingMember) {
        await tx.teamMember.create({
          data: {
            teamId: invite.teamId,
            userId,
            role: "MEMBER",
          },
        });

        // Reputation reward
        addReputation(
          userId,

          "TEAM_JOINED",

          5,

          "Joined a team",

          {
            teamId: invite.teamId,
          },
        ).catch(console.error);

        //
        // Team reputation
        //
        addTeamReputation(invite.teamId, 10).catch(console.error);

        //
        // Engineering score
        //
        calculateEngineeringScore(userId).catch(console.error);

        //
        // Affinity
        //
        await calculateUserAffinity(invite.invitedById, userId);

        await calculateUserAffinity(userId, invite.invitedById);

        //
        // Activity
        //
        createActivity(
          userId,

          "TEAM_JOINED",

          "Joined a team",

          `Joined team "${invite.team.name}"`,

          {
            teamId: invite.teamId,
          },
        ).catch(console.error);

        const teamConversation = await tx.conversation.findFirst({
          where: {
            teamId: invite.teamId,
            type: "TEAM",
          },
        });

        if (teamConversation) {
          await tx.conversationParticipant.create({
            data: {
              conversationId: teamConversation.id,

              userId,
            },
          });
        }
      }
    }

    return updatedInvite;
  });

  const receiver = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      profile: true,
    },
  });

  createNotification({
    userId: invite.invitedById,

    type: "TEAM_INVITE",

    title: status === "ACCEPTED" ? "Invite Accepted" : "Invite Rejected",

    message:
      status === "ACCEPTED"
        ? `${receiver?.profile?.fullName || receiver?.username || "Someone"} accepted your team invite`
        : `${receiver?.profile?.fullName || receiver?.username || "Someone"} rejected your team invite`,
  }).catch(console.error);

  return result;
};

export const withdrawInvite = async (userId: string, inviteId: string) => {
  const invite = await prisma.teamInvite.findUnique({
    where: {
      id: inviteId,
    },
  });

  if (!invite) {
    throw new AppError("Invite not found", 404);
  }

  if (invite.invitedById !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  if (invite.status !== "PENDING") {
    throw new AppError("Only pending invites can be withdrawn", 400);
  }

  return prisma.teamInvite.update({
    where: {
      id: inviteId,
    },

    data: {
      status: "WITHDRAWN",
      withdrawnAt: new Date(),
    },
  });
};

export const removeTeamMember = async (
  requesterId: string,
  teamId: string,
  memberUserId: string,
) => {
  const requesterMembership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: requesterId,
    },
  });

  if (!requesterMembership) {
    throw new AppError("Unauthorized", 403);
  }

  // Only OWNER or ADMIN
  if (
    requesterMembership.role !== "OWNER" &&
    requesterMembership.role !== "ADMIN"
  ) {
    throw new AppError("Insufficient permissions", 403);
  }

  const targetMembership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: memberUserId,
    },
  });

  if (!targetMembership) {
    throw new AppError("Member not found", 404);
  }

  // Cannot remove owner
  if (targetMembership.role === "OWNER") {
    throw new AppError("Cannot remove owner", 400);
  }

  await prisma.teamMember.delete({
    where: {
      id: targetMembership.id,
    },
  });

  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  createNotification({
    userId: memberUserId,

    type: "TEAM_INVITE",

    title: "Removed From Team",

    message: `You were removed from ${team?.name || "a team"}`,
  }).catch(console.error);

  // Reputation penalty
  addReputation(
    memberUserId,

    "TEAM_REMOVED",

    -7,

    "Removed from team",

    {
      teamId,
    },
  ).catch(console.error);

  //
  // Team reputation penalty
  //
  addTeamReputation(teamId, -5).catch(console.error);

  //
  // Engineering score recalculation
  //
  calculateEngineeringScore(memberUserId).catch(console.error);

  //
  // Affinity recalculation
  //
  await calculateUserAffinity(requesterId, memberUserId);

  await calculateUserAffinity(memberUserId, requesterId);

  //
  // Activity
  //
  createActivity(
    requesterId,

    "TEAM_MEMBER_REMOVED",

    "Removed team member",

    "Removed a member from team",

    {
      teamId,
      memberUserId,
    },
  ).catch(console.error);

  return {
    success: true,
  };
};

export const leaveTeam = async (userId: string, teamId: string) => {
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
    },
  });

  if (!membership) {
    throw new AppError("Not a team member", 404);
  }

  // Owner cannot leave directly
  if (membership.role === "OWNER") {
    throw new AppError("Transfer ownership before leaving team", 400);
  }

  await prisma.teamMember.delete({
    where: {
      id: membership.id,
    },
  });

  // Reputation penalty
  addReputation(
    userId,

    "TEAM_LEFT",

    -3,

    "Left a team",

    {
      teamId,
    },
  ).catch(console.error);

  //
  // Team reputation penalty
  //
  addTeamReputation(teamId, -2).catch(console.error);

  //
  // Engineering score
  //
  calculateEngineeringScore(userId).catch(console.error);

  //
  // Activity
  //
  createActivity(
    userId,

    "TEAM_LEFT",

    "Left a team",

    "Left a team",

    {
      teamId,
    },
  ).catch(console.error);

  return {
    success: true,
  };
};

export const archiveTeam = async (ownerId: string, teamId: string) => {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  if (team.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  const updatedTeam = prisma.team.update({
    where: {
      id: teamId,
    },

    data: {
      status: "ARCHIVED",

      archivedAt: new Date(),
    },
  });

  //
  // Team reputation reduction
  //
  await addTeamReputation(teamId, -10);

  //
  // Activity
  //
  createActivity(
    ownerId,

    "TEAM_ARCHIVED",

    "Archived a team",

    `Archived team "${team.name}"`,

    {
      teamId,
    },
  ).catch(console.error);

  return updatedTeam;
};

export const restoreTeam = async (ownerId: string, teamId: string) => {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  if (team.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  const updatedTeam = prisma.team.update({
    where: {
      id: teamId,
    },

    data: {
      status: "ACTIVE",

      archivedAt: null,
    },
  });

  //
  // Team reputation recovery
  //
  await addTeamReputation(teamId, 5);

  //
  // Activity
  //
  createActivity(
    ownerId,

    "TEAM_RESTORED",

    "Restored a team",

    `Restored team "${team.name}"`,

    {
      teamId,
    },
  ).catch(console.error);

  return updatedTeam;
};

export const deleteTeam = async (ownerId: string, teamId: string) => {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },

    include: {
      members: true,
    },
  });

  //
  // Not found
  //
  if (!team) {
    throw new AppError("Team not found", 404);
  }

  //
  // Already deleted
  //
  if (team.status === "DELETED" || team.deletedAt) {
    throw new AppError("Team already deleted", 400);
  }

  //
  // Authorization
  //
  if (team.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // Soft delete
  //
  const updatedTeam = await prisma.team.update({
    where: {
      id: teamId,
    },

    data: {
      status: "DELETED",

      deletedAt: new Date(),
    },
  });

  //
  // Team reputation penalty
  //
  await addTeamReputation(teamId, -50);

  //
  // Member penalties
  //
  await Promise.all(
    team.members.map(async (member) => {
      await addReputation(
        member.userId,

        "TEAM_DELETED",

        -10,

        "Team deleted",

        {
          teamId,
        },
      );

      await calculateEngineeringScore(member.userId);

      await createActivity(
        member.userId,

        "TEAM_DELETED",

        "Team deleted",

        `Team "${team.name}" was deleted`,

        {
          teamId,
        },
      );

      if (member.userId !== ownerId) {
        createNotification({
          userId: member.userId,

          type: "TEAM_INVITE",

          title: "Team Deleted",

          message: `Team "${team.name}" was deleted`,
        }).catch(console.error);
      }
    }),
  );

  return updatedTeam;
};

// ─── Update team (name / description) ────────────────────────────────────────

export const updateTeam = async (
  ownerId: string,
  teamId: string,
  data: { name?: string; description?: string },
) => {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError("Team not found", 404);

  // Allow OWNER or ADMIN
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId: ownerId },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new AppError("Unauthorized", 403);
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
    include: {
      members: { include: { user: { include: { profile: true } } } },
      invites: true,
    },
  });

  createActivity(
    ownerId,
    "TEAM_UPDATED",
    "Updated a team",
    `Updated team "${updated.name}"`,
    { teamId },
  ).catch(console.error);

  return updated;
};

// ─── Promote / demote member ──────────────────────────────────────────────────

export const promoteMember = async (
  requesterId: string,
  teamId: string,
  memberUserId: string,
  newRole: "MEMBER" | "ADMIN",
) => {
  const requesterMembership = await prisma.teamMember.findFirst({
    where: { teamId, userId: requesterId },
  });
  if (!requesterMembership || requesterMembership.role !== "OWNER") {
    throw new AppError("Only the team owner can change member roles", 403);
  }

  const targetMembership = await prisma.teamMember.findFirst({
    where: { teamId, userId: memberUserId },
  });
  if (!targetMembership) throw new AppError("Member not found", 404);
  if (targetMembership.role === "OWNER") throw new AppError("Cannot change owner role", 400);

  const updated = await prisma.teamMember.update({
    where: { id: targetMembership.id },
    data: { role: newRole },
    include: { user: { include: { profile: true } } },
  });

  const team = await prisma.team.findUnique({ where: { id: teamId } });

  createNotification({
    userId: memberUserId,
    type: "TEAM_INVITE",
    title: "Role Updated",
    message: `Your role in "${team?.name}" was changed to ${newRole}`,
  }).catch(console.error);

  return updated;
};

// ─── Get my pending invites (across all teams) ────────────────────────────────

export const getMyPendingInvites = async (userId: string) => {
  return prisma.teamInvite.findMany({
    where: {
      invitedUserId: userId,
      status: "PENDING",
    },
    include: {
      team: {
        include: {
          members: {
            include: { user: { include: { profile: true } } },
          },
          _count: { select: { members: true } },
        },
      },
      invitedBy: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};


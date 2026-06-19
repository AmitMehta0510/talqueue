import prisma from "shared/database/prisma";
import { Prisma } from "@prisma/client";

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
  // Remove duplicates
  const uniqueMembers = Array.from(new Set([...(data.members || []), ownerId]));

  // Create team
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

  // Create team conversation
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

  // Reputation reward
  addReputation(
    ownerId,

    "TEAM_CREATED",

    15,

    "Created a team",

    {
      teamId: team.id,
    },
  ).catch(console.error);

  // Activity
  createActivity(
    ownerId,

    "TEAM_CREATED",

    "Created a team",

    `Created team "${team.name}"`,

    {
      teamId: team.id,
    },
  ).catch(console.error);

  // Team creation affinity
  await Promise.all(
    uniqueMembers.map(async (memberId: string) => {
      if (memberId === ownerId) {
        return;
      }

      await calculateUserAffinity(ownerId, memberId);

      await calculateUserAffinity(memberId, ownerId);

      // Engineering score recalculation
      await calculateEngineeringScore(memberId);

      // Notify invited members
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

  // Offload social graph signal (affinity) and analytics indicators (activity, notifications) to background macro-task
  setImmediate(() => {
    (async () => {
      try {
        const [inviter, team] = await Promise.all([
          prisma.user.findUnique({
            where: {
              id: invitedById,
            },
            include: {
              profile: true,
            },
          }),
          prisma.team.findUnique({
            where: {
              id: teamId,
            },
          }),
          calculateUserAffinity(invitedById, data.invitedUserId),
          calculateUserAffinity(data.invitedUserId, invitedById),
        ]);

        await Promise.all([
          createActivity(
            invitedById,
            "TEAM_INVITE_SENT",
            "Invited user to team",
            `Invited user to join "${team?.name}"`,
            {
              teamId,
              invitedUserId: data.invitedUserId,
            },
          ),
          createNotification({
            userId: data.invitedUserId,
            type: "TEAM_INVITE",
            title: "New Team Invite",
            message: `${inviter?.profile?.fullName || inviter?.username || "Someone"} invited you to join "${team?.name}"`,
          }),
        ]);
      } catch (err) {
        console.error("Error executing background side-effects in inviteMember:", err);
      }
    })();
  });

  return invite;
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

  let memberAdded = false;
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

        memberAdded = true;

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

  // Offload social graph signals and analytics updates to a background task
  setImmediate(() => {
    (async () => {
      try {
        const sideEffects: Promise<any>[] = [];

        if (memberAdded) {
          sideEffects.push(
            addReputation(
              userId,
              "TEAM_JOINED",
              5,
              "Joined a team",
              {
                teamId: invite.teamId,
              },
            ),
            addTeamReputation(invite.teamId, 10),
            calculateEngineeringScore(userId),
            calculateUserAffinity(invite.invitedById, userId),
            calculateUserAffinity(userId, invite.invitedById),
            createActivity(
              userId,
              "TEAM_JOINED",
              "Joined a team",
              `Joined team "${invite.team.name}"`,
              {
                teamId: invite.teamId,
              },
            ),
          );
        }

        // Fetch receiver details for the notification
        const receiver = await prisma.user.findUnique({
          where: {
            id: userId,
          },
          include: {
            profile: true,
          },
        });

        sideEffects.push(
          createNotification({
            userId: invite.invitedById,
            type: "TEAM_INVITE",
            title: status === "ACCEPTED" ? "Invite Accepted" : "Invite Rejected",
            message:
              status === "ACCEPTED"
                ? `${receiver?.profile?.fullName || receiver?.username || "Someone"} accepted your team invite`
                : `${receiver?.profile?.fullName || receiver?.username || "Someone"} rejected your team invite`,
          })
        );

        await Promise.all(sideEffects);
      } catch (err) {
        console.error("Error executing background side-effects in reviewInvite:", err);
      }
    })();
  });

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

  // Offload reputation updates, activities, notifications, affinities to background macro-task
  setImmediate(() => {
    (async () => {
      try {
        const team = await prisma.team.findUnique({
          where: {
            id: teamId,
          },
        });

        const sideEffects: Promise<any>[] = [];

        sideEffects.push(
          createNotification({
            userId: memberUserId,

            type: "TEAM_INVITE",

            title: "Removed From Team",

            message: `You were removed from ${team?.name || "a team"}`,
          }),
          addReputation(
            memberUserId,

            "TEAM_REMOVED",

            -7,

            "Removed from team",

            {
              teamId,
            },
          ),
          addTeamReputation(teamId, -5),
          calculateEngineeringScore(memberUserId),
          calculateUserAffinity(requesterId, memberUserId),
          calculateUserAffinity(memberUserId, requesterId),
          createActivity(
            requesterId,

            "TEAM_MEMBER_REMOVED",

            "Removed team member",

            "Removed a member from team",

            {
              teamId,
              memberUserId,
            },
          )
        );

        await Promise.all(sideEffects);
      } catch (err) {
        console.error("Error executing background side-effects in removeTeamMember:", err);
      }
    })();
  });

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

  // Offload reputation updates, activity logs, engineering score to background macro-task
  setImmediate(() => {
    const sideEffects: Promise<any>[] = [];

    sideEffects.push(
      addReputation(
        userId,
        "TEAM_LEFT",
        -3,
        "Left a team",
        {
          teamId,
        },
      ),
      addTeamReputation(teamId, -2),
      calculateEngineeringScore(userId),
      createActivity(
        userId,
        "TEAM_LEFT",
        "Left a team",
        "Left a team",
        {
          teamId,
        },
      )
    );

    Promise.all(sideEffects).catch((err) => {
      console.error("Error executing background side-effects in leaveTeam:", err);
    });
  });

  return {
    success: true,
  };
};

export const archiveTeam = async (ownerId: string, teamId: string) => {
  let updatedTeam;
  try {
    updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
        ownerId,
      },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    });
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AppError("Team not found or unauthorized", 404);
    }
    throw error;
  }

  // Team reputation reduction
  await addTeamReputation(teamId, -10);

  // Activity
  createActivity(
    ownerId,

    "TEAM_ARCHIVED",

    "Archived a team",

    `Archived team "${updatedTeam.name}"`,

    {
      teamId,
    },
  ).catch(console.error);

  return updatedTeam;
};

export const restoreTeam = async (ownerId: string, teamId: string) => {
  let updatedTeam;
  try {
    updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
        ownerId,
      },
      data: {
        status: "ACTIVE",
        archivedAt: null,
      },
    });
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AppError("Team not found or unauthorized", 404);
    }
    throw error;
  }

  // Team reputation recovery
  await addTeamReputation(teamId, 5);

  // Activity
  createActivity(
    ownerId,

    "TEAM_RESTORED",

    "Restored a team",

    `Restored team "${updatedTeam.name}"`,

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

  // Not found
  if (!team) {
    throw new AppError("Team not found", 404);
  }

  // Already deleted
  if (team.status === "DELETED" || team.deletedAt) {
    throw new AppError("Team already deleted", 400);
  }

  // Authorization
  if (team.ownerId !== ownerId) {
    throw new AppError("Unauthorized", 403);
  }

  // Soft delete
  const updatedTeam = await prisma.team.update({
    where: {
      id: teamId,
    },

    data: {
      status: "DELETED",

      deletedAt: new Date(),
    },
  });

  // Offload member loop processing and team reputation penalty to background macro-task
  setImmediate(() => {
    (async () => {
      try {
        const sideEffects: Promise<any>[] = [];

        // Team reputation penalty
        sideEffects.push(addTeamReputation(teamId, -50));

        // Member penalties
        team.members.forEach((member) => {
          sideEffects.push(
            addReputation(
              member.userId,
              "TEAM_DELETED",
              -10,
              "Team deleted",
              {
                teamId,
              },
            ),
            calculateEngineeringScore(member.userId),
            createActivity(
              member.userId,
              "TEAM_DELETED",
              "Team deleted",
              `Team "${team.name}" was deleted`,
              {
                teamId,
              },
            )
          );

          if (member.userId !== ownerId) {
            sideEffects.push(
              createNotification({
                userId: member.userId,
                type: "TEAM_INVITE",
                title: "Team Deleted",
                message: `Team "${team.name}" was deleted`,
              })
            );
          }
        });

        await Promise.all(sideEffects);
      } catch (err) {
        console.error("Error executing background side-effects in deleteTeam:", err);
      }
    })();
  });

  return updatedTeam;
};

// ─── Update team (name / description) ────────────────────────────────────────

export const updateTeam = async (
  ownerId: string,
  teamId: string,
  data: { name?: string; description?: string },
) => {
  // Allow OWNER or ADMIN
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId: ownerId },
  });
  if (!membership) {
    throw new AppError("Team not found or unauthorized", 404);
  }
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
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

  setImmediate(() => {
    createActivity(
      ownerId,
      "TEAM_UPDATED",
      "Updated a team",
      `Updated team "${updated.name}"`,
      { teamId },
    ).catch(console.error);
  });

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

  // Offload team fetch and notification dispatch to background macro-task
  setImmediate(() => {
    (async () => {
      try {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        await createNotification({
          userId: memberUserId,
          type: "TEAM_INVITE",
          title: "Role Updated",
          message: `Your role in "${team?.name || "the team"}" was changed to ${newRole}`,
        });
      } catch (err) {
        console.error("Error executing background side-effects in promoteMember:", err);
      }
    })();
  });

  return updated;
};

// ─── Get my pending invites (across all teams) ────────────────────────────────

export const getMyPendingInvites = async (userId: string) => {
  return prisma.teamInvite.findMany({
    where: {
      invitedUserId: userId,
      status: "PENDING",
    },
    take: 50,
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


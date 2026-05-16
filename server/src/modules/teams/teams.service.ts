import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import { addReputation, addTeamReputation, rewardTeamMembers} from "modules/reputation/reputation.service";
import {  createActivity,} from "modules/activities/activity.service";

export const createTeam =  async (
    ownerId: string,
    data: any
  ) => {

    //
    // Remove duplicates
    //
    const uniqueMembers =
      Array.from(
        new Set([
          ...(data.members || []),
          ownerId,
        ])
      );

    //
    // Create team
    //
    const team =
      await prisma.team.create({

        data: {

          name:
            data.name,

          description:
            data.description,

          ownerId,

          members: {

            create:
              uniqueMembers.map(
                (
                  userId: string
                ) => ({

                  userId,

                  role:
                    userId ===
                    ownerId
                      ? "OWNER"
                      : "MEMBER",
                })
              ),
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

          create:
            uniqueMembers.map(
              (
                userId: string
              ) => ({
                userId,
              })
            ),
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
      }
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
        teamId:
          team.id,
      }
    ).catch(console.error);

    return team;
  };

export const getMyTeams =  async (userId: string) => {

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

export const getTeamById =  async (teamId: string) => {

    const team =
      await prisma.team.findUnique({
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
      throw new AppError(
        "Team not found",
        404
      );
    }

    return team;
  };

export const inviteMember =  async (
    invitedById: string,
    teamId: string,
    data: any
  ) => {

    const membership =
      await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: invitedById,
        },
      });

    if (!membership) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    if (
      data.invitedUserId === invitedById
    ) {
      throw new AppError(
        "Cannot invite yourself",
        400
      );
    }

    const existingMember =
      await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: data.invitedUserId,
        },
      });

    if (existingMember) {
      throw new AppError(
        "User already in team",
        400
      );
    }

    const existingInvite =
      await prisma.teamInvite.findFirst({
        where: {
          teamId,

          invitedUserId:
            data.invitedUserId,

          status: "PENDING",
        },
      });

    if (existingInvite) {
      throw new AppError(
        "Invite already pending",
        400
      );
    }

    const invite =
      await prisma.teamInvite.create({
        data: {
          teamId,

          invitedUserId:
            data.invitedUserId,

          invitedById,

          message: data.message,
        },
      });

    createNotification({
      userId: data.invitedUserId,

      type: "TEAM_INVITE",

      title: "New Team Invite",

      message:
        "You received a new team invitation",
    }).catch(console.error);

    return invite;
  };

export const reviewInvite =  async (
    userId: string,
    inviteId: string,
    status: "ACCEPTED" | "REJECTED"
  ) => {

    const invite =
      await prisma.teamInvite.findUnique({
        where: {
          id: inviteId,
        },

        include: {
          team: true,
        },
      });

    if (!invite) {
      throw new AppError(
        "Invite not found",
        404
      );
    }

    if (
      invite.invitedUserId !== userId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    if (invite.status !== "PENDING") {
      throw new AppError(
        "Invite already reviewed",
        400
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {

          const updatedInvite =
            await tx.teamInvite.update({
              where: {
                id: inviteId,
              },

              data: {
                status,
                reviewedAt: new Date(),
              },
            });

          if (status === "ACCEPTED") {

            const existingMember =
              await tx.teamMember.findFirst({
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
  }
).catch(console.error);
              const teamConversation =
  await tx.conversation.findFirst({
    where: {
      teamId: invite.teamId,
      type: "TEAM",
    },
  });

if (teamConversation) {

  await tx.conversationParticipant.create({
    data: {
      conversationId:
        teamConversation.id,

      userId,
    },
  });
}
            }
          }

          return updatedInvite;
        }
      );

    createNotification({
      userId: invite.invitedById,

      type: "TEAM_INVITE",

      title:
        status === "ACCEPTED"
          ? "Invite Accepted"
          : "Invite Rejected",

      message:
        status === "ACCEPTED"
          ? "Your team invite was accepted"
          : "Your team invite was rejected",
    }).catch(console.error);

    return result;
  };

  export const withdrawInvite =  async (
    userId: string,
    inviteId: string
  ) => {

    const invite =
      await prisma.teamInvite.findUnique({
        where: {
          id: inviteId,
        },
      });

    if (!invite) {
      throw new AppError(
        "Invite not found",
        404
      );
    }

    if (
      invite.invitedById !== userId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    if (invite.status !== "PENDING") {
      throw new AppError(
        "Only pending invites can be withdrawn",
        400
      );
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

  export const removeTeamMember =  async (
    requesterId: string,
    teamId: string,
    memberUserId: string
  ) => {

    const requesterMembership =
      await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: requesterId,
        },
      });

    if (!requesterMembership) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    // Only OWNER or ADMIN
    if (
      requesterMembership.role !==
        "OWNER" &&
      requesterMembership.role !==
        "ADMIN"
    ) {
      throw new AppError(
        "Insufficient permissions",
        403
      );
    }

    const targetMembership =
      await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: memberUserId,
        },
      });

    if (!targetMembership) {
      throw new AppError(
        "Member not found",
        404
      );
    }

    // Cannot remove owner
    if (
      targetMembership.role ===
      "OWNER"
    ) {
      throw new AppError(
        "Cannot remove owner",
        400
      );
    }

    await prisma.teamMember.delete({
      where: {
        id: targetMembership.id,
      },
    });

    createNotification({
      userId: memberUserId,

      type: "TEAM_INVITE",

      title: "Removed From Team",

      message:
        "You were removed from a team",
    }).catch(console.error);

    // Reputation penalty
addReputation(
  memberUserId,

  "TEAM_REMOVED",

  -7,

  "Removed from team",

  {
    teamId,
  }
).catch(console.error);

    return {
      success: true,
    };
  };

  export const leaveTeam =  async (
    userId: string,
    teamId: string
  ) => {

    const membership =
      await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId,
        },
      });

    if (!membership) {
      throw new AppError(
        "Not a team member",
        404
      );
    }

    // Owner cannot leave directly
    if (
      membership.role === "OWNER"
    ) {
      throw new AppError(
        "Transfer ownership before leaving team",
        400
      );
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
  }
).catch(console.error);

    return {
      success: true,
    };
  };

export const archiveTeam =  async (
    ownerId: string,
    teamId: string
  ) => {

    const team =
      await prisma.team.findUnique({
        where: {
          id: teamId,
        },
      });

    if (!team) {
      throw new AppError(
        "Team not found",
        404
      );
    }

    if (
      team.ownerId !== ownerId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    return prisma.team.update({
      where: {
        id: teamId,
      },

      data: {
        status: "ARCHIVED",

        archivedAt:
          new Date(),
      },
    });
  };

  export const restoreTeam = async (
    ownerId: string,
    teamId: string
  ) => {

    const team =
      await prisma.team.findUnique({
        where: {
          id: teamId,
        },
      });

    if (!team) {
      throw new AppError(
        "Team not found",
        404
      );
    }

    if (
      team.ownerId !== ownerId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    return prisma.team.update({
      where: {
        id: teamId,
      },

      data: {
        status: "ACTIVE",

        archivedAt: null,
      },
    });
  };

export const deleteTeam =  async (
    ownerId: string,
    teamId: string
  ) => {

    const team =
      await prisma.team.findUnique({

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

      throw new AppError(
        "Team not found",
        404
      );
    }

    //
    // Already deleted
    //
    if (
      team.status ===
        "DELETED" ||
      team.deletedAt
    ) {

      throw new AppError(
        "Team already deleted",
        400
      );
    }

    //
    // Authorization
    //
    if (
      team.ownerId !==
      ownerId
    ) {

      throw new AppError(
        "Unauthorized",
        403
      );
    }

    //
    // Soft delete
    //
    const updatedTeam =
      await prisma.team.update({

        where: {
          id: teamId,
        },

        data: {

          status:
            "DELETED",

          deletedAt:
            new Date(),
        },
      });

    //
    // Team reputation penalty
    //
    await addTeamReputation(
      teamId,
      -50
    );

    //
    // Member penalties
    //
    await Promise.all(

      team.members.map(
        (member) =>

          addReputation(
            member.userId,

            "TEAM_DELETED",

            -10,

            "Team deleted",

            {
              teamId,
            }
          )
      )
    );

    return updatedTeam;
  };
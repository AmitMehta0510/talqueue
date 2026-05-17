import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";
import { addReputation } from "modules/reputation/reputation.service";
import { calculateUserAffinity } from "modules/affinity/affinity.service";
import { createActivity } from "modules/activities/activity.service";

export const followUser = async (
  followerId: string,
  followingId: string
) => {

  if (
    followerId === followingId
  ) {
    throw new AppError(
      "Cannot follow yourself",
      400
    );
  }

  const existingFollow =
    await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

  if (existingFollow) {
    throw new AppError(
      "Already following user",
      400
    );
  }

  const follow =
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

  const followingUser =
    await prisma.user.findUnique({
      where: {
        id: followingId,
      },

      include: {
        profile: true,
      },
    });

  const follower =
    await prisma.user.findUnique({
      where: {
        id: followerId,
      },

      include: {
        profile: true,
      },
    });

  //
  // Reputation
  //
  addReputation(
    followingId,
    "NEW_FOLLOWER",
    1,
    "Received a new follower",
    {
      followerId,
    }
  ).catch(console.error);

  //
  // Activity
  //
  createActivity(
    followerId,
    "USER_FOLLOWED",
    "Started following a user",
    `Started following ${followingUser?.username || "user"}`,
    {
      targetUserId:
        followingId,
    }
  ).catch(console.error);

  //
  // Affinity
  //
  await calculateUserAffinity(
    followerId,
    followingId
  );

  await calculateUserAffinity(
    followingId,
    followerId
  );

  //
  // Notification
  //
  createNotification({
    userId: followingId,

    type: "FOLLOW",

    title: "New Follower",

    message:
      `${follower?.profile?.fullName || follower?.username || "Someone"} started following you`,
  }).catch(console.error);

  return follow;
};

export const unfollowUser =  async (
    followerId: string,
    followingId: string
  ) => {

    const existingFollow =
      await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

    if (!existingFollow) {
      throw new AppError(
        "Follow not found",
        404
      );
    }

    await prisma.follow.delete({
      where: {
        id: existingFollow.id,
      },
    });

    return {
      success: true,
    };
  };

export const sendConnectionRequest = async (
  senderId: string,
  receiverId: string
) => {

  if (
    senderId === receiverId
  ) {
    throw new AppError(
      "Cannot connect with yourself",
      400
    );
  }

  const existingConnection =
    await prisma.connection.findFirst({
      where: {
        OR: [
          {
            senderId,
            receiverId,
          },

          {
            senderId:
              receiverId,

            receiverId:
              senderId,
          },
        ],
      },
    });

  if (existingConnection) {
    throw new AppError(
      "Connection already exists",
      400
    );
  }

  const connection =
    await prisma.connection.create({
      data: {
        senderId,
        receiverId,
      },
    });

  const sender =
    await prisma.user.findUnique({
      where: {
        id: senderId,
      },

      include: {
        profile: true,
      },
    });

  const receiver =
    await prisma.user.findUnique({
      where: {
        id: receiverId,
      },

      include: {
        profile: true,
      },
    });

  //
  // Activity
  //
  createActivity(
    senderId,
    "CONNECTION_REQUEST_SENT",
    "Sent a connection request",
    `Sent connection request to ${receiver?.username || "user"}`,
    {
      receiverId,
    }
  ).catch(console.error);

  //
  // Affinity
  //
  await calculateUserAffinity(
    senderId,
    receiverId
  );

  await calculateUserAffinity(
    receiverId,
    senderId
  );

  //
  // Notification
  //
  createNotification({
    userId: receiverId,

    type:
      "CONNECTION_REQUEST",

    title:
      "New Connection Request",

    message:
      `${sender?.profile?.fullName || sender?.username || "Someone"} sent you a connection request`,
  }).catch(console.error);

  return connection;
};

export const reviewConnectionRequest = async (
  userId: string,
  connectionId: string,
  status:
    | "ACCEPTED"
    | "REJECTED"
) => {

  const connection =
    await prisma.connection.findUnique({
      where: {
        id: connectionId,
      },
    });

  if (!connection) {
    throw new AppError(
      "Connection not found",
      404
    );
  }

  if (
    connection.receiverId !==
    userId
  ) {
    throw new AppError(
      "Unauthorized",
      403
    );
  }

  if (
    connection.status !==
    "PENDING"
  ) {
    throw new AppError(
      "Already reviewed",
      400
    );
  }

  const updatedConnection =
    await prisma.connection.update({
      where: {
        id: connectionId,
      },

      data: {
        status,
        reviewedAt:
          new Date(),
      },
    });

  if (status === "ACCEPTED") {

    //
    // Reputation
    //
    await addReputation(
      connection.senderId,
      "CONNECTION_ACCEPTED",
      5,
      "Connection request accepted",
      {
        connectionId,
      }
    );

    await addReputation(
      userId,
      "NEW_CONNECTION",
      5,
      "Accepted a connection request",
      {
        connectionId,
      }
    );

    //
    // Affinity
    //
    await calculateUserAffinity(
      connection.senderId,
      connection.receiverId
    );

    await calculateUserAffinity(
      connection.receiverId,
      connection.senderId
    );

    const receiver =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        include: {
          profile: true,
        },
      });

    //
    // Notification
    //
    createNotification({
      userId:
        connection.senderId,

      type:
        "CONNECTION_ACCEPTED",

      title:
        "Connection Accepted",

      message:
        `${receiver?.profile?.fullName || receiver?.username || "Someone"} accepted your connection request`,
    }).catch(console.error);
  }

  return updatedConnection;
};

export const getFollowers =  async (userId: string) => {

    return prisma.follow.findMany({
      where: {
        followingId: userId,
      },

      include: {
        follower: {
          include: {
            profile: true,
          },
        },
      },
    });
  };

export const getFollowing =  async (userId: string) => {

    return prisma.follow.findMany({
      where: {
        followerId: userId,
      },

      include: {
        following: {
          include: {
            profile: true,
          },
        },
      },
    });
  };

export const getConnections =  async (userId: string) => {

    return prisma.connection.findMany({
      where: {
        OR: [
          {
            senderId: userId,
          },

          {
            receiverId: userId,
          },
        ],

        status: "ACCEPTED",
      },

      include: {
        sender: {
          include: {
            profile: true,
          },
        },

        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });
  };

export const getSuggestedConnections =  async (userId: string) => {

    //
    // Existing connections
    //
    const myConnections =
      await prisma.connection.findMany({
        where: {

          OR: [
            {
              senderId: userId,
            },

            {
              receiverId: userId,
            },
          ],

          status: "ACCEPTED",
        },
      });

    const connectedUserIds =
      myConnections.map(
        (c) =>
          c.senderId === userId
            ? c.receiverId
            : c.senderId
      );

    connectedUserIds.push(userId);

    //
    // Affinity users
    //
    const affinities =
      await prisma.userAffinity.findMany({
        where: {
          userId,

          targetUserId: {
            notIn:
              connectedUserIds,
          },
        },

        include: {
          targetUser: {

            include: {

              profile: {
                include: {
                  college: true,
                  department: true,
                },
              },

              skills: {
                include: {
                  skill: true,
                },
              },
            },
          },
        },

        orderBy: {
          score: "desc",
        },

        take: 20,
      });

    //
    // Return enriched users
    //
    return affinities.map(
      (affinity) => ({

        ...affinity.targetUser,

        affinityScore:
          affinity.score,

        interactionCount:
          affinity.interactionCount,

        collaborationScore:
          affinity.collaborationScore,

        skillSimilarityScore:
          affinity.skillSimilarityScore,

        socialScore:
          affinity.socialScore,
      })
    );
  }; 

export const getMutualConnections =  async (
    currentUserId: string,
    otherUserId: string
  ) => {

    const currentConnections =
      await prisma.connection.findMany({
        where: {
          OR: [
            {
              senderId:
                currentUserId,
            },

            {
              receiverId:
                currentUserId,
            },
          ],

          status: "ACCEPTED",
        },
      });

    const otherConnections =
      await prisma.connection.findMany({
        where: {
          OR: [
            {
              senderId:
                otherUserId,
            },

            {
              receiverId:
                otherUserId,
            },
          ],

          status: "ACCEPTED",
        },
      });

    const currentIds =
      currentConnections.map(
        (c) =>
          c.senderId ===
          currentUserId
            ? c.receiverId
            : c.senderId
      );

    const otherIds =
      otherConnections.map(
        (c) =>
          c.senderId ===
          otherUserId
            ? c.receiverId
            : c.senderId
      );

    const mutualIds =
      currentIds.filter(
        (id) =>
          otherIds.includes(id)
      );

    return prisma.user.findMany({
      where: {
        id: {
          in: mutualIds,
        },
      },

      include: {
        profile: true,
      },
    });
  };  
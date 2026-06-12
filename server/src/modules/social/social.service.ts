import { Prisma } from "@prisma/client";

import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";
import { addReputation } from "modules/reputation/reputation.service";
import { calculateUserAffinity } from "modules/affinity/affinity.service";
import { createActivity } from "modules/activities/activity.service";

type ConnectionReviewStatus = "ACCEPTED" | "REJECTED";

interface PaginationParams {
  cursor?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const compactUserSelect = {
  id: true,
  username: true,
  verifiedEngineer: true,
  primaryRole: true,
  followersCount: true,
  followingCount: true,
  connectionCount: true,
  acceptingReferrals: true,
  profile: {
    select: {
      fullName: true,
      avatarUrl: true,
      headline: true,
      college: true,
      department: true,
    },
  },
} satisfies Prisma.UserSelect;

const suggestionUserSelect = {
  ...compactUserSelect,
  skills: {
    select: {
      level: true,
      skill: true,
    },
    take: 12,
  },
} satisfies Prisma.UserSelect;

const clampLimit = (limit?: number) =>
  Math.min(MAX_LIMIT, Math.max(1, limit || DEFAULT_LIMIT));

const displayName = (
  user?: {
    username?: string | null;
    profile?: {
      fullName?: string | null;
    } | null;
  } | null,
) => user?.profile?.fullName || user?.username || "Someone";

const runAffinityUpdates = (pairs: Array<[string, string]>) => {
  Promise.all(
    pairs
      .filter(([sourceUserId, targetUserId]) => sourceUserId !== targetUserId)
      .map(([sourceUserId, targetUserId]) =>
        calculateUserAffinity(sourceUserId, targetUserId),
      ),
  ).catch(console.error);
};

const paginate = <T extends { id: string }>(items: T[], limit: number) => {
  const hasNextPage = items.length > limit;

  const pageItems = hasNextPage ? items.slice(0, limit) : items;

  return {
    items: pageItems,
    nextCursor: hasNextPage ? pageItems[pageItems.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};

const ensureUserExists = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: compactUserSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const followUser = async (followerId: string, followingId: string) => {
  if (followerId === followingId) {
    throw new AppError("Cannot follow yourself", 400);
  }

  const [follower, followingUser] = await Promise.all([
    ensureUserExists(followerId),
    ensureUserExists(followingId),
  ]);

  try {
    const follow = await prisma.$transaction(async (tx) => {
      const createdFollow = await tx.follow.create({
        data: {
          followerId,
          followingId,
        },
      });

      await Promise.all([
        tx.user.update({
          where: {
            id: followerId,
          },

          data: {
            followingCount: {
              increment: 1,
            },
          },
        }),

        tx.user.update({
          where: {
            id: followingId,
          },

          data: {
            followersCount: {
              increment: 1,
            },
          },
        }),
      ]);

      return createdFollow;
    });

    addReputation(followingId, "NEW_FOLLOWER", 1, "Received a new follower", {
      followerId,
    }).catch(console.error);

    createActivity(
      followerId,
      "USER_FOLLOWED",
      "Started following a user",
      `Started following ${followingUser.username || "user"}`,
      {
        targetUserId: followingId,
      },
    ).catch(console.error);

    runAffinityUpdates([
      [followerId, followingId],
      [followingId, followerId],
    ]);

    createNotification({
      userId: followingId,
      actorId: followerId,
      type: "FOLLOW",
      title: "New Follower",
      message: `${displayName(follower)} started following you`,
      entityType: "PROFILE",
      entityId: followerId,
      actionUrl: `/users/${followerId}`,
      metadata: {
        followerId,
      },
      groupKey: `follow-${followerId}-${followingId}`,
    }).catch(console.error);

    return follow;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Already following user", 400);
    }

    throw error;
  }
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },

    select: {
      id: true,
    },
  });

  if (!existingFollow) {
    throw new AppError("Follow not found", 404);
  }

  await prisma.$transaction([
    prisma.follow.delete({
      where: {
        id: existingFollow.id,
      },
    }),

    prisma.user.update({
      where: {
        id: followerId,
      },

      data: {
        followingCount: {
          decrement: 1,
        },
      },
    }),

    prisma.user.update({
      where: {
        id: followingId,
      },

      data: {
        followersCount: {
          decrement: 1,
        },
      },
    }),
  ]);

  return {
    success: true,
  };
};

export const sendConnectionRequest = async (
  senderId: string,
  receiverId: string,
) => {
  if (senderId === receiverId) {
    throw new AppError("Cannot connect with yourself", 400);
  }

  const [sender, receiver] = await Promise.all([
    ensureUserExists(senderId),
    ensureUserExists(receiverId),
  ]);

  const connection = await prisma.$transaction(
    async (tx) => {
      const existingConnection = await tx.connection.findFirst({
        where: {
          OR: [
            {
              senderId,
              receiverId,
            },
            {
              senderId: receiverId,
              receiverId: senderId,
            },
          ],
        },

        select: {
          id: true,
          status: true,
        },
      });

      if (existingConnection) {
        const message =
          existingConnection.status === "ACCEPTED"
            ? "Already connected"
            : "Connection request already exists";

        throw new AppError(message, 400);
      }

      return tx.connection.create({
        data: {
          senderId,
          receiverId,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  createActivity(
    senderId,
    "CONNECTION_REQUEST_SENT",
    "Sent a connection request",
    `Sent connection request to ${receiver.username || "user"}`,
    {
      receiverId,
    },
  ).catch(console.error);

  runAffinityUpdates([
    [senderId, receiverId],
    [receiverId, senderId],
  ]);

  createNotification({
    userId: receiverId,
    actorId: senderId,
    type: "CONNECTION_REQUEST",
    title: "New Connection Request",
    message: `${displayName(sender)} sent you a connection request`,
    entityType: "PROFILE",
    entityId: senderId,
    actionUrl: `/users/${senderId}`,
    metadata: {
      connectionId: connection.id,
    },
    groupKey: `connection-request-${connection.id}`,
  }).catch(console.error);

  return connection;
};

export const reviewConnectionRequest = async (
  userId: string,
  connectionId: string,
  status: ConnectionReviewStatus,
) => {
  const connection = await prisma.connection.findUnique({
    where: {
      id: connectionId,
    },

    select: {
      id: true,
      senderId: true,
      receiverId: true,
      status: true,
    },
  });

  if (!connection) {
    throw new AppError("Connection not found", 404);
  }

  if (connection.receiverId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  if (connection.status !== "PENDING") {
    throw new AppError("Already reviewed", 400);
  }

  const reviewedAt = new Date();

  const updatedConnection = await prisma.$transaction(async (tx) => {
    const updated = await tx.connection.update({
      where: {
        id: connectionId,
      },

      data: {
        status,
        reviewedAt,
        lastInteractionAt: status === "ACCEPTED" ? reviewedAt : undefined,
      },
    });

    if (status === "ACCEPTED") {
      await Promise.all([
        tx.user.update({
          where: {
            id: connection.senderId,
          },

          data: {
            connectionCount: {
              increment: 1,
            },
          },
        }),

        tx.user.update({
          where: {
            id: connection.receiverId,
          },

          data: {
            connectionCount: {
              increment: 1,
            },
          },
        }),
      ]);
    }

    return updated;
  });

  if (status === "ACCEPTED") {
    const receiver = await ensureUserExists(userId);

    Promise.all([
      addReputation(
        connection.senderId,
        "CONNECTION_ACCEPTED",
        5,
        "Connection request accepted",
        {
          connectionId,
        },
      ),
      addReputation(
        userId,
        "NEW_CONNECTION",
        5,
        "Accepted a connection request",
        {
          connectionId,
        },
      ),
    ]).catch(console.error);

    runAffinityUpdates([
      [connection.senderId, connection.receiverId],
      [connection.receiverId, connection.senderId],
    ]);

    createNotification({
      userId: connection.senderId,
      actorId: userId,
      type: "CONNECTION_ACCEPTED",
      title: "Connection Accepted",
      message: `${displayName(receiver)} accepted your connection request`,
      entityType: "PROFILE",
      entityId: userId,
      actionUrl: `/users/${userId}`,
      metadata: {
        connectionId,
      },
      groupKey: `connection-accepted-${connectionId}`,
    }).catch(console.error);
  }

  return updatedConnection;
};

export const getFollowers = async (
  userId: string,
  viewerId?: string,
  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const followers = await prisma.follow.findMany({
    where: {
      followingId: userId,
    },

    select: {
      id: true,
      createdAt: true,
      follower: {
        select: compactUserSelect,
      },
    },

    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },
          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const page = paginate(followers, limit);

  const followerUserIds = page.items.map((f) => f.follower.id);
  const connections = viewerId && followerUserIds.length > 0
    ? await prisma.connection.findMany({
        where: {
          OR: [
            { senderId: viewerId, receiverId: { in: followerUserIds } },
            { senderId: { in: followerUserIds }, receiverId: viewerId },
          ],
        },
        select: { senderId: true, receiverId: true, status: true },
      })
    : [];

  const connectionMap = new Map<string, string>();
  for (const conn of connections) {
    const targetId = conn.senderId === viewerId ? conn.receiverId : conn.senderId;
    connectionMap.set(targetId, conn.status);
  }

  const enrichedItems = page.items.map((item) => ({
    ...item,
    follower: {
      ...item.follower,
      connectionStatus: connectionMap.get(item.follower.id) || "NONE",
    },
  }));

  return {
    followers: enrichedItems,
    nextCursor: page.nextCursor,
    hasNextPage: page.hasNextPage,
    limit: page.limit,
  };
};

export const getFollowing = async (
  userId: string,
  viewerId?: string,
  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const following = await prisma.follow.findMany({
    where: {
      followerId: userId,
    },

    select: {
      id: true,
      createdAt: true,
      following: {
        select: compactUserSelect,
      },
    },

    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },
          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const page = paginate(following, limit);

  const followingUserIds = page.items.map((f) => f.following.id);
  const connections = viewerId && followingUserIds.length > 0
    ? await prisma.connection.findMany({
        where: {
          OR: [
            { senderId: viewerId, receiverId: { in: followingUserIds } },
            { senderId: { in: followingUserIds }, receiverId: viewerId },
          ],
        },
        select: { senderId: true, receiverId: true, status: true },
      })
    : [];

  const connectionMap = new Map<string, string>();
  for (const conn of connections) {
    const targetId = conn.senderId === viewerId ? conn.receiverId : conn.senderId;
    connectionMap.set(targetId, conn.status);
  }

  const enrichedItems = page.items.map((item) => ({
    ...item,
    following: {
      ...item.following,
      connectionStatus: connectionMap.get(item.following.id) || "NONE",
    },
  }));

  return {
    following: enrichedItems,
    nextCursor: page.nextCursor,
    hasNextPage: page.hasNextPage,
    limit: page.limit,
  };
};

export const getConnections = async (
  userId: string,
  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const connections = await prisma.connection.findMany({
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

    select: {
      id: true,
      senderId: true,
      receiverId: true,
      createdAt: true,
      reviewedAt: true,
      sender: {
        select: compactUserSelect,
      },
      receiver: {
        select: compactUserSelect,
      },
    },

    orderBy: [
      {
        reviewedAt: "desc",
      },
      {
        id: "desc",
      },
    ],

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },
          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const page = paginate(connections, limit);

  return {
    connections: page.items.map((connection) => ({
      ...connection,
      user:
        connection.senderId === userId
          ? connection.receiver
          : connection.sender,
    })),
    nextCursor: page.nextCursor,
    hasNextPage: page.hasNextPage,
    limit: page.limit,
  };
};

export const getSuggestedConnections = async (
  userId: string,
  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const [connections, followedUsers] = await Promise.all([
    prisma.connection.findMany({
      where: {
        OR: [
          {
            senderId: userId,
          },
          {
            receiverId: userId,
          },
        ],
      },

      select: {
        senderId: true,
        receiverId: true,
      },
    }),

    prisma.follow.findMany({
      where: {
        followerId: userId,
      },

      select: {
        followingId: true,
      },
    }),
  ]);

  const excludedUserIds = new Set<string>([
    userId,
    ...followedUsers.map((follow) => follow.followingId),
  ]);

  for (const connection of connections) {
    excludedUserIds.add(
      connection.senderId === userId
        ? connection.receiverId
        : connection.senderId,
    );
  }

  const affinities = await prisma.userAffinity.findMany({
    where: {
      userId,
      targetUserId: {
        notIn: [...excludedUserIds],
      },
    },

    select: {
      id: true,
      score: true,
      interactionCount: true,
      collaborationScore: true,
      skillSimilarityScore: true,
      socialScore: true,
      targetUser: {
        select: suggestionUserSelect,
      },
    },

    orderBy: [
      {
        score: "desc",
      },
      {
        id: "desc",
      },
    ],

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },
          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const page = paginate(affinities, limit);

  return {
    users: page.items.map((affinity) => ({
      ...affinity.targetUser,
      affinityScore: affinity.score,
      interactionCount: affinity.interactionCount,
      collaborationScore: affinity.collaborationScore,
      skillSimilarityScore: affinity.skillSimilarityScore,
      socialScore: affinity.socialScore,
    })),
    nextCursor: page.nextCursor,
    hasNextPage: page.hasNextPage,
    limit: page.limit,
  };
};

export const getMutualConnections = async (
  currentUserId: string,
  otherUserId: string,
  params: PaginationParams = {},
) => {
  if (currentUserId === otherUserId) {
    return {
      users: [],
      nextCursor: null,
      hasNextPage: false,
      limit: clampLimit(params.limit),
    };
  }

  const limit = clampLimit(params.limit);

  const [currentConnections, otherConnections] = await Promise.all([
    prisma.connection.findMany({
      where: {
        OR: [
          {
            senderId: currentUserId,
          },
          {
            receiverId: currentUserId,
          },
        ],

        status: "ACCEPTED",
      },

      select: {
        senderId: true,
        receiverId: true,
      },
    }),

    prisma.connection.findMany({
      where: {
        OR: [
          {
            senderId: otherUserId,
          },
          {
            receiverId: otherUserId,
          },
        ],

        status: "ACCEPTED",
      },

      select: {
        senderId: true,
        receiverId: true,
      },
    }),
  ]);

  const otherConnectionIds = new Set(
    otherConnections.map((connection) =>
      connection.senderId === otherUserId
        ? connection.receiverId
        : connection.senderId,
    ),
  );

  const mutualIds = currentConnections
    .map((connection) =>
      connection.senderId === currentUserId
        ? connection.receiverId
        : connection.senderId,
    )
    .filter((id) => otherConnectionIds.has(id));

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: mutualIds,
      },
    },

    select: compactUserSelect,

    orderBy: [
      {
        username: "asc",
      },
      {
        id: "asc",
      },
    ],

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },
          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const page = paginate(users, limit);

  return {
    users: page.items,
    nextCursor: page.nextCursor,
    hasNextPage: page.hasNextPage,
    limit: page.limit,
  };
};

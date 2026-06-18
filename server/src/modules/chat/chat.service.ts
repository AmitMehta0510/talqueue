import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import { calculateUserAffinity } from "modules/affinity/affinity.service";

import { createActivity } from "modules/activities/activity.service";

import { trackInteraction } from "modules/interaction/interaction-tracking.service";

import { getIO } from "./socket";

const GROUP_CONVERSATION_TYPES = [
  "GROUP",
  "TEAM",
  "PROJECT",
  "HACKATHON",
  "COMMUNITY",
];

const getConversationRoom = (conversationId: string) => conversationId;

const emitToConversation = (
  conversationId: string,
  event: string,
  payload: unknown,
) => {
  try {
    getIO().to(getConversationRoom(conversationId)).emit(event, payload);
  } catch {
    // Socket server is not available in tests or bootstrapping paths.
  }
};

const emitToUser = (userId: string, event: string, payload: unknown) => {
  try {
    getIO().to(`user:${userId}`).emit(event, payload);
  } catch {
    // Socket server is not available in tests or bootstrapping paths.
  }
};

const ensureParticipant = async (userId: string, conversationId: string) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    include: {
      conversation: true,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }

  return participant;
};

const ensureParticipantExists = async (
  userId: string,
  conversationId: string,
) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }
};

const normalizeAttachments = (attachments?: any[]) =>
  (attachments || []).map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    dataUrl: attachment.dataUrl,
    mimeType: attachment.mimeType,
    size: attachment.size,
    type: attachment.type,
    width: attachment.width,
    height: attachment.height,
    duration: attachment.duration,
  }));

const notifyMessageRecipients = (
  participants: Array<{ userId: string; muted: boolean }>,
  senderId: string,
  conversationId: string,
  messageId: string,
  content?: string,
) => {
  for (const participant of participants) {
    if (participant.muted) {
      continue;
    }

    createNotification({
      userId: participant.userId,
      actorId: senderId,
      type: "MESSAGE",
      title: "New Message",
      message: content || "Sent an attachment",
      entityId: conversationId,
      entityType: "PROFILE",
      metadata: {
        conversationId,
        messageId,
      },
    }).catch(console.error);
  }
};

const updateMessageAffinities = (
  senderId: string,
  participants: Array<{ userId: string }>,
) => {
  Promise.all(
    participants.flatMap((participant) => [
      calculateUserAffinity(senderId, participant.userId),
      calculateUserAffinity(participant.userId, senderId),
    ]),
  ).catch(console.error);
};

export const createDirectConversation = async (
  currentUserId: string,
  otherUserId: string,
) => {
  if (currentUserId === otherUserId) {
    throw new AppError("Cannot chat with yourself", 400);
  }

  //
  // Existing conversation
  //
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      type: "DIRECT",

      participants: {
        every: {
          userId: {
            in: [currentUserId, otherUserId],
          },
        },
      },
    },

    include: {
      participants: true,
    },
  });

  if (existingConversation && existingConversation.participants.length === 2) {
    return existingConversation;
  }

  //
  // Create conversation
  //
  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",

      participants: {
        create: [
          {
            userId: currentUserId,
          },

          {
            userId: otherUserId,
          },
        ],
      },
    },

    include: {
      participants: true,
    },
  });

  Promise.all([
    calculateUserAffinity(currentUserId, otherUserId),
    calculateUserAffinity(otherUserId, currentUserId),
  ]).catch(console.error);

  //
  // Activity
  //
  createActivity(
    currentUserId,

    "MESSAGE_SENT",

    "Started conversation",

    "Started a direct conversation",

    {
      conversationId: conversation.id,
    },
  ).catch(console.error);

  return conversation;
};

export const createGroupConversation = async (
  currentUserId: string,
  data: {
    title: string;
    description?: string;
    avatarUrl?: string;
    participantIds: string[];
  },
) => {
  const participantIds = Array.from(
    new Set([currentUserId, ...data.participantIds]),
  );

  if (participantIds.length < 2) {
    throw new AppError(
      "Group conversation needs at least two participants",
      400,
    );
  }

  const usersCount = await prisma.user.count({
    where: {
      id: {
        in: participantIds,
      },
    },
  });

  if (usersCount !== participantIds.length) {
    throw new AppError("One or more participants were not found", 404);
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "GROUP",
      title: data.title,
      description: data.description,
      avatarUrl: data.avatarUrl,
      createdById: currentUserId,
      participants: {
        create: participantIds.map((userId) => ({
          userId,
        })),
      },
    },
    include: {
      participants: {
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

  createActivity(
    currentUserId,
    "MESSAGE_SENT",
    "Created group conversation",
    `Created ${data.title}`,
    {
      conversationId: conversation.id,
    },
  ).catch(console.error);

  emitToConversation(conversation.id, "conversation_created", {
    conversation,
  });

  setImmediate(() => {
    for (const participantId of participantIds) {
      emitToUser(participantId, "conversation_created", {
        conversation,
      });
    }
  });

  return conversation;
};

export const getMyConversations = async (userId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId,
          archived: false,
          deletedAt: null,
        },
      },
      archived: false,
    },

    include: {
      participants: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },

      messages: {
        orderBy: {
          createdAt: "desc",
        },

        take: 1,
      },
    },

    orderBy: {
      updatedAt: "desc",
    },
  });

  return conversations.map((conversation) => {
    const participant = conversation.participants.find(
      (item) => item.userId === userId,
    );

    return {
      ...conversation,

      unreadCount: participant?.unreadCount || 0,
    };
  });
};

export const getConversationMessages = async (
  userId: string,
  conversationId: string,
  cursor?: string,
) => {
  await ensureParticipantExists(userId, conversationId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },

    include: {
      sender: {
        include: {
          profile: true,
        },
      },

      replyToMessage: {
        include: {
          sender: {
            include: {
              profile: true,
            },
          },
        },
      },

      reactions: true,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 30,

    ...(cursor && {
      cursor: {
        id: cursor,
      },

      skip: 1,
    }),
  });

  return {
    messages: messages.reverse(),

    nextCursor: messages.length ? messages[messages.length - 1].id : null,
  };
};

export const sendMessage = async (
  userId: string,
  conversationId: string,
  data: {
    content?: string;
    type?: any;
    attachments?: any;
    replyToMessageId?: string;
  },
) => {
  const now = new Date();

  const { message, participants } = await prisma.$transaction(async (tx) => {
    const participant = await tx.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!participant) {
      throw new AppError("Unauthorized", 403);
    }

    if (data.replyToMessageId) {
      const replyMessage = await tx.message.findUnique({
        where: {
          id: data.replyToMessageId,
        },
        select: {
          conversationId: true,
        },
      });

      if (!replyMessage || replyMessage.conversationId !== conversationId) {
        throw new AppError("Invalid reply message", 400);
      }
    }

    const createdMessage = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: data.content,
        type: data.type || "TEXT",
        attachments: normalizeAttachments(data.attachments),
        replyToMessageId: data.replyToMessageId,
        readByUsers: [userId],
      },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
        replyToMessage: {
          include: {
            sender: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    const otherParticipants = await tx.conversationParticipant.findMany({
      where: {
        conversationId,
        NOT: {
          userId,
        },
      },
      select: {
        userId: true,
        muted: true,
      },
    });

    await Promise.all([
      tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          updatedAt: now,
          lastMessageAt: now,
          messageCount: {
            increment: 1,
          },
        },
      }),
      tx.conversationParticipant.updateMany({
        where: {
          conversationId,
          NOT: {
            userId,
          },
        },
        data: {
          unreadCount: {
            increment: 1,
          },
          lastDeliveredAt: now,
        },
      }),
    ]);

    return {
      message: createdMessage,
      participants: otherParticipants,
    };
  });

  updateMessageAffinities(userId, participants);

  createActivity(userId, "MESSAGE_SENT", "Sent a message", "Sent a message", {
    conversationId,
    messageId: message.id,
  }).catch(console.error);

  trackInteraction(userId, {
    targetId: conversationId,
    targetType: "PROFILE",
    interactionType: "CLICK",
    metadata: {
      action: "MESSAGE_SENT",
    },
  }).catch(console.error);

  notifyMessageRecipients(
    participants,
    userId,
    conversationId,
    message.id,
    data.content,
  );

  emitToConversation(conversationId, "message_created", {
    conversationId,
    message,
  });

  return message;
};

export const markConversationAsRead = async (
  userId: string,
  conversationId: string,
) => {
  const readAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const participant = await tx.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!participant) {
      throw new AppError("Unauthorized", 403);
    }

    await tx.conversationParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        lastReadAt: readAt,
        unreadCount: 0,
      },
    });

    const updatedMessages = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "Message"
      SET "readByUsers" = array_append("readByUsers", ${userId})
      WHERE "conversationId" = ${conversationId}
        AND "senderId" <> ${userId}
        AND "deletedAt" IS NULL
        AND NOT (${userId} = ANY("readByUsers"))
      RETURNING "id"
    `;

    return {
      success: true,
      conversationId,
      userId,
      readAt,
      messageIds: updatedMessages.map((message) => message.id),
    };
  });

  emitToConversation(conversationId, "message_seen", result);

  return result;
};

export const addParticipant = async (
  currentUserId: string,
  conversationId: string,
  userId: string,
) => {
  const participant = await ensureParticipant(currentUserId, conversationId);

  if (!GROUP_CONVERSATION_TYPES.includes(participant.conversation.type)) {
    throw new AppError(
      "Participants can only be added to group conversations",
      400,
    );
  }

  const addedParticipant = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const existing = await tx.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new AppError("User is already a participant", 400);
    }

    const createdParticipant = await tx.conversationParticipant.create({
      data: {
        conversationId,
        userId,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    await tx.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return createdParticipant;
  });

  emitToConversation(conversationId, "participant_added", {
    conversationId,
    participant: addedParticipant,
    addedById: currentUserId,
  });

  emitToUser(userId, "participant_added", {
    conversationId,
    participant: addedParticipant,
    addedById: currentUserId,
  });

  return addedParticipant;
};

export const removeParticipant = async (
  currentUserId: string,
  conversationId: string,
  userId: string,
) => {
  const participant = await ensureParticipant(currentUserId, conversationId);

  if (!GROUP_CONVERSATION_TYPES.includes(participant.conversation.type)) {
    throw new AppError(
      "Participants can only be removed from group conversations",
      400,
    );
  }

  const canRemove =
    currentUserId === userId ||
    participant.conversation.createdById === currentUserId;

  if (!canRemove) {
    throw new AppError("Only the creator can remove other participants", 403);
  }

  await prisma.$transaction(async (tx) => {
    const targetParticipant = await tx.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!targetParticipant) {
      throw new AppError("Participant not found", 404);
    }

    await tx.conversationParticipant.delete({
      where: {
        id: targetParticipant.id,
      },
    });

    await tx.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });
  });

  const payload = {
    conversationId,
    userId,
    removedById: currentUserId,
  };

  emitToConversation(conversationId, "participant_removed", payload);
  emitToUser(userId, "participant_removed", payload);

  return {
    success: true,
    ...payload,
  };
};

export const uploadAttachments = async (
  userId: string,
  conversationId: string,
  attachments: any[],
) => {
  await ensureParticipantExists(userId, conversationId);

  return {
    attachments: normalizeAttachments(attachments),
  };
};

export const forwardMessage = async (
  userId: string,
  sourceMessageId: string,
  targetConversationId: string,
) => {
  const sourceMessage = await prisma.message.findUnique({
    where: {
      id: sourceMessageId,
    },

    include: {
      sender: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!sourceMessage) {
    throw new AppError("Message not found", 404);
  }

  //
  // Check membership
  //
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId: targetConversationId,

      userId,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // Create forwarded message
  //
  const forwardedMessage = await prisma.message.create({
    data: {
      conversationId: targetConversationId,

      senderId: userId,

      content: sourceMessage.content,

      type: sourceMessage.type,

      attachments: sourceMessage.attachments as any,

      forwardedFromMessageId: sourceMessage.id,
    },

    include: {
      sender: {
        include: {
          profile: true,
        },
      },

      forwardedFromMessage: {
        include: {
          sender: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  //
  // Update conversation
  //
  await prisma.conversation.update({
    where: {
      id: targetConversationId,
    },

    data: {
      updatedAt: new Date(),

      lastMessageAt: new Date(),

      messageCount: {
        increment: 1,
      },
    },
  });

  //
  // Activity
  //
  setImmediate(() => {
    createActivity(
      userId,

      "MESSAGE_SENT",

      "Forwarded a message",

      "Forwarded a message",

      {
        conversationId: targetConversationId,

        messageId: forwardedMessage.id,
      },
    ).catch(console.error);
  });

  return forwardedMessage;
};

export const reactToMessage = async (
  userId: string,
  messageId: string,
  emoji: string,
) => {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },

    include: {
      sender: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  let reacted = true;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
      });

      await tx.message.update({
        where: {
          id: messageId,
        },
        data: {
          reactionCount: {
            increment: 1,
          },
        },
      });
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      reacted = false;
      await prisma.$transaction(async (tx) => {
        await tx.messageReaction.delete({
          where: {
            messageId_userId_emoji: {
              messageId,
              userId,
              emoji,
            },
          },
        });

        await tx.message.update({
          where: {
            id: messageId,
          },
          data: {
            reactionCount: {
              decrement: 1,
            },
          },
        });
      });
    } else {
      throw error;
    }
  }

  if (message.senderId !== userId) {
    setImmediate(() => {
      Promise.all([
        calculateUserAffinity(userId, message.senderId),
        calculateUserAffinity(message.senderId, userId),
      ]).catch(console.error);

      createNotification({
        userId: message.senderId,
        actorId: userId,
        type: "MESSAGE",
        title: "Message Reaction",
        message: `Reacted with ${emoji} to your message`,
        entityId: message.id,
        metadata: {
          emoji,
        },
      }).catch(console.error);
    });
  }

  return {
    reacted,
  };
};

export const editMessage = async (
  userId: string,
  messageId: string,
  content: string,
) => {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.senderId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  return prisma.message.update({
    where: {
      id: messageId,
    },

    data: {
      content,

      editedAt: new Date(),
    },
  });
};

export const deleteMessage = async (userId: string, messageId: string) => {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.senderId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  return prisma.message.update({
    where: {
      id: messageId,
    },

    data: {
      deletedAt: new Date(),

      content: "This message was deleted",
    },
  });
};

export const searchMessages = async (
  userId: string,
  conversationId: string,
  query: string,
) => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }

  return prisma.message.findMany({
    where: {
      conversationId,

      deletedAt: null,

      content: {
        contains: query,

        mode: "insensitive",
      },
    },

    include: {
      sender: {
        include: {
          profile: true,
        },
      },
    },

    take: 50,

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const togglePinConversation = async (
  userId: string,
  conversationId: string,
) => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }

  const updated = await prisma.conversationParticipant.update({
    where: {
      id: participant.id,
    },

    data: {
      pinned: !participant.pinned,
    },
  });

  return updated;
};

export const toggleMuteConversation = async (
  userId: string,
  conversationId: string,
  muted?: boolean,
) => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }

  return prisma.conversationParticipant.update({
    where: {
      id: participant.id,
    },

    data: {
      muted: muted ?? !participant.muted,
    },
  });
};

export const toggleArchiveConversation = async (
  userId: string,
  conversationId: string,
) => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }

  return prisma.conversationParticipant.update({
    where: {
      id: participant.id,
    },

    data: {
      archived: !participant.archived,
    },
  });
};

export const deleteConversation = async (
  userId: string,
  conversationId: string,
) => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }

  return prisma.conversationParticipant.update({
    where: {
      id: participant.id,
    },

    data: {
      deletedAt: new Date(),
    },
  });
};

export const getArchivedConversations = async (userId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId,
          archived: true,
          deletedAt: null,
        },
      },
      archived: false,
    },

    include: {
      participants: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },

      messages: {
        orderBy: {
          createdAt: "desc",
        },

        take: 1,
      },
    },

    orderBy: {
      updatedAt: "desc",
    },
  });

  return conversations.map((conversation) => {
    const participant = conversation.participants.find(
      (item) => item.userId === userId,
    );

    return {
      ...conversation,

      unreadCount: participant?.unreadCount || 0,
    };
  });
};

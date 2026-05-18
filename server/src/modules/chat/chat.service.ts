import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import { calculateUserAffinity } from "modules/affinity/affinity.service";

import { createActivity } from "modules/activities/activity.service";

import { trackInteraction } from "modules/interaction/interaction-tracking.service";

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

  //
  // Affinity
  //
  await calculateUserAffinity(currentUserId, otherUserId);

  await calculateUserAffinity(otherUserId, currentUserId);

  //
  // Activity
  //
  createActivity(
    currentUserId,

    "CONVERSATION_STARTED",

    "Started conversation",

    "Started a direct conversation",

    {
      conversationId: conversation.id,
    },
  ).catch(console.error);

  return conversation;
};

export const getMyConversations = async (userId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId,
        },
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

  return Promise.all(
    conversations.map(async (conversation) => {
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: conversation.id,

          userId,
        },
      });

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,

          createdAt: {
            gt: participant?.lastReadAt || new Date(0),
          },

          NOT: {
            senderId: userId,
          },
        },
      });

      return {
        ...conversation,

        unreadCount,
      };
    }),
  );
};

export const getConversationMessages = async (
  userId: string,
  conversationId: string,
  cursor?: string,
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
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError("Unauthorized", 403);
  }

  if (data.replyToMessageId) {
    const replyMessage = await prisma.message.findUnique({
      where: {
        id: data.replyToMessageId,
      },
    });

    if (!replyMessage || replyMessage.conversationId !== conversationId) {
      throw new AppError("Invalid reply message", 400);
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: data.content,
      type: data.type || "TEXT",
      attachments: data.attachments,
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

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      updatedAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: {
        increment: 1,
      },
    },
  });

  const participants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId,
      NOT: {
        userId,
      },
    },
  });

  await prisma.conversationParticipant.updateMany({
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
      lastDeliveredAt: new Date(),
    },
  });

  await Promise.all(
    participants.map(async (p) => {
      await calculateUserAffinity(userId, p.userId);
      await calculateUserAffinity(p.userId, userId);
    }),
  );

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

  for (const p of participants) {
    if (p.muted) {
      continue;
    }

    createNotification({
      userId: p.userId,
      actorId: userId,
      type: "MESSAGE",
      title: "New Message",
      message: data.content || "Sent an attachment",
      entityId: conversationId,
      entityType: "PROFILE",
      metadata: {
        conversationId,
        messageId: message.id,
      },
    }).catch(console.error);
  }

  return message;
};

export const markConversationAsRead = async (
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

  await prisma.conversationParticipant.update({
    where: {
      id: participant.id,
    },
    data: {
      lastReadAt: new Date(),
      unreadCount: 0,
    },
  });

  const unreadMessages = await prisma.message.findMany({
    where: {
      conversationId,
      senderId: {
        not: userId,
      },
      deletedAt: null,
    },
  });

  await Promise.all(
    unreadMessages.map(async (message) => {
      if (message.readByUsers.includes(userId)) {
        return;
      }

      await prisma.message.update({
        where: {
          id: message.id,
        },
        data: {
          readByUsers: {
            push: userId,
          },
        },
      });
    }),
  );

  return {
    success: true,
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

  //
  // Existing reaction
  //
  const existingReaction = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,

        userId,

        emoji,
      },
    },
  });

  //
  // REMOVE REACTION
  //
  if (existingReaction) {
    await prisma.messageReaction.delete({
      where: {
        id: existingReaction.id,
      },
    });

    await prisma.message.update({
      where: {
        id: messageId,
      },

      data: {
        reactionCount: {
          decrement: 1,
        },
      },
    });

    return {
      reacted: false,
    };
  }

  //
  // ADD REACTION
  //
  await prisma.messageReaction.create({
    data: {
      messageId,

      userId,

      emoji,
    },
  });

  await prisma.message.update({
    where: {
      id: messageId,
    },

    data: {
      reactionCount: {
        increment: 1,
      },
    },
  });

  //
  // Affinity
  //
  if (message.senderId !== userId) {
    await calculateUserAffinity(userId, message.senderId);

    await calculateUserAffinity(message.senderId, userId);
  }

  //
  // Notification
  //
  if (message.senderId !== userId) {
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
  }

  return {
    reacted: true,
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
      muted: !participant.muted,
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

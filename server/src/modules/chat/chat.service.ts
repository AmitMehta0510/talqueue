import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

export const createDirectConversation =  async (
    currentUserId: string,
    otherUserId: string
  ) => {

    if (
      currentUserId === otherUserId
    ) {
      throw new AppError(
        "Cannot chat with yourself",
        400
      );
    }

    // Find existing direct conversation
    const existingConversation =
      await prisma.conversation.findFirst({
        where: {
          type: "DIRECT",

          participants: {
            every: {
              userId: {
                in: [
                  currentUserId,
                  otherUserId,
                ],
              },
            },
          },
        },

        include: {
          participants: true,
        },
      });

    if (
      existingConversation &&
      existingConversation
        .participants.length === 2
    ) {
      return existingConversation;
    }

    return prisma.conversation.create({
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
  };

export const getMyConversations =  async (userId: string) => {

    const conversations =
      await prisma.conversation.findMany({
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
      conversations.map(
        async (conversation) => {

          const participant =
            await prisma.conversationParticipant.findFirst({
              where: {
                conversationId:
                  conversation.id,

                userId,
              },
            });

          const unreadCount =
            await prisma.message.count({
              where: {
                conversationId:
                  conversation.id,

                createdAt: {
                  gt:
                    participant
                      ?.lastReadAt ||
                    new Date(0),
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
        }
      )
    );
  };

export const getConversationMessages =  async (
    userId: string,
    conversationId: string
  ) => {

    const participant =
      await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

    if (!participant) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    return prisma.message.findMany({
      where: {
        conversationId,
      },

      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },

      orderBy: {
        createdAt: "asc",
      },

      take: 100,
    });
  };

export const sendMessage =  async (
    userId: string,
    conversationId: string,
    content: string
  ) => {

    const participant =
      await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

    if (!participant) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    const message =
      await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          content,
        },

        include: {
          sender: {
            include: {
              profile: true,
            },
          },
        },
      });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },

      data: {
        updatedAt: new Date(),
      },
    });

    return message;
  };

export const markConversationAsRead =
  async (
    userId: string,
    conversationId: string
  ) => {

    const participant =
      await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

    if (!participant) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    await prisma.conversationParticipant.update({
      where: {
        id: participant.id,
      },

      data: {
        lastReadAt: new Date(),
      },
    });

    await prisma.message.updateMany({
      where: {
        conversationId,

        NOT: {
          senderId: userId,
        },
      },

      data: {
        readByUsers: {
          push: userId,
        },
      },
    });

    return {
      success: true,
    };
  };  
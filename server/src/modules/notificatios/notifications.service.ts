import prisma from "shared/database/prisma";

export const createNotification =  async (data: {
    userId: string;

    actorId?: string;

    type: any;

    title: string;

    message: string;

    entityType?: string;

    entityId?: string;

    actionUrl?: string;

    metadata?: any;

    groupKey?: string;
  }) => {

    return prisma.notification.create({
      data: {
        ...data,
      },

      include: {
        actor: {
          include: {
            profile: true,
          },
        },
      },
    });
  };

export const getMyNotifications =  async (
    userId: string,
    page = 1,
    limit = 20
  ) => {

    const skip =
      (page - 1) * limit;

    const notifications =
      await prisma.notification.findMany({

        where: {
          userId,

          archived: false,
        },

        include: {

          actor: {
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

    const unreadCount =
      await prisma.notification.count({

        where: {
          userId,

          isRead: false,
        },
      });

    return {
      notifications,
      unreadCount,
      page,
      limit,
    };
  };

export const markAsRead =  async (
    notificationId: string,
    userId: string
  ) => {

    return prisma.notification.updateMany({

      where: {
        id: notificationId,
        userId,
      },

      data: {

        isRead: true,

        readAt:
          new Date(),
      },
    });
  };

export const markAllAsRead =  async (
    userId: string
  ) => {

    return prisma.notification.updateMany({

      where: {
        userId,

        isRead: false,
      },

      data: {

        isRead: true,

        readAt:
          new Date(),
      },
    });
  };

export const archiveNotification =  async (
    notificationId: string,
    userId: string
  ) => {

    return prisma.notification.updateMany({

      where: {
        id: notificationId,
        userId,
      },

      data: {
        archived: true,
      },
    });
  };

export const deleteNotification =  async (
    notificationId: string,
    userId: string
  ) => {

    return prisma.notification.deleteMany({

      where: {
        id: notificationId,
        userId,
      },
    });
  };
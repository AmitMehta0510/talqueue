import { NotificationType } from "@prisma/client";
import prisma from "shared/database/prisma";

export const createNotification =  async (data: {
    userId: string;

    actorId?: string;

    type: NotificationType;

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

    const requestedLimit =
      Number.isFinite(limit) ? limit : 20;

    const requestedPage =
      Number.isFinite(page) ? page : 1;

    const safeLimit =
      Math.min(Math.max(requestedLimit, 1), 50);

    const safePage =
      Math.max(requestedPage, 1);

    const skip =
      (safePage - 1) * safeLimit;

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
        take: safeLimit,
      });

    const connectionIds = notifications
      .filter((n) => n.type === "CONNECTION_REQUEST" && n.metadata && typeof (n.metadata as any).connectionId === "string")
      .map((n) => (n.metadata as any).connectionId as string);

    const connectionMap = new Map<string, string>();
    if (connectionIds.length > 0) {
      const connections = await prisma.connection.findMany({
        where: { id: { in: connectionIds } },
        select: { id: true, status: true },
      });
      for (const conn of connections) {
        connectionMap.set(conn.id, conn.status);
      }
    }

    const enrichedNotifications = notifications.map((n) => {
      if (n.type === "CONNECTION_REQUEST" && n.metadata && typeof (n.metadata as any).connectionId === "string") {
        const connectionId = (n.metadata as any).connectionId;
        const status = connectionMap.get(connectionId) || "PENDING";
        return {
          ...n,
          metadata: {
            ...(n.metadata as any),
            connectionStatus: status,
          },
        };
      }
      return n;
    });

    const unreadCount =
      await prisma.notification.count({

        where: {
          userId,

          isRead: false,

          archived: false,
        },
      });

    return {
      notifications: enrichedNotifications,
      unreadCount,
      page: safePage,
      limit: safeLimit,
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

        archived: false,
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

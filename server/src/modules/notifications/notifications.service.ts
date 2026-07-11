import { NotificationType } from "@prisma/client";
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { getIO } from "modules/chat/socket";
import { dispatchNotification } from "./notification-dispatcher";

export const createNotification = async (data: {
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

    const notification = await prisma.notification.create({
      data: { ...data },
      include: {
        actor: { include: { profile: true } },
      },
    });

    // Dispatch to all channels based on user's NotificationPreference.
    // Fire-and-forget — failures are logged inside dispatchNotification.
    setImmediate(() =>
      dispatchNotification(
        { userId: data.userId, type: data.type, title: data.title, message: data.message, actionUrl: data.actionUrl },
        notification,
      ).catch(() => {}),
    );

    return notification;
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

    const redisKey = `notif:unread:${userId}`;
    let unreadCount: number;

    try {
      const cached = await redis.get(redisKey);
      if (cached !== null) {
        unreadCount = parseInt(cached, 10);
        await redis.expire(redisKey, 30);
      } else {
        unreadCount = await prisma.notification.count({
          where: {
            userId,
            isRead: false,
            archived: false,
          },
        });
        await redis.set(redisKey, unreadCount.toString(), "EX", 30);
      }
    } catch (err: any) {
      console.warn("[NotificationService] Redis read failed, falling back to database count:", err?.message || err);
      unreadCount = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
          archived: false,
        },
      });
    }

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

    const result = await prisma.notification.updateMany({

      where: {
        id: notificationId,
        userId,
        isRead: false,
      },

      data: {

        isRead: true,

        readAt:
          new Date(),
      },
    });

    if (result.count > 0) {
      try {
        const redisKey = `notif:unread:${userId}`;
        const exists = await redis.exists(redisKey);
        if (exists) {
          const val = await redis.decr(redisKey);
          if (val < 0) {
            await redis.set(redisKey, "0", "EX", 30);
          }
        }
      } catch (err: any) {
        console.warn("[NotificationService] Redis decrement failed:", err?.message || err);
      }
    }

    return result;
  };

export const markAllAsRead =  async (
    userId: string
  ) => {

    const result = await prisma.notification.updateMany({

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

    try {
      const redisKey = `notif:unread:${userId}`;
      await redis.set(redisKey, "0", "EX", 30);
    } catch (err: any) {
      console.warn("[NotificationService] Redis reset failed:", err?.message || err);
    }

    return result;
  };

export const archiveNotification =  async (
    notificationId: string,
    userId: string
  ) => {

    const notif = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: {
        isRead: true,
        archived: true,
      },
    });

    const result = await prisma.notification.updateMany({

      where: {
        id: notificationId,
        userId,
      },

      data: {
        archived: true,
      },
    });

    if (notif && !notif.isRead && !notif.archived) {
      try {
        const redisKey = `notif:unread:${userId}`;
        const exists = await redis.exists(redisKey);
        if (exists) {
          const val = await redis.decr(redisKey);
          if (val < 0) {
            await redis.set(redisKey, "0", "EX", 30);
          }
        }
      } catch (err: any) {
        console.warn("[NotificationService] Redis archive decrement failed:", err?.message || err);
      }
    }

    return result;
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

export const createNotificationsBulk = async (
  notificationsData: Array<{
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
  }>
) => {
  if (notificationsData.length === 0) {
    return { count: 0 };
  }

  const result = await prisma.notification.createMany({
    data: notificationsData,
    skipDuplicates: true,
  });

  setImmediate(async () => {
    try {
      const io = getIO();
      for (const data of notificationsData) {
        io.to(`user:${data.userId}`).emit("notification_created", data);
      }
    } catch (err) {
      // Ignore socket.io initialization errors (e.g., in test suites)
    }

    try {
      const pipeline = redis.pipeline();
      for (const data of notificationsData) {
        const redisKey = `notif:unread:${data.userId}`;
        pipeline.incr(redisKey);
        pipeline.expire(redisKey, 3600);
      }
      await pipeline.exec();
    } catch (err: any) {
      console.warn("[NotificationService] Redis bulk pipeline increment failed:", err?.message || err);
    }
  });

  return result;
};


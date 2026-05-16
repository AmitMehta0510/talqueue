import prisma from "shared/database/prisma";

export const createNotification =  async (data: {
    userId: string;

    type:
      | "LIKE"
      | "COMMENT"
      | "FOLLOW"
      | "PROJECT_INVITE"
      | "TEAM_INVITE"
      | "REFERRAL"
      | "SYSTEM"
      | "HACKATHON_JUDGING"
      | "HACKATHON_WINNER";

    title: string;

    message: string;
  }) => {
    return prisma.notification.create({
      data,
    });
  };

export const getMyNotifications =
  async (userId: string) => {
    return prisma.notification.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 50,
    });
  };

export const markAsRead = async (
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
  },
});
};
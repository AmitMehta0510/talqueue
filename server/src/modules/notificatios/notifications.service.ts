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
      | "HACKATHON_WINNER"
      | "POST_SHARED"
      | "POST_MENTION"
      | "COMMENT_MENTION"
      | "COMMENT_REPLY"
      | "POST_SAVED"
      | "CONNECTION_REQUEST"
      | "CONNECTION_ACCEPTED"
      | "MENTORSHIP"
      | "MESSAGE"
      | "COMMUNITY_JOINED";

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
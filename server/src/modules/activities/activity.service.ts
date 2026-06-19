import { ActivityType, Prisma } from "@prisma/client";
import prisma from "shared/database/prisma";

export type EngineeringActivityType = ActivityType | (string & {});

export const createActivity = async (
  userId: string,
  type: EngineeringActivityType,
  title: string,
  description?: string,
  metadata?: Prisma.InputJsonValue,
) => {
  return prisma.engineeringActivity.create({
    data: {
      userId,

      type: type as ActivityType,

      title,

      description,

      metadata,
    },
  });
};

export const getUserTimeline = async (
  userId: string,
  params: { cursor?: string; limit?: number } = {},
) => {
  const limitInput = params.limit || 20;
  const limit = Math.min(Math.max(1, limitInput), 50);
  const cursorId = params.cursor;

  const activities = await prisma.engineeringActivity.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { id: "desc" },
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    take: limit,
  });

  const hasNextPage = activities.length === limit;
  const nextCursor = hasNextPage ? activities[activities.length - 1].id : null;

  return {
    limit,
    nextCursor,
    hasNextPage,
    activities,
  };
};

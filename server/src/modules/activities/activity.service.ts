import prisma from "shared/database/prisma";

export const createActivity = async (
  userId: string,
  type: any,
  title: string,
  description?: string,
  metadata?: any,
) => {
  return prisma.engineeringActivity.create({
    data: {
      userId,

      type,

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
  const limit = Math.min(100, Math.max(1, params.limit || 20));
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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

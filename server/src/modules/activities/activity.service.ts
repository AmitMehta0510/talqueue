import prisma from "shared/database/prisma";

export const createActivity =  async (
    userId: string,
    type: any,
    title: string,
    description?: string,
    metadata?: any
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

  export const getUserTimeline = async (userId: string) => {

    return prisma.engineeringActivity.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 100,
    });
  };
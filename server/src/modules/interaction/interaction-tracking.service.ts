import prisma from "shared/database/prisma";


export const trackInteraction =  async (
    userId: string,

    data: {
      targetId: string;

      targetType:
        | "POST"
        | "PROJECT"
        | "HACKATHON"
        | "JOB"
        | "COMPANY"
        | "PROFILE";

      interactionType:
        | "VIEW"
        | "CLICK"
        | "LIKE"
        | "SAVE"
        | "SHARE"
        | "APPLY"
        | "OPEN_PROJECT"
        | "OPEN_PROFILE";

      duration?: number;

      metadata?: any;
    }
  ) => {

    //
    // Create interaction
    //
    const interaction =
      await prisma.feedInteraction.create({
        data: {
          userId,

          targetId:
            data.targetId,

          targetType:
            data.targetType,

          interactionType:
            data.interactionType,

          duration:
            data.duration,

          metadata:
            data.metadata,
        },
      });

    //
    // Update interest profile
    //
    await updateUserInterestProfile(
      userId
    );

    return interaction;
  };


  export const updateUserInterestProfile =  async (
    userId: string
  ) => {

    //
    // Recent interactions
    //
    const interactions =
      await prisma.feedInteraction.findMany({

        where: {
          userId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 500,
      });

    //
    // Counters
    //
    const contentTypes:
      Record<string, number> = {};

    for (
      const interaction of interactions
    ) {

      contentTypes[
        interaction.targetType
      ] =
        (
          contentTypes[
            interaction.targetType
          ] || 0
        ) + 1;
    }

    //
    // Persist
    //
    await prisma.userInterestProfile.upsert({

      where: {
        userId,
      },

      update: {

        preferredContentTypes:
          contentTypes,

        updatedAt:
          new Date(),
      },

      create: {

        userId,

        preferredContentTypes:
          contentTypes,
      },
    });
  };
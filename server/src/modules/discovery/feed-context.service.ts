import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

export const buildFeedContext = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      engineeringScore: true,
      primaryRole: true,
      experiences: {
        select: {
          id: true,
        },
      },
      profile: {
        select: {
          country: true,  // ISO 3166-1 alpha-2, e.g. "IN", "US"
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const [follows, userSkills, interactions, affinities] = await Promise.all([
    prisma.follow.findMany({
      where: {
        followerId: userId,
      },

      select: {
        followingId: true,
      },
    }),

    prisma.userSkill.findMany({
      where: {
        userId,
      },

      select: {
        skill: {
          select: {
            name: true,
          },
        },
      },
    }),

    prisma.feedInteraction.findMany({
      where: {
        userId,
      },

      select: {
        targetType: true,
        targetId: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 300,
    }),

    prisma.userAffinity.findMany({
      where: {
        userId,
      },

      select: {
        targetUserId: true,
        score: true,
      },

      take: 100,
    }),
  ]);

  const followingIds = follows.map((f) => f.followingId);

  const skillNames = userSkills.map((s) => s.skill.name.toLowerCase());

  const followingIdSet = new Set(followingIds);

  const skillNameSet = new Set(skillNames);

  const interactionMap = new Map<string, number>();

  for (const interaction of interactions) {
    const key = `${interaction.targetType}:${interaction.targetId}`;

    interactionMap.set(key, (interactionMap.get(key) || 0) + 1);
  }

  const affinityMap = new Map<string, number>();

  for (const affinity of affinities) {
    affinityMap.set(affinity.targetUserId, affinity.score);
  }

  const isFresher =
    user.experiences.length === 0 && user.engineeringScore < 150;

  // Normalise country to ISO-2 upper-case (e.g. "in" -> "IN")
  const userCountry: string | null = (user.profile?.country ?? null)?.toUpperCase() || null;

  return {
    followingIds,

    followingIdSet,

    skillNames,

    skillNameSet,

    interactionMap,

    affinityMap,

    isFresher,

    userRole: user.primaryRole,

    userCountry,
  };
};

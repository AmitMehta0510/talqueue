import prisma from "shared/database/prisma";

export const calculateTrustLevel = async (userId: string) => {
  //
  // USER
  //
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      engineeringScore: true,
      reputationScore: true,
      trustLevel: true,
    },
  });

  if (!user) {
    return "BEGINNER";
  }

  const [
    verifiedProjects,
    completedProjects,
    verifiedExperiences,
    hackathonWins,
    verifiedHackathonWins,
  ] = await Promise.all([
    prisma.projectMember.count({
      where: {
        userId,
        project: {
          verified: true,
        },
      },
    }),
    prisma.projectMember.count({
      where: {
        userId,
        project: {
          status: "COMPLETED",
        },
      },
    }),
    prisma.experience.count({
      where: {
        userId,
        verified: true,
      },
    }),
    prisma.hackathonWinner.count({
      where: {
        team: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    }),
    prisma.hackathonWinner.count({
      where: {
        hackathon: {
          verified: true,
        },
        team: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    }),
  ]);

  // ENGINEERING SCORE
  const engineeringScore = user.engineeringScore ?? 0;

  // REPUTATION
  const reputationScore = user.reputationScore ?? 0;

  // TRUST LEVEL
  let trustLevel: "BEGINNER" | "EMERGING" | "VERIFIED" | "ADVANCED" | "ELITE" =
    "BEGINNER";

  // EMERGING
  if (engineeringScore >= 100 || completedProjects >= 1) {
    trustLevel = "EMERGING";
  }

  // VERIFIED
  if (
    verifiedProjects >= 1 ||
    verifiedExperiences >= 1 ||
    hackathonWins >= 1 ||
    verifiedHackathonWins >= 1
  ) {
    trustLevel = "VERIFIED";
  }

  // ADVANCED
  if (
    engineeringScore >= 500 &&
    (verifiedProjects >= 2 ||
      verifiedExperiences >= 1 ||
      verifiedHackathonWins >= 2)
  ) {
    trustLevel = "ADVANCED";
  }

  // ELITE
  if (
    engineeringScore >= 1200 &&
    verifiedProjects >= 4 &&
    (verifiedExperiences >= 1 || verifiedHackathonWins >= 3) &&
    reputationScore >= 500
  ) {
    trustLevel = "ELITE";
  }

  if (user.trustLevel !== trustLevel) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        trustLevel,
      },
    });
  }

  return trustLevel;
};

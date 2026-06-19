import prisma from "shared/database/prisma";

export const calculateTrustLevel = async (userId: string) => {
  //
  // USER WITH RELATION CONSOLIDATION
  //
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      engineeringScore: true,
      reputationScore: true,
      trustLevel: true,
      projectMemberships: {
        select: {
          project: {
            select: {
              verified: true,
              status: true,
            },
          },
        },
      },
      experiences: {
        where: {
          verified: true,
        },
        select: {
          id: true,
        },
      },
      teamMemberships: {
        select: {
          team: {
            select: {
              hackathonWins: {
                select: {
                  hackathon: {
                    select: {
                      verified: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return "BEGINNER";
  }

  const verifiedProjects = user.projectMemberships.filter(
    (membership) => membership.project?.verified
  ).length;

  const completedProjects = user.projectMemberships.filter(
    (membership) => membership.project?.status === "COMPLETED"
  ).length;

  const verifiedExperiences = user.experiences.length;

  let hackathonWins = 0;
  let verifiedHackathonWins = 0;

  for (const membership of user.teamMemberships) {
    if (membership.team?.hackathonWins) {
      hackathonWins += membership.team.hackathonWins.length;
      for (const win of membership.team.hackathonWins) {
        if (win.hackathon?.verified) {
          verifiedHackathonWins += 1;
        }
      }
    }
  }

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

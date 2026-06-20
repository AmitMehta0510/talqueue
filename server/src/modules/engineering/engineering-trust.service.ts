import prisma from "shared/database/prisma";

export interface TrustLevelContext {
  engineeringScore: number;
  reputationScore: number;
  verifiedProjects: number;
  completedProjects: number;
  verifiedExperiences: number;
  hackathonWins: number;
  verifiedHackathonWins: number;
}

export const determineTrustLevel = (context: TrustLevelContext) => {
  let trustLevel: "BEGINNER" | "EMERGING" | "VERIFIED" | "ADVANCED" | "ELITE" = "BEGINNER";

  if (context.engineeringScore >= 100 || context.completedProjects >= 1) {
    trustLevel = "EMERGING";
  }

  if (
    context.verifiedProjects >= 1 ||
    context.verifiedExperiences >= 1 ||
    context.hackathonWins >= 1 ||
    context.verifiedHackathonWins >= 1
  ) {
    trustLevel = "VERIFIED";
  }

  if (
    context.engineeringScore >= 500 &&
    (context.verifiedProjects >= 2 ||
      context.verifiedExperiences >= 1 ||
      context.verifiedHackathonWins >= 2)
  ) {
    trustLevel = "ADVANCED";
  }

  if (
    context.engineeringScore >= 1200 &&
    context.verifiedProjects >= 4 &&
    (context.verifiedExperiences >= 1 || context.verifiedHackathonWins >= 3) &&
    context.reputationScore >= 500
  ) {
    trustLevel = "ELITE";
  }

  return trustLevel;
};

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

  const trustLevel = determineTrustLevel({
    engineeringScore: user.engineeringScore ?? 0,
    reputationScore: user.reputationScore ?? 0,
    verifiedProjects,
    completedProjects,
    verifiedExperiences,
    hackathonWins,
    verifiedHackathonWins,
  });

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

import prisma from "shared/database/prisma";

export const getTopEngineers =  async (
    limit = 50
  ) => {

    //
    // Users
    //
    const users =
      await prisma.user.findMany({

        where: {
          engineeringScore: {
            gt: 0,
          },
        },

        include: {

          profile: true,

          badges: {
            include: {
              badge: true,
            },
          },

          projectMemberships: {
            include: {
              project: true,
            },
          },

          activities: {
            orderBy: {
              createdAt:
                "desc",
            },

            take: 10,
          },
        },

        orderBy: {
          engineeringScore:
            "desc",
        },

        take: limit,
      });

    //
    // Rank engineers
    //
    const ranked =
      users.map(
        (
          user,
          index
        ) => {

          //
          // Projects
          //
          const projects =
            user.projectMemberships.map(
              (
                membership
              ) =>
                membership.project
            );

          //
          // Verified projects
          //
          const verifiedProjects =
            projects.filter(
              (project) =>
                project.verified
            ).length;

          //
          // Activity freshness
          //
          const recentActivities =
            user.activities.filter(
              (
                activity
              ) => {

                const diffDays =
                  Math.floor(
                    (
                      Date.now() -
                      new Date(
                        activity.createdAt
                      ).getTime()
                    ) /
                      (
                        1000 *
                        60 *
                        60 *
                        24
                      )
                  );

                return diffDays <= 30;
              }
            ).length;

          //
          // Trending score
          //
          const trendingScore =
            (
              user.engineeringScore *
                0.6 +
              user.reputationScore *
                0.2 +
              verifiedProjects *
                20 +
              recentActivities *
                5
            );

          //
          // Top badge
          //
          const topBadge =
            user.badges[0]
              ?.badge || null;

          return {

            rank:
              index + 1,

            id:
              user.id,

            username:
              user.username,

            profile:
              user.profile,

            engineeringScore:
              user.engineeringScore,

            reputationScore:
              user.reputationScore,

            trustLevel:
              user.trustLevel,

            verifiedProjects,

            totalProjects:
              projects.length,

            totalBadges:
              user.badges.length,

            recentActivityCount:
              recentActivities,

            trendingScore:
              Math.round(
                trendingScore
              ),

            topBadge,
          };
        }
      );

    //
    // Final sort
    //
    ranked.sort(
      (a, b) =>
        b.trendingScore -
        a.trendingScore
    );

    //
    // Re-rank after trending
    //
    return ranked.map(
      (
        engineer,
        index
      ) => ({
        ...engineer,

        rank:
          index + 1,
      })
    );
  };

  export const getTopProjects =  async (
    limit = 20
  ) => {

    const projects =
      await prisma.project.findMany({

        where: {
          deletedAt: null,
        },

        include: {

          owner: {
            include: {
              profile: true,
            },
          },

          members: true,
        },

        take: limit * 3,
      });

    const ranked =
      projects.map(
        (project) => {

          let score = 0;

          //
          // Engineering score
          //
          score +=
            (
              project.engineeringScore ||
              0
            ) * 0.5;

          //
          // Verified
          //
          if (project.verified) {
            score += 50;
          }

          //
          // Live deployment
          //
          if (project.liveUrl) {
            score += 30;
          }

          //
          // GitHub metrics
          //
          score += Math.min(
            project.starsCount * 2,
            50
          );

          score += Math.min(
            project.forksCount * 1,
            25
          );

          score += Math.min(
            project.contributorsCount *
              5,
            25
          );

          //
          // Freshness
          //
          if (
            project.repoUpdatedAt
          ) {

            const diffDays =
              Math.floor(
                (
                  Date.now() -
                  new Date(
                    project.repoUpdatedAt
                  ).getTime()
                ) /
                  (
                    1000 *
                    60 *
                    60 *
                    24
                  )
              );

            if (diffDays <= 30) {
              score += 20;
            }
          }

          return {
            ...project,

            trendingScore:
              Math.round(
                score
              ),
          };
        }
      );

    ranked.sort(
      (a, b) =>
        b.trendingScore -
        a.trendingScore
    );

    return ranked.slice(
      0,
      limit
    );
  };

 export const getTopHackathonEngineers =  async (
    limit = 20
  ) => {

    const winners =
      await prisma.hackathonWinner.findMany({

        include: {

          team: {
            include: {
              members: {
                include: {
                  user: {
                    include: {
                      profile: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    const engineerMap =
      new Map();

    for (const winner of winners) {

      for (
        const member of
        winner.team.members
      ) {

        const existing =
          engineerMap.get(
            member.userId
          ) || {

            user:
              member.user,

            wins: 0,

            score: 0,
          };

        existing.wins += 1;

        existing.score +=
          winner.position === 1
            ? 100
            : winner.position === 2
            ? 70
            : 50;

        engineerMap.set(
          member.userId,
          existing
        );
      }
    }

    return Array.from(
      engineerMap.values()
    )
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .slice(0, limit)
      .map(
        (
          engineer,
          index
        ) => ({
          rank:
            index + 1,

          ...engineer,
        })
      );
  };
  
  
  export const getTopTeams =  async (
    limit = 20
  ) => {

    const teams =
      await prisma.team.findMany({

        where: {
          deletedAt: null,
        },

        include: {

          members: true,

          projects: true,

          hackathonWins: true,
        },
      });

    const ranked =
      teams.map(
        (team) => {

          let score = 0;

          //
          // Team reputation
          //
          score +=
            team.reputationScore;

          //
          // Completed projects
          //
          score +=
            team.completedProjectsCount *
            20;

          //
          // Hackathon wins
          //
          score +=
            team.hackathonWinsCount *
            50;

          //
          // Verified projects
          //
          score +=
            team.projects.filter(
              (
                project
              ) =>
                project.verified
            ).length * 25;

          return {

            ...team,

            leaderboardScore:
              Math.round(
                score
              ),
          };
        }
      );

    ranked.sort(
      (a, b) =>
        b.leaderboardScore -
        a.leaderboardScore
    );

    return ranked
      .slice(0, limit)
      .map(
        (
          team,
          index
        ) => ({
          rank:
            index + 1,

          ...team,
        })
      );
  };


  export const getFastestGrowingEngineers =  async (
    limit = 20
  ) => {

    //
    // Last 30 days
    //
    const since =
      new Date();

    since.setDate(
      since.getDate() - 30
    );

    const events =
      await prisma.reputationEvent.findMany({

        where: {
          createdAt: {
            gte: since,
          },
        },

        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

    const growthMap =
      new Map();

    for (const event of events) {

      const existing =
        growthMap.get(
          event.userId
        ) || {

          user:
            event.user,

          gained: 0,
        };

      existing.gained +=
        event.points;

      growthMap.set(
        event.userId,
        existing
      );
    }

    return Array.from(
      growthMap.values()
    )
      .sort(
        (a, b) =>
          b.gained - a.gained
      )
      .slice(0, limit)
      .map(
        (
          engineer,
          index
        ) => ({
          rank:
            index + 1,

          ...engineer,
        })
      );
  };
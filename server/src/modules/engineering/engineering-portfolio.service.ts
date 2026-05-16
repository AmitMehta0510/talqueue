import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

export const getEngineeringPortfolio =  async (
    username: string
  ) => {
    // User
    const user =  await prisma.user.findUnique({
        where: {
          username,
        },

        include: {
          // Profil
          profile: true,
          // Skill
          skills: {
            include: {
              skill: true,
            },
          },
          // Experience
          experiences: {
            include: {
              company: true,
            },

            orderBy: {
              startDate:
                "desc",
            },
          },
          // Project
          projectMemberships: {
            include: {
              project: true,
            },
          },
          // Badge
          badges: {
            include: {
              badge: true,
            },
          },
          // Activitie
          activities: {
            orderBy: {
              createdAt:
                "desc",
            },

            take: 20,
          },
        },
      });

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    // Project extraction
    const projects =
      user.projectMemberships.map(
        (membership) =>
          membership.project
      );

    // Verified projects
    const verifiedProjects =
      projects.filter(
        (project) =>
          project.verified
      );

    // Completed projects
    const completedProjects =
      projects.filter(
        (project) =>
          project.status ===
          "COMPLETED"
      );

    // Featured project
    const featuredProject =
      projects.find(
        (project) =>
          project.id ===
          user.featuredProjectId
      ) ||
      projects.find(
        (project) =>
          project.featured
      );

    // Hackathon wins
    const hackathonWins =
      await prisma.hackathonWinner.count({
        where: {
          team: {
            members: {
              some: {
                userId:
                  user.id,
              },
            },
          },
        },
      });

    // GitHub totals
    const githubStats = {
      totalStars:
        projects.reduce(
          (
            acc,
            project
          ) =>
            acc +
            project.starsCount,

          0
        ),

      totalForks:
        projects.reduce(
          (
            acc,
            project
          ) =>
            acc +
            project.forksCount,

          0
        ),

      totalCommits:
        projects.reduce(
          (
            acc,
            project
          ) =>
            acc +
            project.commitCount,

          0
        ),
    };

    // Portfolio
    return {

      // User
      id: user.id,

      username:
        user.username,

      profile:
        user.profile,

      // Scores
      reputationScore:
        user.reputationScore,

      engineeringScore:
        user.engineeringScore,

      trustLevel:
        user.trustLevel,

      // Stats
      stats: {
        totalProjects:
          projects.length,

        verifiedProjects:
          verifiedProjects.length,

        completedProjects:
          completedProjects.length,

        hackathonWins,

        totalBadges:
          user.badges.length,

        totalExperiences:
          user.experiences.length,
      },

      
      // GitHub
      
      githubStats,

      // Featured project
      featuredProject,

      // Projects
      topProjects:
        projects
          .sort(
            (a, b) =>
              (
                b.engineeringScore ||
                0
              ) -
              (
                a.engineeringScore ||
                0
              )
          )
          .slice(0, 6),

      // Experiences
      experiences:
        user.experiences,

      // Skills
      skills:
        user.skills,

      // Badges
      //
      badges:
        user.badges,

      // Activities
      recentActivities:
        user.activities,
    };
  };
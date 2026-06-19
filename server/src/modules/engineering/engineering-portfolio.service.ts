import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

interface PortfolioStatsAccumulator {
  totalStars: number;
  totalForks: number;
  totalCommits: number;
  verifiedProjects: number;
  completedProjects: number;
}

export const getEngineeringPortfolio = async (username: string) => {
  // User
  const user = await prisma.user.findUnique({
    where: {
      username,
    },

    select: {
      id: true,
      username: true,
      reputationScore: true,
      engineeringScore: true,
      trustLevel: true,
      featuredProjectId: true,
      profile: true,
      skills: {
        include: {
          skill: true,
        },
      },
      projectMemberships: {
        select: {
          role: true,
          project: {
            select: {
              id: true,
              title: true,
              shortDescription: true,
              featured: true,
              verified: true,
              status: true,
              githubUrl: true,
              liveUrl: true,
              videoDemoUrl: true,
              techStack: true,
              deploymentStatus: true,
              starsCount: true,
              forksCount: true,
              commitCount: true,
              contributorsCount: true,
              engineeringScore: true,
              ownerId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      codingProfiles: {
        select: {
          platform: true,
          username: true,
          url: true,
        },
      },
      educations: {
        select: {
          id: true,
          degree: true,
          fieldOfStudy: true,
          startYear: true,
          endYear: true,
          current: true,
          college: {
            select: {
              id: true,
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      badges: {
        include: {
          badge: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              category: true,
            },
          },
        },
      },
      experiences: {
        include: {
          company: {
            select: {
              id: true,
              name: true,
              websiteUrl: true,
              logoUrl: true,
              industry: true,
              headquarters: true,
              type: true,
              size: true,
            },
          },
        },
        orderBy: {
          startDate: "desc",
        },
      },
      activities: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const projects = user.projectMemberships
    .map((membership) => ({
      role: membership.role,
      ...membership.project,
    }))
    .filter((project) => Boolean(project && project.id));

  const stats = projects.reduce<PortfolioStatsAccumulator>(
    (acc, project) => {
      acc.totalStars += project.starsCount ?? 0;
      acc.totalForks += project.forksCount ?? 0;
      acc.totalCommits += project.commitCount ?? 0;

      if (project.verified) {
        acc.verifiedProjects += 1;
      }

      if (project.status === "COMPLETED") {
        acc.completedProjects += 1;
      }

      return acc;
    },
    {
      totalStars: 0,
      totalForks: 0,
      totalCommits: 0,
      verifiedProjects: 0,
      completedProjects: 0,
    },
  );

  const featuredProject =
    projects.find((project) => project.id === user.featuredProjectId) ||
    projects.find((project) => project.featured);

  const primaryTechStack = user.skills
    .map((skill) => skill.skill.name)
    .slice(0, 12);

  const topSkills = user.skills.map((skill) => skill.skill).slice(0, 12);

  const topProjects = projects
    .sort((a, b) => (b.engineeringScore || 0) - (a.engineeringScore || 0))
    .slice(0, 6);

  // Hackathon wins
  const hackathonWins = await prisma.hackathonWinner.count({
    where: {
      team: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    },
  });

  // GitHub totals
  const githubStats = {
    totalStars: stats.totalStars,
    totalForks: stats.totalForks,
    totalCommits: stats.totalCommits,
  };

  // Portfolio
  return {
    // User
    id: user.id,

    username: user.username,

    profile: user.profile,

    // Scores
    reputationScore: user.reputationScore,

    engineeringScore: user.engineeringScore,

    trustLevel: user.trustLevel,

    // Recruiter-friendly summary
    primaryTechStack,

    topSkills: topSkills,

    totalSkills: user.skills.length,

    totalCodingProfiles: user.codingProfiles.length,

    totalEducation: user.educations.length,

    // Stats
    stats: {
      totalProjects: projects.length,

      verifiedProjects: stats.verifiedProjects,

      completedProjects: stats.completedProjects,

      hackathonWins,

      totalBadges: user.badges.length,

      totalExperiences: user.experiences.length,
    },

    // GitHub
    githubStats,

    // Featured project
    featuredProject,

    // Projects
    topProjects,

    // Experiences
    experiences: user.experiences,

    // Education
    educations: user.educations,

    // Skills
    skills: user.skills,

    // Coding profiles
    codingProfiles: user.codingProfiles,

    // Badges
    badges: user.badges,

    // Activities
    recentActivities: user.activities,
  };
};

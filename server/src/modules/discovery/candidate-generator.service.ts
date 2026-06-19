import prisma from "shared/database/prisma";

type CandidateStrategy = "discovery" | "personalized";

export const buildOr = (
  conditions: Array<Record<string, unknown> | false | null | undefined>,
) => {
  return conditions.filter(Boolean) as Record<string, unknown>[];
};

export const generateFeedCandidates = async (
  userId: string,

  strategy: CandidateStrategy = "discovery",
) => {
  // Concurrently fetch user profile details, follows list, and user affinities
  const [user, follows, affinities] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },

      include: {
        profile: true,

        interestProfile: true,

        skills: {
          include: {
            skill: true,
          },
        },
      },
    }),
    prisma.follow.findMany({
      where: {
        followerId: userId,
      },

      select: {
        followingId: true,
      },
    }),
    prisma.userAffinity.findMany({
      where: {
        userId,

        score: {
          gte: 20,
        },
      },

      orderBy: {
        score: "desc",
      },

      take: 100,
    }),
  ]);

  if (!user) {
    return {
      posts: [],
      projects: [],
      hackathons: [],
      jobs: [],
      companies: [],
    };
  }

  const followingIds = follows.map((f) => f.followingId);

  const affinityUserIds = affinities.map((a) => a.targetUserId);

  // SKILLS
  const skillNames = user.skills.map((s) => s.skill.name);

  const postOr = buildOr([
    strategy === "discovery" && {
      authorId: {
        in: followingIds,
      },
    },

    strategy === "discovery" && {
      authorId: {
        in: affinityUserIds,
      },
    },

    strategy === "discovery" && {
      trendingScore: {
        gte: 20,
      },
    },

    strategy === "discovery" && {
      featured: true,
    },

    strategy === "discovery" && user.profile?.collegeId
      ? {
          collegeId: user.profile.collegeId,
        }
      : null,

    strategy === "discovery" && {
      communityId: {
        not: null,
      },
    },
  ]);

  const projectOr = buildOr([
    strategy === "discovery" && {
      ownerId: {
        in: affinityUserIds,
      },
    },

    {
      featured: true,
    },

    strategy === "discovery" && {
      trendingScore: {
        gte: 20,
      },
    },

    {
      searchTags: {
        hasSome: skillNames,
      },
    },
  ]);

  const hackathonOr = buildOr([
    {
      featured: true,
    },

    {
      verified: true,
    },

    strategy === "discovery" && {
      createdById: {
        in: affinityUserIds,
      },
    },

    strategy === "personalized" && {
      tags: {
        hasSome: skillNames,
      },
    },
  ]);

  const jobOr = buildOr([
    {
      featured: true,
    },

    {
      skillsRequired: {
        hasSome: skillNames,
      },
    },

    {
      company: {
        verified: true,
      },
    },
  ]);

  const [posts, projects, hackathons, jobs, companies] = await Promise.all([
    // POSTS
    prisma.post.findMany({
      where: {
        deletedAt: null,

        discoverable: true,

        visibility: "PUBLIC",

        ...(postOr.length ? { OR: postOr } : {}),
      },

      include: {
        author: {
          include: {
            profile: true,
          },
        },

        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: strategy === "discovery" ? 150 : 50,
    }),

    // PROJECTS
    prisma.project.findMany({
      where: {
        visibility: "PUBLIC",

        deletedAt: null,

        ...(projectOr.length ? { OR: projectOr } : {}),
      },

      include: {
        owner: {
          include: {
            profile: true,
          },
        },

        members: true,
      },

      orderBy: {
        trendingScore: "desc",
      },

      take: strategy === "discovery" ? 80 : 30,
    }),

    // HACKATHONS
    prisma.hackathon.findMany({
      where: {
        deletedAt: null,

        NOT: {
          status: {
            in: ["DRAFT", "DELETED", "ARCHIVED"],
          },
        },

        registrationDeadline: {
          gte: new Date(),
        },

        ...(hackathonOr.length ? { OR: hackathonOr } : {}),
      },

      include: {
        createdBy: true,
      },

      orderBy: {
        registrationDeadline: "asc",
      },

      take: strategy === "discovery" ? 50 : 20,
    }),

    // JOBS
    prisma.job.findMany({
      where: {
        deletedAt: null,

        status: "OPEN",

        ...(strategy === "discovery" && jobOr.length ? { OR: jobOr } : {}),
      },

      include: {
        company: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: strategy === "discovery" ? 80 : 30,
    }),

    prisma.company.findMany({
      where: {
        hiringEnabled: true,
      },

      orderBy: {
        totalRatings: "desc",
      },

      take: strategy === "discovery" ? 0 : 10,
    }),
  ]);

  return {
    posts,

    projects,

    hackathons,

    jobs,

    companies,
  };
};

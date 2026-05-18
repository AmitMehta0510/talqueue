import prisma from "shared/database/prisma";

export const generateFeedCandidates = async (userId: string) => {
  // USER
  const user = await prisma.user.findUnique({
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
  });

  if (!user) {
    return {
      posts: [],
      projects: [],
      hackathons: [],
      jobs: [],
    };
  }

  // FOLLOWING & AFFINITY

  const [follows, affinities] = await Promise.all([
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

  const followingIds = follows.map((f) => f.followingId);

  const affinityUserIds = affinities.map((a) => a.targetUserId);

  // SKILLS
  const skillNames = user.skills.map((s) => s.skill.name);

  const [posts, projects, hackathons, jobs] = await Promise.all([
    // POSTS
    prisma.post.findMany({
      where: {
        deletedAt: null,

        OR: [
          {
            authorId: {
              in: followingIds,
            },
          },

          {
            authorId: {
              in: affinityUserIds,
            },
          },

          {
            trendingScore: {
              gte: 20,
            },
          },

          {
            featured: true,
          },

          user.profile?.collegeId
            ? {
                collegeId: user.profile.collegeId,
              }
            : {},

          {
            companyCommunityId: {
              not: null,
            },
          },
        ],
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

      take: 150,
    }),

    // PROJECTS
    prisma.project.findMany({
      where: {
        visibility: "PUBLIC",

        deletedAt: null,

        OR: [
          {
            ownerId: {
              in: affinityUserIds,
            },
          },

          {
            featured: true,
          },

          {
            trendingScore: {
              gte: 20,
            },
          },

          {
            tags: {
              hasSome: skillNames,
            },
          },
        ],
      },

      include: {
        owner: {
          include: {
            profile: true,
          },
        },

        members: true,
      },

      take: 80,
    }),

    // HACKATHONS
    prisma.hackathon.findMany({
      where: {
        deletedAt: null,

        registrationDeadline: {
          gte: new Date(),
        },

        OR: [
          {
            featured: true,
          },

          {
            verified: true,
          },

          {
            createdById: {
              in: affinityUserIds,
            },
          },
        ],
      },

      include: {
        createdBy: true,
      },

      take: 50,
    }),

    // JOBS
    prisma.job.findMany({
      where: {
        deletedAt: null,

        status: "OPEN",

        OR: [
          {
            featured: true,
          },

          {
            tags: {
              hasSome: skillNames,
            },
          },

          {
            company: {
              verified: true,
            },
          },
        ],
      },

      include: {
        company: true,
      },

      take: 80,
    }),
  ]);

  return {
    posts,

    projects,

    hackathons,

    jobs,
  };
};

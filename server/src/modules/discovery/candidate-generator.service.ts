import prisma from "shared/database/prisma";

type CandidateStrategy = "discovery" | "personalized";

export const buildOr = (
  conditions: Array<Record<string, unknown> | false | null | undefined>,
) => {
  return conditions.filter(Boolean) as Record<string, unknown>[];
};

export interface PreFetchedFeedContext {
  followingIds: string[];
  affinityUserIds: string[];
  skillNames: string[];
  collegeId?: string | null;
}

export const generateFeedCandidates = async (
  userId: string,
  strategy: CandidateStrategy = "discovery",
  preFetched?: PreFetchedFeedContext,
  pagination?: { cursor?: string; limit?: number }
) => {
  let followingIds: string[] = [];
  let affinityUserIds: string[] = [];
  let skillNames: string[] = [];
  let collegeId: string | null = null;

  if (preFetched) {
    followingIds = preFetched.followingIds;
    affinityUserIds = preFetched.affinityUserIds;
    skillNames = preFetched.skillNames;
    collegeId = preFetched.collegeId ?? null;
  } else {
    // Concurrently fetch user profile details, follows list, and user affinities
    const [user, follows, affinities] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          profile: {
            select: {
              collegeId: true,
            },
          },
          skills: {
            select: {
              skill: {
                select: {
                  name: true,
                },
              },
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

        // Cap at DB level — prevents loading unbounded follow lists into Node memory
        take: 500,
      }),
      prisma.userAffinity.findMany({
        where: {
          userId,

          score: {
            gte: 20,
          },
        },

        select: {
          targetUserId: true,
        },

        orderBy: {
          score: "desc",
        },

        take: 100,
      }),
    ]);

    if (user) {
      collegeId = user.profile?.collegeId ?? null;
      skillNames = user.skills.map((s) => s.skill.name);
    }
    followingIds = follows.map((f) => f.followingId);
    affinityUserIds = affinities.map((a) => a.targetUserId);
  }

  // Clamping follows list limit to avoid heavy IN clause query bottleneck
  const cappedFollowingIds = followingIds.slice(0, 500);

  const postOr = buildOr([
    strategy === "discovery" && cappedFollowingIds.length > 0 && {
      authorId: {
        in: cappedFollowingIds,
      },
    },

    strategy === "discovery" && affinityUserIds.length > 0 && {
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

    strategy === "discovery" && collegeId
      ? {
          collegeId: collegeId,
        }
      : null,

    strategy === "discovery" && {
      communityId: {
        not: null,
      },
    },
  ]);

  const projectOr = buildOr([
    strategy === "discovery" && affinityUserIds.length > 0 && {
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

    skillNames.length > 0 && {
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

    strategy === "discovery" && affinityUserIds.length > 0 && {
      createdById: {
        in: affinityUserIds,
      },
    },

    strategy === "personalized" && skillNames.length > 0 && {
      tags: {
        hasSome: skillNames,
      },
    },
  ]);

  const jobOr = buildOr([
    {
      featured: true,
    },

    skillNames.length > 0 && {
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

  const limitPosts = pagination?.limit ? pagination.limit * 3 : (strategy === "discovery" ? 150 : 50);
  const limitProjects = strategy === "discovery" ? 80 : 30;
  const limitHackathons = strategy === "discovery" ? 50 : 20;
  const limitJobs = strategy === "discovery" ? 80 : 30;

  const [posts, projects, hackathons, jobs, companies] = await Promise.all([
    // POSTS
    prisma.post.findMany({
      where: {
        deletedAt: null,

        discoverable: true,

        visibility: "PUBLIC",

        ...(postOr.length ? { OR: postOr } : {}),
      },

      select: {
        id: true,
        content: true,
        type: true,
        announcement: true,
        anonymous: true,
        resourceUrl: true,
        resourceType: true,
        media: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
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

      take: limitPosts,
      ...(pagination?.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    }),

    // PROJECTS
    prisma.project.findMany({
      where: {
        visibility: "PUBLIC",

        deletedAt: null,

        ...(projectOr.length ? { OR: projectOr } : {}),
      },

      select: {
        id: true,
        title: true,
        // description and shortDescription excluded — not used in feed scoring or ranking
        githubUrl: true,
        liveUrl: true,
        techStack: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },

      orderBy: {
        trendingScore: "desc",
      },

      take: limitProjects,
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
      },

      select: {
        id: true,
        title: true,
        // description and shortDescription excluded — not used in feed scoring or ranking
        bannerUrl: true,
        logoUrl: true,
        startDate: true,
        endDate: true,
        registrationDeadline: true,
        maxTeamSize: true,
        minTeamSize: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },

      orderBy: {
        registrationDeadline: "asc",
      },

      take: limitHackathons,
    }),

    // JOBS
    prisma.job.findMany({
      where: {
        deletedAt: null,

        status: "OPEN",

        ...(strategy === "discovery" && jobOr.length ? { OR: jobOr } : {}),
      },

      select: {
        id: true,
        title: true,
        // description excluded — not used in feed scoring or ranking
        location: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        type: true,
        workMode: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            slug: true,
            verified: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: limitJobs,
    }),

    prisma.company.findMany({
      where: {
        hiringEnabled: true,
      },

      select: {
        id: true,
        name: true,
        logoUrl: true,
        slug: true,
        verified: true,
        industry: true,
        headquarters: true,
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

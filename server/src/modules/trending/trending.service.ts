import prisma from "shared/database/prisma";

const HOURS_DIVISOR = 1000 * 60 * 60;

const calculateHoursOld = (createdAt: Date) => {
  return Math.max(
    (Date.now() - new Date(createdAt).getTime()) / HOURS_DIVISOR,

    1,
  );
};

//
// POSTS
//
export const calculateTrendingPosts = async () => {
  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,

      discoverable: true,
    },

    take: 200,
  });

  await Promise.all(
    posts.map(async (post) => {
      const hoursOld = calculateHoursOld(post.createdAt);

      const engagementScore =
        post.likesCount * 2 +
        post.commentsCount * 4 +
        post.saveCount * 6 +
        post.shareCount * 8;

      const velocityScore = engagementScore / (hoursOld + 2);

      const trendingScore = velocityScore + (post.engagementScore || 0) * 0.3;

      //
      // PARALLEL UPSERTS
      //
      await Promise.all([
        prisma.post.update({
          where: {
            id: post.id,
          },

          data: {
            trendingScore,
          },
        }),

        prisma.trendingSnapshot.upsert({
          where: {
            entityId_entityType: {
              entityId: post.id,

              entityType: "POST",
            },
          },

          update: {
            score: trendingScore,

            velocityScore,

            engagementDelta: engagementScore,

            calculatedAt: new Date(),
          },

          create: {
            entityId: post.id,

            entityType: "POST",

            score: trendingScore,

            velocityScore,

            engagementDelta: engagementScore,
          },
        }),
      ]);
    }),
  );
};

//
// PROJECTS
//
export const calculateTrendingProjects = async () => {
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,

      visibility: "PUBLIC",
    },

    take: 100,
  });

  await Promise.all(
    projects.map(async (project) => {
      const hoursOld = calculateHoursOld(project.createdAt);

      let qualityScore = 0;

      if (project.verified) {
        qualityScore += 100;
      }

      if (project.liveUrl) {
        qualityScore += 50;
      }

      if (project.githubUrl) {
        qualityScore += 40;
      }

      qualityScore += project.contributorsCount * 5;

      qualityScore += Math.min(project.starsCount, 100);

      qualityScore += project.forksCount * 2;

      const velocityScore = qualityScore / (hoursOld + 2);

      const trendingScore = velocityScore + qualityScore * 0.4;

      await Promise.all([
        prisma.project.update({
          where: {
            id: project.id,
          },

          data: {
            trendingScore,
          },
        }),

        prisma.trendingSnapshot.upsert({
          where: {
            entityId_entityType: {
              entityId: project.id,

              entityType: "PROJECT",
            },
          },

          update: {
            score: trendingScore,

            velocityScore,

            engagementDelta: qualityScore,

            calculatedAt: new Date(),
          },

          create: {
            entityId: project.id,

            entityType: "PROJECT",

            score: trendingScore,

            velocityScore,

            engagementDelta: qualityScore,
          },
        }),
      ]);
    }),
  );
};

//
// HACKATHONS
//
export const calculateTrendingHackathons = async () => {
  const hackathons = await prisma.hackathon.findMany({
    where: {
      deletedAt: null,
    },

    include: {
      _count: {
        select: {
          registrations: true,

          submissions: true,
        },
      },
    },

    take: 100,
  });

  await Promise.all(
    hackathons.map(async (hackathon) => {
      const hoursOld = calculateHoursOld(hackathon.createdAt);

      let engagement = 0;

      engagement += hackathon._count.registrations * 3;

      engagement += hackathon._count.submissions * 8;

      if (hackathon.featured) {
        engagement += 80;
      }

      if (hackathon.verified) {
        engagement += 100;
      }

      const velocityScore = engagement / (hoursOld + 2);

      const trendingScore = velocityScore + engagement * 0.4;

      await Promise.all([
        prisma.hackathon.update({
          where: {
            id: hackathon.id,
          },

          data: {
            trendingScore,
          },
        }),

        prisma.trendingSnapshot.upsert({
          where: {
            entityId_entityType: {
              entityId: hackathon.id,

              entityType: "HACKATHON",
            },
          },

          update: {
            score: trendingScore,

            velocityScore,

            engagementDelta: engagement,

            calculatedAt: new Date(),
          },

          create: {
            entityId: hackathon.id,

            entityType: "HACKATHON",

            score: trendingScore,

            velocityScore,

            engagementDelta: engagement,
          },
        }),
      ]);
    }),
  );
};

//
// REFRESH
//
export const refreshTrendingSnapshots = async () => {
  await Promise.all([
    calculateTrendingPosts(),

    calculateTrendingProjects(),

    calculateTrendingHackathons(),
  ]);

  //
  // CACHE CLEANUP
  //
  await prisma.recommendationCache.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return {
    success: true,
  };
};

//
// TRENDING FEED
//
export const getTrendingFeed = async () => {
  const snapshots = await prisma.trendingSnapshot.findMany({
    orderBy: {
      score: "desc",
    },

    take: 100,
  });

  //
  // GROUP IDS
  //
  const postIds: string[] = [];

  const projectIds: string[] = [];

  const hackathonIds: string[] = [];

  for (const snapshot of snapshots) {
    switch (snapshot.entityType) {
      case "POST":
        postIds.push(snapshot.entityId);

        break;

      case "PROJECT":
        projectIds.push(snapshot.entityId);

        break;

      case "HACKATHON":
        hackathonIds.push(snapshot.entityId);

        break;
    }
  }

  //
  // PARALLEL FETCH
  //
  const [posts, projects, hackathons] = await Promise.all([
    prisma.post.findMany({
      where: {
        id: {
          in: postIds,
        },
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
    }),

    prisma.project.findMany({
      where: {
        id: {
          in: projectIds,
        },
      },

      include: {
        owner: {
          include: {
            profile: true,
          },
        },

        members: true,
      },
    }),

    prisma.hackathon.findMany({
      where: {
        id: {
          in: hackathonIds,
        },
      },

      include: {
        createdBy: true,
      },
    }),
  ]);

  //
  // FAST LOOKUP MAPS
  //
  const postMap = new Map(posts.map((post) => [post.id, post]));

  const projectMap = new Map(projects.map((project) => [project.id, project]));

  const hackathonMap = new Map(
    hackathons.map((hackathon) => [hackathon.id, hackathon]),
  );

  //
  // BUILD FEED
  //
  return snapshots
    .map((snapshot) => {
      let data = null;

      switch (snapshot.entityType) {
        case "POST":
          data = postMap.get(snapshot.entityId);

          break;

        case "PROJECT":
          data = projectMap.get(snapshot.entityId);

          break;

        case "HACKATHON":
          data = hackathonMap.get(snapshot.entityId);

          break;
      }

      return {
        type: snapshot.entityType,

        score: snapshot.score,

        velocityScore: snapshot.velocityScore,

        engagementDelta: snapshot.engagementDelta,

        data,
      };
    })
    .filter((item) => item.data);
};

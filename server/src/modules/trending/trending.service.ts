import { FeedItemType } from "@prisma/client";
import prisma from "shared/database/prisma";
import { calculateHoursOld } from "modules/feed/feed-ranking.service";

type TrendingEntityType =
  | "POST"
  | "PROJECT"
  | "HACKATHON"
  | "COMMUNITY";

type TrendingConfig<T> = {
  entityType: TrendingEntityType;
  findMany: () => Promise<T[]>;
  batchSize?: number;
  getId: (item: T) => string;
  getCreatedAt: (item: T) => Date;
  getEngagementScore: (item: T) => number;
  getTrendingScore?: (item: T, velocityScore: number, engagementScore: number) => number;
  updateEntity: (
    item: T,
    trendingScore: number,
    engagementScore: number,
  ) => Promise<unknown>;
};

const DEFAULT_TRENDING_BATCH_SIZE = 25;

const chunkItems = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const calculateDefaultTrendingScore = (
  _item: unknown,

  velocityScore: number,

  engagementScore: number,
) => {
  return velocityScore + engagementScore * 0.4;
};

const upsertTrendingSnapshot = async (
  entityId: string,

  entityType: TrendingEntityType,

  score: number,

  velocityScore: number,

  engagementDelta: number,
) => {
  const calculatedAt = new Date();

  return prisma.trendingSnapshot.upsert({
    where: {
      entityId_entityType: {
        entityId,

        entityType: entityType as FeedItemType,
      },
    },

    update: {
      score,

      velocityScore,

      engagementDelta,

      calculatedAt,
    },

    create: {
      entityId,

      entityType: entityType as FeedItemType,

      score,

      velocityScore,

      engagementDelta,

      calculatedAt,
    },
  });
};

const calculateTrendingEntities = async <T>(config: TrendingConfig<T>) => {
  const items = await config.findMany();

  for (const chunk of chunkItems(
    items,

    config.batchSize || DEFAULT_TRENDING_BATCH_SIZE,
  )) {
    await Promise.all(
      chunk.map(async (item) => {
      const engagementScore = config.getEngagementScore(item);

      const velocityScore = engagementScore / (calculateHoursOld(config.getCreatedAt(item)) + 2);

      const trendingScore = (
        config.getTrendingScore || calculateDefaultTrendingScore
      )(item, velocityScore, engagementScore);

      const entityId = config.getId(item);

      await Promise.all([
        config.updateEntity(item, trendingScore, engagementScore),

        upsertTrendingSnapshot(
          entityId,

          config.entityType,

          trendingScore,

          velocityScore,

          engagementScore,
        ),
      ]);
      }),
    );
  }
};

export const calculateTrendingPosts = async () => {
  return calculateTrendingEntities({
    entityType: "POST",

    findMany: () =>
      prisma.post.findMany({
        where: {
          deletedAt: null,

          discoverable: true,

          visibility: "PUBLIC",
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 200,
      }),

    getId: (post) => post.id,

    getCreatedAt: (post) => post.createdAt,

    getEngagementScore: (post) =>
      post.likesCount * 2 +
      post.commentsCount * 4 +
      post.saveCount * 6 +
      post.shareCount * 8,

    getTrendingScore: (post, velocityScore) =>
      velocityScore + (post.engagementScore || 0) * 0.3,

    updateEntity: (post, trendingScore) =>
      prisma.post.update({
        where: {
          id: post.id,
        },

        data: {
          trendingScore,
        },
      }),
  });
};

export const calculateTrendingProjects = async () => {
  return calculateTrendingEntities({
    entityType: "PROJECT",

    findMany: () =>
      prisma.project.findMany({
        where: {
          deletedAt: null,

          visibility: "PUBLIC",
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 100,
      }),

    getId: (project) => project.id,

    getCreatedAt: (project) => project.createdAt,

    getEngagementScore: (project) => {
      let score = 0;

      if (project.verified) {
        score += 100;
      }

      if (project.liveUrl) {
        score += 50;
      }

      if (project.githubUrl) {
        score += 40;
      }

      score += project.contributorsCount * 5;

      score += Math.min(project.starsCount, 100);

      score += project.forksCount * 2;

      return score;
    },

    updateEntity: (project, trendingScore) =>
      prisma.project.update({
        where: {
          id: project.id,
        },

        data: {
          trendingScore,
        },
      }),
  });
};

export const calculateTrendingHackathons = async () => {
  return calculateTrendingEntities({
    entityType: "HACKATHON",

    findMany: () =>
      prisma.hackathon.findMany({
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

        orderBy: {
          createdAt: "desc",
        },

        take: 100,
      }),

    getId: (hackathon) => hackathon.id,

    getCreatedAt: (hackathon) => hackathon.createdAt,

    getEngagementScore: (hackathon) => {
      let score = 0;

      score += hackathon._count.registrations * 3;

      score += hackathon._count.submissions * 8;

      if (hackathon.featured) {
        score += 80;
      }

      if (hackathon.verified) {
        score += 100;
      }

      return score;
    },

    updateEntity: (hackathon, trendingScore) =>
      prisma.hackathon.update({
        where: {
          id: hackathon.id,
        },

        data: {
          trendingScore,
        },
      }),
  });
};

export const calculateTrendingCommunities = async () => {
  return calculateTrendingEntities({
    entityType: "COMMUNITY",

    findMany: () =>
      prisma.community.findMany({
        where: {
          archived: false,
        },

        include: {
          _count: {
            select: {
              members: true,

              posts: true,

              conversations: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 100,
      }),

    getId: (community) => community.id,

    getCreatedAt: (community) => community.createdAt,

    getEngagementScore: (community) => {
      let score = 0;

      score += community._count.members * 4;

      score += community._count.posts * 6;

      score += community._count.conversations * 8;

      if (community.verified) {
        score += 100;
      }

      if (community.visibility === "PUBLIC") {
        score += 30;
      }

      return score;
    },

    updateEntity: (community, trendingScore, engagementScore) =>
      prisma.community.update({
        where: {
          id: community.id,
        },

        data: {
          trendingScore,

          activityScore: engagementScore,

          memberCount: community._count.members,
        },
      }),
  });
};

export const refreshTrendingSnapshots = async () => {
  await Promise.all([
    calculateTrendingPosts(),

    calculateTrendingProjects(),

    calculateTrendingHackathons(),

    calculateTrendingCommunities(),
  ]);

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

export const getTrendingFeed = async () => {
  const snapshots = await prisma.trendingSnapshot.findMany({
    where: {
      entityType: {
        in: [
          FeedItemType.POST,

          FeedItemType.PROJECT,

          FeedItemType.HACKATHON,

          FeedItemType.COMMUNITY,
        ],
      },
    },

    orderBy: {
      score: "desc",
    },

    take: 100,
  });

  const idsByType = {
    POST: [] as string[],
    PROJECT: [] as string[],
    HACKATHON: [] as string[],
    COMMUNITY: [] as string[],
  };

  for (const snapshot of snapshots) {
    if (snapshot.entityType in idsByType) {
      idsByType[snapshot.entityType as TrendingEntityType].push(snapshot.entityId);
    }
  }

  const [posts, projects, hackathons, communities] = await Promise.all([
    prisma.post.findMany({
      where: {
        id: {
          in: idsByType.POST,
        },

        deletedAt: null,

        discoverable: true,

        visibility: "PUBLIC",
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
          in: idsByType.PROJECT,
        },

        deletedAt: null,

        visibility: "PUBLIC",
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
          in: idsByType.HACKATHON,
        },

        deletedAt: null,
      },

      include: {
        createdBy: true,
      },
    }),

    prisma.community.findMany({
      where: {
        id: {
          in: idsByType.COMMUNITY,
        },

        archived: false,

        searchable: true,
      },

      include: {
        createdBy: {
          include: {
            profile: true,
          },
        },

        _count: {
          select: {
            members: true,

            posts: true,

            conversations: true,
          },
        },
      },
    }),
  ]);

  const entityMaps = {
    POST: new Map(posts.map((post) => [post.id, post])),
    PROJECT: new Map(projects.map((project) => [project.id, project])),
    HACKATHON: new Map(hackathons.map((hackathon) => [hackathon.id, hackathon])),
    COMMUNITY: new Map(communities.map((community) => [community.id, community])),
  };

  const staleSnapshotIds: string[] = [];

  const feed = snapshots
    .map((snapshot) => {
      const entityType = snapshot.entityType as TrendingEntityType;

      const data = entityMaps[entityType]?.get(snapshot.entityId) || null;

      if (!data) {
        staleSnapshotIds.push(snapshot.id);
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

  if (staleSnapshotIds.length) {
    await prisma.trendingSnapshot.deleteMany({
      where: {
        id: {
          in: staleSnapshotIds,
        },
      },
    });
  }

  return feed;
};

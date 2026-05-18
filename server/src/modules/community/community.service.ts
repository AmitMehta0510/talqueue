import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import slugify from "slugify";

import { addReputation } from "modules/reputation/reputation.service";

import { createActivity } from "modules/activities/activity.service";

import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";

import { calculateUserAffinity } from "modules/affinity/affinity.service";

import { createNotification } from "modules/notificatios/notifications.service";

export const createCommunity = async (userId: string, data: any) => {
  const slug = slugify(data.name, {
    lower: true,
    strict: true,
  });

  // Duplicate slug
  const existing = await prisma.community.findUnique({
    where: {
      slug,
    },
  });

  if (existing) {
    throw new AppError("Community slug already exists", 400);
  }

  // TYPE VALIDATION
  if (!["GENERAL", "COLLEGE", "COMPANY"].includes(data.type)) {
    throw new AppError("Invalid community type", 400);
  }

  // COLLEGE VALIDATION
  if (data.type === "COLLEGE") {
    if (!data.collegeId) {
      throw new AppError("collegeId required", 400);
    }

    const college = await prisma.college.findUnique({
      where: {
        id: data.collegeId,
      },
    });

    if (!college) {
      throw new AppError("College not found", 404);
    }
  }

  // COMPANY VALIDATION
  if (data.type === "COMPANY") {
    if (!data.companyId || !data.city) {
      throw new AppError("companyId and city required", 400);
    }

    const company = await prisma.company.findUnique({
      where: {
        id: data.companyId,
      },
    });

    if (!company) {
      throw new AppError("Company not found", 404);
    }
  }

  // CREATE
  const community = await prisma.community.create({
    data: {
      name: data.name,

      slug,

      description: data.description,

      type: data.type,

      visibility: data.type === "COMPANY" ? "PRIVATE" : "PUBLIC",

      category: data.category,

      tags: data.tags || [],

      searchKeywords: data.searchKeywords || [],

      companyId: data.companyId,

      collegeId: data.collegeId,

      city: data.city,

      createdById: userId,

      members: {
        create: {
          userId,

          role: "OWNER",
        },
      },
    },

    include: {
      members: true,
    },
  });

  // DEFAULT CONVERSATION
  await prisma.conversation.create({
    data: {
      type: "COMMUNITY",

      title: `${community.name} General`,

      category: "GENERAL",

      public: community.visibility === "PUBLIC",

      communityId: community.id,

      createdById: userId,
    },
  });

  // ACTIVITY
  createActivity(
    userId,

    "COMMUNITY_CREATED",

    "Created community",

    `Created ${community.name}`,

    {
      communityId: community.id,
    },
  ).catch(console.error);

  // REPUTATION
  addReputation(
    userId,

    "COMMUNITY_CREATED",

    3,

    "Created a community",

    {
      communityId: community.id,
    },
  ).catch(console.error);

  // ENGINEERING SCORE
  calculateEngineeringScore(userId).catch(console.error);

  return community;
};

export const getCommunityBySlug = async (slug: string) => {
  const community = await prisma.community.findUnique({
    where: {
      slug,
    },

    include: {
      createdBy: {
        include: {
          profile: true,
        },
      },

      members: {
        take: 20,

        include: {
          user: {
            include: {
              profile: true,

              presence: true,
            },
          },
        },
      },

      conversations: {
        orderBy: {
          updatedAt: "desc",
        },

        take: 10,
      },

      posts: {
        where: {
          deletedAt: null,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 10,

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
      },

      _count: {
        select: {
          members: true,

          posts: true,

          conversations: true,
        },
      },
    },
  });

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  return community;
};

export const archiveCommunity = async (userId: string, communityId: string) => {
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId,

        userId,
      },
    },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    throw new AppError("Unauthorized", 403);
  }

  const community = await prisma.community.update({
    where: {
      id: communityId,
    },

    data: {
      archived: true,

      archivedAt: new Date(),
    },
  });

  // Archive conversations
  await prisma.conversation.updateMany({
    where: {
      communityId,
    },

    data: {
      archived: true,
    },
  });

  // ACTIVITY
  createActivity(
    userId,

    "COMMUNITY_ARCHIVED",

    "Archived community",

    `Archived ${community.name}`,

    {
      communityId,
    },
  ).catch(console.error);

  return {
    success: true,
  };
};

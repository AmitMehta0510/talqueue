import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification }
from "modules/notificatios/notifications.service";

import { addReputation }
from "modules/reputation/reputation.service";

import { calculateEngineeringScore }
from "modules/reputation/engineering-score.service";

import { calculateUserAffinity }
from "modules/affinity/affinity.service";

import { createActivity }
from "modules/activities/activity.service";

import { trackInteraction }
from "modules/interaction/interaction-tracking.service";

export const joinCompanyCommunity = async (
    userId: string,
    communityId: string
  ) => {

    const community =
      await prisma.companyCommunity.findUnique({

        where: {
          id: communityId,
        },

        include: {
          company: true,
        },
      });

    if (!community) {
      throw new AppError(
        "Community not found",
        404
      );
    }

    const existingMembership =
      await prisma.companyCommunityMembership.findUnique({
        where: {
          communityId_userId: {
            communityId,
            userId,
          },
        },
      });

    if (existingMembership) {
      return existingMembership;
    }

    //
    // Employee verification
    //
    const currentEmployee =
      await prisma.experience.findFirst({

        where: {

          userId,

          companyId:
            community.companyId,

          isCurrent: true,
        },
      });

    const membership =
      await prisma.companyCommunityMembership.create({

        data: {

          communityId,

          userId,

          verifiedEmployee:
            !!currentEmployee,

          role:
            currentEmployee
              ? "VERIFIED_EMPLOYEE"
              : "MEMBER",
        },

        include: {
          community: {
            include: {
              company: true,
            },
          },
        },
      });

    //
    // Update count
    //
    await prisma.companyCommunity.update({

      where: {
        id: communityId,
      },

      data: {
        memberCount: {
          increment: 1,
        },
      },
    });

    //
    // Add to general conversation
    //
    const conversation =
      await prisma.conversation.findFirst({

        where: {
          companyCommunityId:
            communityId,

          type:
            "COMMUNITY",
        },
      });

    if (conversation) {

      const existingParticipant =
        await prisma.conversationParticipant.findFirst({
          where: {
            conversationId:
              conversation.id,

            userId,
          },
        });

      if (!existingParticipant) {

        await prisma.conversationParticipant.create({
          data: {
            conversationId:
              conversation.id,

            userId,
          },
        });
      }
    }

    //
    // Reputation
    //
    addReputation(
      userId,

      "COMMUNITY_JOINED",

      currentEmployee
        ? 10
        : 4,

      "Joined company community",

      {
        communityId,
      }
    ).catch(console.error);

    //
    // Engineering score
    //
    calculateEngineeringScore(
      userId
    ).catch(console.error);

    //
    // Activity
    //
    createActivity(
      userId,

      "COMMUNITY_JOINED",

      "Joined company community",

      `Joined ${community.company.name} community`,

      {
        communityId,
      }
    ).catch(console.error);

    return membership;
  };

  export const getCompanyCommunityFeed = async (
    userId: string,
    communityId: string
  ) => {

    const membership =
      await prisma.companyCommunityMembership.findUnique({
        where: {
          communityId_userId: {
            communityId,
            userId,
          },
        },
      });

    if (!membership) {
      throw new AppError(
        "Join community first",
        403
      );
    }

    const posts =
      await prisma.post.findMany({

        where: {
          companyCommunityId:
            communityId,
        },

        include: {

          author: {
            include: {
              profile: true,
            },
          },

          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },

        orderBy: [
          {
            pinned: "desc",
          },

          {
            createdAt: "desc",
          },
        ],

        take: 100,
      });

    //
    // Interaction tracking
    //
    trackInteraction(userId, {

      targetId:
        communityId,

      targetType:
        "COMPANY",

      interactionType:
        "VIEW",

      metadata: {
        action:
          "COMPANY_COMMUNITY_FEED_VIEW",
      },
    }).catch(console.error);

    return posts;
  };

  export const getVerifiedEmployees =  async (
    communityId: string
  ) => {

    return prisma.companyCommunityMembership.findMany({

      where: {

        communityId,

        verifiedEmployee:
          true,

        active: true,
      },

      include: {

        user: {
          include: {
            profile: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          role: "desc",
        },
      ],

      take: 100,
    });
  };

export const createHiringAlert =
  async (
    userId: string,
    communityId: string,
    data: {
      content: string;
    }
  ) => {

    const membership =
      await prisma.companyCommunityMembership.findUnique({
        where: {
          communityId_userId: {
            communityId,
            userId,
          },
        },
      });

    if (!membership) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    if (
      membership.role !==
        "ADMIN" &&

      membership.role !==
        "MODERATOR" &&

      membership.role !==
        "VERIFIED_EMPLOYEE"
    ) {
      throw new AppError(
        "Only verified employees can post hiring alerts",
        403
      );
    }

    const post =
      await prisma.post.create({

        data: {

          authorId:
            userId,

          companyCommunityId:
            communityId,

          content:
            data.content,

          announcement:
            true,

          visibility:
            "PUBLIC",
        },
      });

    //
    // Activity
    //
    createActivity(
      userId,

      "POST_CREATED",

      "Created hiring alert",

      "Posted a hiring alert",

      {
        postId:
          post.id,
      }
    ).catch(console.error);

    //
    // Reputation
    //
    addReputation(
      userId,

      "POST_CREATED",

      8,

      "Posted hiring alert",

      {
        communityId,
      }
    ).catch(console.error);

    return post;
  };


  export const createReferralDiscussion =
  async (
    userId: string,
    communityId: string,
    data: {
      content: string;
    }
  ) => {

    const membership =
      await prisma.companyCommunityMembership.findUnique({
        where: {
          communityId_userId: {
            communityId,
            userId,
          },
        },
      });

    if (!membership) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    const post =
      await prisma.post.create({

        data: {

          authorId:
            userId,

          companyCommunityId:
            communityId,

          content:
            data.content,

          visibility:
            "PUBLIC",

          tags: [
            "REFERRAL",
          ],
        },
      });

    //
    // Affinity boost
    //
    const employees =
      await prisma.companyCommunityMembership.findMany({

        where: {
          communityId,
          verifiedEmployee:
            true,
        },
      });

    await Promise.all(
      employees.map(
        async (employee) => {

          if (
            employee.userId !==
            userId
          ) {

            await calculateUserAffinity(
              userId,
              employee.userId
            );
          }
        }
      )
    );

    return post;
  };

  export const getCompanyCommunityLeaderboard =
  async (
    communityId: string
  ) => {

    return prisma.companyCommunityMembership.findMany({

      where: {
        communityId,
        active: true,
      },

      include: {

        user: {
          include: {
            profile: true,
          },
        },
      },

      orderBy: [
        {
          contributionScore:
            "desc",
        },
      ],

      take: 50,
    });
  };
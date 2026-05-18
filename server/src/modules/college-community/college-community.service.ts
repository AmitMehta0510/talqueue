import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import { addReputation } from "modules/reputation/reputation.service";

import { createActivity } from "modules/activities/activity.service";

import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";

import { calculateUserAffinity } from "modules/affinity/affinity.service";

import { trackInteraction } from "modules/interaction/interaction-tracking.service";

export const autoJoinCollegeCommunity = async (
  userId: string,
  collegeId: string,
) => {
  const college = await prisma.college.findUnique({
    where: {
      id: collegeId,
    },
  });

  if (!college) {
    throw new AppError("College not found", 404);
  }

  //
  // Existing membership
  //
  const existingMembership = await prisma.collegeMembership.findUnique({
    where: {
      userId_collegeId: {
        userId,
        collegeId,
      },
    },
  });

  if (existingMembership) {
    return existingMembership;
  }

  //
  // Create membership
  //
  const membership = await prisma.collegeMembership.create({
    data: {
      userId,
      collegeId,
      role: "MEMBER",
    },

    include: {
      college: true,
    },
  });

  //
  // Add user to general college conversation
  //
  const generalConversation = await prisma.conversation.findFirst({
    where: {
      collegeId,
      type: "COLLEGE",
      public: true,
    },
  });

  if (generalConversation) {
    const existingParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: generalConversation.id,

        userId,
      },
    });

    if (!existingParticipant) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId: generalConversation.id,

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

    "COLLEGE_JOINED",

    5,

    "Joined college community",

    {
      collegeId,
    },
  ).catch(console.error);

  //
  // Engineering score
  //
  calculateEngineeringScore(userId).catch(console.error);

  //
  // Activity
  //
  createActivity(
    userId,

    "COLLEGE_JOINED",

    "Joined college community",

    `Joined ${college.name} community`,

    {
      collegeId,
    },
  ).catch(console.error);

  return membership;
};

export const getCollegeFeed = async (userId: string, collegeId: string) => {
  //
  // Verify membership
  //
  const membership = await prisma.collegeMembership.findUnique({
    where: {
      userId_collegeId: {
        userId,
        collegeId,
      },
    },
  });

  if (!membership) {
    throw new AppError("Join college community first", 403);
  }

  const posts = await prisma.post.findMany({
    where: {
      collegeId,
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
  // Track interaction
  //
  trackInteraction(userId, {
    targetId: collegeId,
    targetType: "PROFILE",
    interactionType: "VIEW",

    metadata: {
      action: "COLLEGE_FEED_VIEW",
    },
  }).catch(console.error);

  return posts;
};

export const getCollegeLeaderboard = async (collegeId: string) => {
  return prisma.user.findMany({
    where: {
      profile: {
        collegeId,
      },
    },

    include: {
      profile: true,
    },

    orderBy: [
      {
        engineeringScore: "desc",
      },

      {
        reputationScore: "desc",
      },
    ],

    take: 50,
  });
};

export const getCollegeMembers = async (userId: string, collegeId: string) => {
  const members = await prisma.collegeMembership.findMany({
    where: {
      collegeId,
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

    orderBy: {
      contributionScore: "desc",
    },

    take: 100,
  });

  //
  // Affinity update
  //
  await Promise.all(
    members.map(async (member) => {
      if (member.userId !== userId) {
        await calculateUserAffinity(userId, member.userId);
      }
    }),
  );

  return members;
};

export const createCollegeAnnouncement = async (
  userId: string,
  collegeId: string,
  data: {
    content: string;
  },
) => {
  const membership = await prisma.collegeMembership.findUnique({
    where: {
      userId_collegeId: {
        userId,
        collegeId,
      },
    },
  });

  if (!membership) {
    throw new AppError("Unauthorized", 403);
  }

  if (membership.role !== "ADMIN" && membership.role !== "MODERATOR") {
    throw new AppError("Only admins can create announcements", 403);
  }

  const post = await prisma.post.create({
  data: {
    authorId: userId,

    content: data.content,

    type: "COLLEGE",

    collegeId,

    announcement: true,

    visibility: "PUBLIC",
  },
});

  //
  // Notify members
  //
  const members = await prisma.collegeMembership.findMany({
    where: {
      collegeId,
      active: true,
    },
  });

  for (const member of members) {
    if (member.userId === userId) {
      continue;
    }

    createNotification({
      userId: member.userId,

      actorId: userId,

      type: "SYSTEM",

      title: "College Announcement",

      message: "New announcement posted",

      entityId: post.id,

      entityType: "POST",
    }).catch(console.error);
  }

  //
  // Activity
  //
  createActivity(
    userId,

    "POST_CREATED",

    "Created announcement",

    "Created a college announcement",

    {
      postId: post.id,
    },
  ).catch(console.error);

  return post;
};

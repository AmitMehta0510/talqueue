import prisma from "shared/database/prisma";

import { createNotification,} from "modules/notificatios/notifications.service";
import { createActivity } from "modules/activities/activity.service";

export const addReputation =  async (
    userId: string,
    type: string,
    points: number,
    description?: string,
    metadata?: any
  ) => {

    // Create event
    await prisma.reputationEvent.create({
      data: {
        userId,
        type,
        points,
        description,
        metadata,
      },
    });

    // Increment score
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        reputationScore: {
          increment: points,
        },
      },
    });

    // Auto badge evaluation
    await evaluateAdvancedBadges(
  userId
);
  };

export const evaluateBadges =  async (userId: string) => {

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        include: {
          _count: {
            select: {
              posts: true,
              projectMemberships: true,
              createdHackathons: true,
              jobApplications: true,
            },
          },
        },
      });

    if (!user) {
      return;
    }

    // First Project Badge
    if (
      user._count
        .projectMemberships >= 1
    ) {

      await awardBadge(
        userId,
        "first-project"
      );
    }

    // Builder Badge
    if (
      user._count
        .projectMemberships >= 5
    ) {

      await awardBadge(
        userId,
        "builder"
      );
    }

    // Active Contributor
    if (
      user._count.posts >= 10
    ) {

      await awardBadge(
        userId,
        "active-contributor"
      );
    }

    // Hackathon Creator
    if (
      user._count
        .createdHackathons >= 1
    ) {

      await awardBadge(
        userId,
        "hackathon-organizer"
      );
    }

    // Job Seeker
    if (
      user._count
        .jobApplications >= 5
    ) {

      await awardBadge(
        userId,
        "job-seeker"
      );
    }

    // Reputation Milestones
    if (
      user.reputationScore >= 100
    ) {

      await awardBadge(
        userId,
        "rising-engineer"
      );
    }

    if (
      user.reputationScore >= 500
    ) {

      await awardBadge(
        userId,
        "elite-engineer"
      );
    }
  };

export const awardBadge = async (
    userId: string,
    slug: string,
    metadata?: any
  ) => {

    const badge =
      await prisma.badge.findUnique({
        where: {
          slug,
        },
      });

    if (!badge || !badge.active) {
      return;
    }

    const existing =
      await prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId: badge.id,
          },
        },
      });

    if (existing) {
      return;
    }

    await prisma.userBadge.create({
      data: {
        userId,

        badgeId:
          badge.id,

        metadata,
      },
    });

    //
    // Badge reputation bonus
    //
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        reputationScore: {
          increment:
            badge.reputationPoints,
        },
      },
    });

    //
    // Activity
    //
    createActivity(
      userId,

      "REPUTATION_MILESTONE",

      "Earned a badge",

      `Earned "${badge.name}" badge`,

      {
        badgeSlug:
          badge.slug,
      }
    ).catch(console.error);

    //
    // Notification
    //
    createNotification({
      userId,

      type: "SYSTEM",

      title:
        "New Badge Earned",

      message:
        `You earned the "${badge.name}" badge`,
    }).catch(console.error);
  };

  export const getLeaderboard =  async () => {
    return prisma.user.findMany({
      orderBy: {
        reputationScore:
          "desc",
      },

      include: {
        profile: true,

        badges: {
          include: {
            badge: true,
          },
        },
      },

      take: 50,
    });
  };

export const getUserReputation =  async (userId: string) => {

    return prisma.user.findUnique({
      where: {
        id: userId,
      },

      include: {
        profile: true,

        badges: {
          include: {
            badge: true,
          },
        },

        reputationEvents: {
          orderBy: {
            createdAt: "desc",
          },

          take: 50,
        },
      },
    });
  };

export const addTeamReputation =  async (
    teamId: string,
    points: number
  ) => {

    await prisma.team.update({
      where: {
        id: teamId,
      },

      data: {
        reputationScore: {
          increment: points,
        },
      },
    });
  };  

export const rewardTeamMembers =  async (
    teamId: string,
    type: string,
    points: number,
    description: string,
    metadata?: any
  ) => {

    const members =
      await prisma.teamMember.findMany({
        where: {
          teamId,
        },
      });

    await Promise.all(
      members.map((member) =>
        addReputation(
          member.userId,
          type,
          points,
          description,
          metadata
        )
      )
    );
  };  

export const evaluateAdvancedBadges = async (userId: string) => {

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        include: {
          badges: {
            include: {
              badge: true,
            },
          },

          _count: {
            select: {
              posts: true,

              projectMemberships: true,

              ownedProjects: true,

              teamMemberships: true,

              ownedTeams: true,

              createdHackathons: true,

              jobApplications: true,

              sentReferralRequests: true,

              receivedReferralRequests: true,
            },
          },
        },
      });

    if (!user) {
      return;
    }

    const existingBadges =
      new Set(
        user.badges.map(
          (b) => b.badge.slug
        )
      );

    //
    // PROJECT BADGES
    //

    if (
      user._count.ownedProjects >= 1 &&
      !existingBadges.has(
        "first-project"
      )
    ) {

      await awardBadge(
        userId,
        "first-project"
      );
    }

    if (
      user._count.ownedProjects >= 5 &&
      !existingBadges.has(
        "project-builder"
      )
    ) {

      await awardBadge(
        userId,
        "project-builder"
      );
    }

    //
    // TEAM BADGES
    //

    if (
      user._count.ownedTeams >= 1 &&
      !existingBadges.has(
        "team-leader"
      )
    ) {

      await awardBadge(
        userId,
        "team-leader"
      );
    }

    //
    // HACKATHON BADGES
    //

    if (
      user._count.createdHackathons >= 1 &&
      !existingBadges.has(
        "hackathon-organizer"
      )
    ) {

      await awardBadge(
        userId,
        "hackathon-organizer"
      );
    }

    //
    // JOB BADGES
    //

    if (
      user._count.jobApplications >= 10 &&
      !existingBadges.has(
        "job-hunter"
      )
    ) {

      await awardBadge(
        userId,
        "job-hunter"
      );
    }

    //
    // REFERRAL BADGES
    //

    if (
      user._count.receivedReferralRequests >= 5 &&
      !existingBadges.has(
        "trusted-referrer"
      )
    ) {

      await awardBadge(
        userId,
        "trusted-referrer"
      );
    }

    //
    // REPUTATION BADGES
    //

    if (
      user.reputationScore >= 100 &&
      !existingBadges.has(
        "rising-engineer"
      )
    ) {

      await awardBadge(
        userId,
        "rising-engineer"
      );
    }

    if (
      user.reputationScore >= 500 &&
      !existingBadges.has(
        "elite-engineer"
      )
    ) {

      await awardBadge(
        userId,
        "elite-engineer"
      );
    }

    if (
      user.reputationScore >= 1000 &&
      !existingBadges.has(
        "legendary-engineer"
      )
    ) {

      await awardBadge(
        userId,
        "legendary-engineer"
      );
    }
  };  

export const getUserReputationByUsername =  async (
    username: string
  ) => {

    const user =
      await prisma.user.findUnique({
        where: {
          username,
        },

        include: {

          profile: true,

          badges: {
            include: {
              badge: true,
            },
          },

          reputationEvents: {
            orderBy: {
              createdAt:
                "desc",
            },

            take: 50,
          },
        },
      });

    return user;
  };  

export const getMyReputationHistory =  async (
    userId: string
  ) => {

    return prisma.reputationEvent.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt:
          "desc",
      },

      take: 100,
    });
  };  

export const getAllBadges =  async () => {

    return prisma.badge.findMany({

      where: {
        active: true,
      },

      orderBy: {
        reputationPoints:
          "desc",
      },
    });
  };
  
  export const getTopBadges = async () => {

    const badges =
      await prisma.badge.findMany({

        where: {
          active: true,
        },

        include: {

          _count: {
            select: {
              users: true,
            },
          },
        },
      });

    return badges.sort(
      (a, b) =>
        b._count.users -
        a._count.users
    );
  };
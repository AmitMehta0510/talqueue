import prisma from "shared/database/prisma";

import { buildFeedContext } from "./feed-context.service";

const buildUserRecommendationScore = (candidate: any, context: any) => {
  let score = 0;

  // Engineering quality
  score += candidate.engineeringScore * 0.4;

  // Reputation
  score += candidate.reputationScore * 0.15;

  // Profile completeness
  score += candidate.profileCompleteness * 0.2;

  // Affinity
  score += context.affinityMap.get(candidate.id) || 0;

  // Verified engineer
  if (candidate.verifiedEngineer) {
    score += 50;
  }

  // Activity boost
  if (candidate.lastActiveAt) {
    const daysOld =
      (Date.now() - new Date(candidate.lastActiveAt).getTime()) /
      (1000 * 60 * 60 * 24);

    score += Math.max(0, 30 - daysOld);
  }

  // Skill overlap
  const candidateSkills = candidate.skills.map((s: any) =>
    s.skill.name.toLowerCase(),
  );

  const overlap = candidateSkills.filter((skill: string) =>
    context.skillNames.includes(skill),
  );

  score += overlap.length * 25;

  // Trust level
  switch (candidate.trustLevel) {
    case "ELITE":
      score += 120;
      break;

    case "ADVANCED":
      score += 80;
      break;

    case "VERIFIED":
      score += 40;
      break;
  }

  return Math.round(score);
};

const getRecommendedUsers = async (userId: string) => {
  const context = await buildFeedContext(userId);

  // Exclude existing follows/connections
  const [follows, connections, users] = await Promise.all([
    prisma.follow.findMany({
      where: {
        followerId: userId,
      },

      select: {
        followingId: true,
      },
    }),

    prisma.connection.findMany({
      where: {
        OR: [
          {
            senderId: userId,
          },

          {
            receiverId: userId,
          },
        ],

        status: "ACCEPTED",
      },
    }),

    prisma.user.findMany({
      where: {
        id: {
          not: userId,
        },

        status: "ACTIVE",

        searchVisibility: true,
      },

      include: {
        profile: true,

        skills: {
          include: {
            skill: true,
          },
        },

        postedJobs: {
          select: {
            id: true,
          },
        },

        projectMemberships: {
          select: {
            id: true,
          },
        },

        teamMemberships: {
          select: {
            id: true,
          },
        },
      },

      take: 300,
    }),
  ]);

  // Build exclusion set
  const excludedIds = new Set<string>();

  follows.forEach((f) => {
    excludedIds.add(f.followingId);
  });

  connections.forEach((c) => {
    excludedIds.add(c.senderId === userId ? c.receiverId : c.senderId);
  });

  // Remove already connected users
  const filtered = users.filter((u) => !excludedIds.has(u.id));

  // Rank
  const ranked = filtered.map((candidate) => ({
    ...candidate,

    recommendationScore: buildUserRecommendationScore(
      candidate,

      context,
    ),
  }));

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return ranked;
};

export const getSuggestedEngineers = async (userId: string) => {
  const users = await getRecommendedUsers(userId);

  return users.slice(0, 20);
};

export const getSuggestedMentors = async (userId: string) => {
  const users = await getRecommendedUsers(userId);

  return users

    .filter((u) => u.acceptingMentorship && u.engineeringScore >= 300)

    .slice(0, 20);
};

export const getSuggestedRecruiters = async (userId: string) => {
  const users = await getRecommendedUsers(userId);

  return users

    .filter((u) => u.postedJobs.length > 0)

    .slice(0, 20);
};

export const getSuggestedCollaborators = async (userId: string) => {
  const users = await getRecommendedUsers(userId);

  return users

    .filter((u) => u.acceptingCollaborators)

    .slice(0, 20);
};

export const getSuggestedTeammates = async (userId: string) => {
  const users = await getRecommendedUsers(userId);

  return users

    .filter(
      (u) => u.projectMemberships.length > 0 || u.teamMemberships.length > 0,
    )

    .slice(0, 20);
};
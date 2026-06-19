import prisma from "shared/database/prisma";
import { buildFeedContext } from "./feed-context.service";

interface UserCandidate {
  id: string;
  engineeringScore: number;
  reputationScore: number;
  profileCompleteness: number;
  verifiedEngineer: boolean;
  lastActiveAt: Date | null;
  trustLevel: string;
  acceptingMentorship: boolean;
  acceptingCollaborators: boolean;
  skills: { skill: { name: string } }[];
  postedJobs: { id: string }[];
  projectMemberships: { id: string }[];
  teamMemberships: { id: string }[];
}

const buildUserRecommendationScore = (candidate: UserCandidate, context: any): number => {
  let score = 0;

  // Engineering quality weight
  score += candidate.engineeringScore * 0.4;

  // Reputation score weight
  score += candidate.reputationScore * 0.15;

  // Profile completeness weight
  score += candidate.profileCompleteness * 0.2;

  // User affinity score boost
  score += context.affinityMap.get(candidate.id) || 0;

  // Verified engineer boost
  if (candidate.verifiedEngineer) {
    score += 50;
  }

  // Recency of user activity boost
  if (candidate.lastActiveAt) {
    const daysOld =
      (Date.now() - new Date(candidate.lastActiveAt).getTime()) /
      (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysOld);
  }

  // Overlapping skills boost
  const candidateSkills = candidate.skills.map((s) => s.skill.name.toLowerCase());
  const overlap = candidateSkills.filter((skill) => context.skillNames.includes(skill));
  score += overlap.length * 25;

  // Trust tier boost
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

const getRecommendedUsers = async (userId: string): Promise<(UserCandidate & { recommendationScore: number })[]> => {
  const context = await buildFeedContext(userId);

  // Concurrently fetch current followings, accepted connections, and potential candidates
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
        roles: {
          none: {
            role: {
              name: {
                in: ["SUPER_ADMIN", "PLATFORM_ADMIN"],
              },
            },
          },
        },
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

  // Map out excluded user IDs (self, followed, connected)
  const excludedIds = new Set<string>();
  follows.forEach((f) => excludedIds.add(f.followingId));
  connections.forEach((c) => {
    excludedIds.add(c.senderId === userId ? c.receiverId : c.senderId);
  });

  // Filter candidates and compute custom feed recommendation scores
  const ranked = users
    .filter((u) => !excludedIds.has(u.id))
    .map((candidate) => ({
      ...(candidate as unknown as UserCandidate),
      recommendationScore: buildUserRecommendationScore(candidate as unknown as UserCandidate, context),
    }));

  // Sort candidates in descending order of recommendation score
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
    .filter((u) => u.projectMemberships.length > 0 || u.teamMemberships.length > 0)
    .slice(0, 20);
};
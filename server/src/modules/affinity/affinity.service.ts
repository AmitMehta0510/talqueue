import prisma from "shared/database/prisma";

const REBUILD_CONCURRENCY = 25;

const runInBatches = async <T>(
  items: T[],

  batchSize: number,

  handler: (item: T) => Promise<unknown>,
) => {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);

    await Promise.all(batch.map(handler));
  }
};

export const calculateUserAffinity = async (
  userId: string,
  targetUserId: string,
) => {
  // Prevent self affinity
  if (userId === targetUserId) return null;

  let score = 0;
  let messageScore = 0;
  let collaborationScore = 0;
  let skillSimilarityScore = 0;
  let socialScore = 0;
  let recruiterScore = 0;

  // Parallelize independent DB calls
  const [
    follow,
    connection,
    sharedProjects,
    sharedHackathons,
    conversations,
    profileViewsCount,
    interactionsCount,
    userSkills,
    targetSkills,
  ] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    }),
    prisma.connection.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
        status: "ACCEPTED",
      },
    }),
    prisma.projectMember.count({
      where: {
        userId,
        project: { members: { some: { userId: targetUserId } } },
      },
    }),
    prisma.hackathonSubmission.count({
      where: {
        AND: [
          { team: { members: { some: { userId } } } },
          { team: { members: { some: { userId: targetUserId } } } },
        ],
      },
    }),
    prisma.conversation.findMany({
      where: {
        type: "DIRECT",
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      select: { id: true, messageCount: true },
    }),
    prisma.profileView.count({
      where: { viewerId: userId, viewedUserId: targetUserId },
    }),
    prisma.feedInteraction.count({
      where: { userId, targetId: targetUserId, targetType: "PROFILE" },
    }),
    prisma.userSkill.findMany({
      where: { userId },
      include: { skill: { select: { name: true } } },
    }),
    prisma.userSkill.findMany({
      where: { userId: targetUserId },
      include: { skill: { select: { name: true } } },
    }),
  ]);

  if (follow) {
    socialScore += 25;
    score += 25;
  }

  if (connection) {
    socialScore += 60;
    score += 60;
  }

  collaborationScore += sharedProjects * 40;
  score += sharedProjects * 40;

  collaborationScore += sharedHackathons * 30;
  score += sharedHackathons * 30;

  // messages: sum messageCount from conversations
  let totalMessages = 0;
  for (const conv of conversations) totalMessages += conv.messageCount || 0;

  messageScore += Math.min(totalMessages * 2, 150);
  score += Math.min(totalMessages * 2, 150);

  const targetSkillNames = new Set(
    targetSkills.map((s: any) => s.skill.name.toLowerCase()),
  );
  const userSkillNames = userSkills.map((s: any) => s.skill.name.toLowerCase());
  const overlap = userSkillNames.filter((n) => targetSkillNames.has(n));

  skillSimilarityScore += overlap.length * 12;
  score += overlap.length * 12;

  recruiterScore += profileViewsCount * 3;
  score += profileViewsCount * 3;

  score += interactionsCount * 5;

  // Clamp
  score = Math.min(score, 1000);

  const lastInteractionAt = new Date();

  // Persist
  return prisma.userAffinity.upsert({
    where: { userId_targetUserId: { userId, targetUserId } },
    update: {
      score,
      interactionCount: totalMessages + interactionsCount,
      messageScore,
      collaborationScore,
      skillSimilarityScore,
      socialScore,
      recruiterScore,
      lastInteractionAt,
    },
    create: {
      userId,
      targetUserId,
      score,
      interactionCount: totalMessages + interactionsCount,
      messageScore,
      collaborationScore,
      skillSimilarityScore,
      socialScore,
      recruiterScore,
      lastInteractionAt,
    },
  });
};

export const rebuildUserAffinities = async (userId: string) => {
  //
  // Relevant users
  //
  const users = await prisma.user.findMany({
    where: {
      id: {
        not: userId,
      },
    },

    select: {
      id: true,
    },

    take: 500,
  });

  //
  // Rebuild
  //
  await runInBatches(
    users,

    REBUILD_CONCURRENCY,

    (user) => calculateUserAffinity(userId, user.id),
  );

  return {
    success: true,
  };
};

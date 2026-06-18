import prisma from "shared/database/prisma";

const REBUILD_CONCURRENCY = 25;

const POST_INTERACTION_SCORE_CAP = 150;

const REFERRAL_STATUS_SCORE: Record<string, number> = {
  PENDING: 15,
  ACCEPTED: 35,
  REFERRED: 90,
  REJECTED: 5,
};

const JOB_APPLICATION_STATUS_SCORE: Record<string, number> = {
  APPLIED: 20,
  VIEWED: 25,
  SHORTLISTED: 50,
  INTERVIEW: 65,
  HIRED: 100,
  REJECTED: 5,
};

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

  // Perform optimized queries to prevent connection pool exhaustion
  const [user, targetUser, sharedHackathons] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: { skill: { select: { name: true } } },
        },
        following: {
          where: { followingId: targetUserId },
        },
        sentConnections: {
          where: { receiverId: targetUserId, status: "ACCEPTED" },
        },
        receivedConnections: {
          where: { senderId: targetUserId, status: "ACCEPTED" },
        },
        projectMemberships: {
          where: {
            project: {
              members: { some: { userId: targetUserId } },
            },
          },
        },
        teamMemberships: {
          where: {
            team: {
              members: { some: { userId: targetUserId } },
            },
          },
        },
        conversationParticipants: {
          where: {
            conversation: {
              type: "DIRECT",
              participants: { some: { userId: targetUserId } },
            },
          },
          include: {
            conversation: {
              select: { id: true, messageCount: true },
            },
          },
        },
        profileViewsGiven: {
          where: { viewedUserId: targetUserId },
        },
        feedInteractions: {
          where: { targetId: targetUserId, targetType: "PROFILE" },
        },
        likes: {
          where: { post: { authorId: targetUserId } },
        },
        comments: {
          where: {
            deletedAt: null,
            post: { authorId: targetUserId },
          },
        },
        postShares: {
          where: { post: { authorId: targetUserId } },
        },
        savedPosts: {
          where: { post: { authorId: targetUserId } },
        },
        sentReferralRequests: {
          where: { receiverId: targetUserId },
          select: { status: true },
        },
        jobApplications: {
          where: {
            job: { postedById: targetUserId },
          },
          select: { status: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        skills: {
          include: { skill: { select: { name: true } } },
        },
        jobApplications: {
          where: {
            job: { postedById: userId },
          },
          select: { status: true },
        },
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
  ]);

  if (!user || !targetUser) return null;

  // Map optimized relational counts and collections to variables
  const follow = user.following.length > 0 ? user.following[0] : null;
  const connection = (user.sentConnections.length > 0 || user.receivedConnections.length > 0) ? true : null;
  const sharedProjects = user.projectMemberships.length;
  const sharedTeams = user.teamMemberships.length;
  const conversations = user.conversationParticipants.map((cp) => cp.conversation).filter(Boolean);
  const profileViewsCount = user.profileViewsGiven.length;
  const interactionsCount = user.feedInteractions.length;
  const postLikesCount = user.likes.length;
  const postCommentsCount = user.comments.length;
  const postSharesCount = user.postShares.length;
  const postSavesCount = user.savedPosts.length;
  const referralRequests = user.sentReferralRequests;
  const jobApplications = [...user.jobApplications, ...targetUser.jobApplications];
  const userSkills = user.skills;
  const targetSkills = targetUser.skills;

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

  collaborationScore += sharedTeams * 35;
  score += sharedTeams * 35;

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

  const profileInteractionScore = interactionsCount * 5;
  socialScore += profileInteractionScore;
  score += profileInteractionScore;

  const postInteractionScore = Math.min(
    postLikesCount * 4 +
      postCommentsCount * 8 +
      postSharesCount * 10 +
      postSavesCount * 6,
    POST_INTERACTION_SCORE_CAP,
  );

  socialScore += postInteractionScore;
  score += postInteractionScore;

  let referralScore = 0;
  for (const request of referralRequests) {
    referralScore += REFERRAL_STATUS_SCORE[request.status] || 0;
  }

  recruiterScore += referralScore;
  score += referralScore;

  let jobApplicationScore = 0;
  for (const application of jobApplications) {
    jobApplicationScore += JOB_APPLICATION_STATUS_SCORE[application.status] || 0;
  }

  recruiterScore += jobApplicationScore;
  score += jobApplicationScore;

  // Clamp
  score = Math.min(score, 1000);

  const lastInteractionAt = new Date();

  // Persist
  return prisma.userAffinity.upsert({
    where: { userId_targetUserId: { userId, targetUserId } },
    update: {
      score,
      interactionCount:
        totalMessages +
        interactionsCount +
        postLikesCount +
        postCommentsCount +
        postSharesCount +
        postSavesCount +
        referralRequests.length +
        jobApplications.length,
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
      interactionCount:
        totalMessages +
        interactionsCount +
        postLikesCount +
        postCommentsCount +
        postSharesCount +
        postSavesCount +
        referralRequests.length +
        jobApplications.length,
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

import prisma
from "shared/database/prisma";

export const calculateUserAffinity =  async (
    userId: string,

    targetUserId: string
  ) => {

    //
    // Prevent self affinity
    //
    if (
      userId ===
      targetUserId
    ) {
      return null;
    }

    let score = 0;

    let messageScore = 0;

    let collaborationScore = 0;

    let skillSimilarityScore = 0;

    let socialScore = 0;

    let recruiterScore = 0;

    //
    // FOLLOW RELATIONSHIP
    //
    const follow =  await prisma.follow.findUnique({

        where: {
          followerId_followingId: {
            followerId:
              userId,

            followingId:
              targetUserId,
          },
        },
      });

    if (follow) {

      socialScore += 25;

      score += 25;
    }

    //
    // CONNECTION
    //
    const connection =  await prisma.connection.findFirst({

        where: {

          OR: [

            {
              senderId:
                userId,

              receiverId:
                targetUserId,
            },

            {
              senderId:
                targetUserId,

              receiverId:
                userId,
            },
          ],

          status:
            "ACCEPTED",
        },
      });

    if (connection) {

      socialScore += 60;

      score += 60;
    }

    //
    // SHARED PROJECTS
    //
    const sharedProjects =  await prisma.projectMember.count({

        where: {

          userId,

          project: {

            members: {

              some: {
                userId:
                  targetUserId,
              },
            },
          },
        },
      });

    collaborationScore +=
      sharedProjects * 40;

    score +=
      sharedProjects * 40;

    //
    // SHARED HACKATHONS
    //
const sharedHackathons =  await prisma.hackathonSubmission.count({

    where: {

      AND: [

        {
          team: {

            members: {

              some: {
                userId,
              },
            },
          },
        },

        {
          team: {

            members: {

              some: {
                userId:
                  targetUserId,
              },
            },
          },
        },
      ],
    },
  });

    collaborationScore +=
      sharedHackathons * 30;

    score +=
      sharedHackathons * 30;

    //
    // MESSAGE INTERACTIONS
    //
    const conversations =  await prisma.conversation.findMany({

        where: {

          type: "DIRECT",

          participants: {

            every: {

              userId: {

                in: [
                  userId,
                  targetUserId,
                ],
              },
            },
          },
        },

        include: {
          messages: true,
        },
      });

    let totalMessages = 0;

    for (
      const conversation of conversations
    ) {

      totalMessages +=
        conversation.messages.length;
    }

    messageScore +=
      Math.min(
        totalMessages * 2,
        150
      );

    score +=
      Math.min(
        totalMessages * 2,
        150
      );

    //
    // SKILL SIMILARITY
    //
    const userSkills =  await prisma.userSkill.findMany({

        where: {
          userId,
        },

        include: {
          skill: true,
        },
      });

    const targetSkills =  await prisma.userSkill.findMany({

        where: {
          userId:
            targetUserId,
        },

        include: {
          skill: true,
        },
      });

    const userSkillNames =  userSkills.map(
        (s) =>
          s.skill.name.toLowerCase()
      );

    const targetSkillNames =  targetSkills.map(
        (s) =>
          s.skill.name.toLowerCase()
      );

    const overlap =  userSkillNames.filter(
        (skill) =>
          targetSkillNames.includes(
            skill
          )
      );

    skillSimilarityScore +=
      overlap.length * 12;

    score +=
      overlap.length * 12;

    //
    // PROFILE VIEWS
    //
    const profileViews =  await prisma.profileView.count({

        where: {

          viewerId:
            userId,

          viewedUserId:
            targetUserId,
        },
      });

    recruiterScore +=
      profileViews * 3;

    score +=
      profileViews * 3;

    //
    // FEED INTERACTIONS
    //
    const interactions =  await prisma.feedInteraction.count({

        where: {

          userId,

          targetId:
            targetUserId,

          targetType:
            "PROFILE",
        },
      });

    score +=
      interactions * 5;

    //
    // Clamp
    //
    score = Math.min(
      score,
      1000
    );

    //
    // Persist
    //
    return prisma.userAffinity.upsert({

      where: {

        userId_targetUserId: {

          userId,

          targetUserId,
        },
      },

      update: {

        score,

        interactionCount:
          totalMessages +
          interactions,

        messageScore,

        collaborationScore,

        skillSimilarityScore,

        socialScore,

        recruiterScore,

        lastInteractionAt:
          new Date(),
      },

      create: {

        userId,

        targetUserId,

        score,

        interactionCount:
          totalMessages +
          interactions,

        messageScore,

        collaborationScore,

        skillSimilarityScore,

        socialScore,

        recruiterScore,

        lastInteractionAt:
          new Date(),
      },
    });
  };


  export const rebuildUserAffinities =  async (
    userId: string
  ) => {

    //
    // Relevant users
    //
    const users =
      await prisma.user.findMany({

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
    await Promise.all(
      users.map(
        (user) =>
          calculateUserAffinity(
            userId,
            user.id
          )
      )
    );

    return {
      success: true,
    };
  };
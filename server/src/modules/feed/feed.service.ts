import prisma from "shared/database/prisma";
import  AppError  from "shared/errors/AppError";
import { calculateFeedScore } from "./feed-ranking.service";
import { applyAiFeedRanking } from "./feed-ai-ranking.service";


export const getPersonalizedFeedV2 =  async (  userId: string  ) => {

    //
    // User
    //
    const user =  await prisma.user.findUnique({
        where: {
          id: userId,
        },

        include: {
          experiences: true,
        },
      });

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    //
    // Following
    //
    const follows =  await prisma.follow.findMany({

        where: {
          followerId:
            userId,
        },

        select: {
          followingId:
            true,
        },
      });

    const followingIds =  follows.map(
        (f) =>
          f.followingId
      );

    //
    // Skills
    //
    const userSkills =  await prisma.userSkill.findMany({

        where: {
          userId,
        },

        include: {
          skill: true,
        },
      });

    const skillNames =
      userSkills.map(
        (s) =>
          s.skill.name.toLowerCase()
      );

      //
// USER INTERACTIONS
//
const interactions =  await prisma.feedInteraction.findMany({

    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 300,
  });

const interactionMap =  new Map<string, number>();

for (
  const interaction of interactions
) {

  const key =
    `${interaction.targetType}:${interaction.targetId}`;

  const current =
    interactionMap.get(key) || 0;

  interactionMap.set(
    key,
    current + 1
  );
}

  
    //
// USER AFFINITIES
//
const affinities =  await prisma.userAffinity.findMany({

    where: {
      userId,
    },

    orderBy: {
      score: "desc",
    },

    take: 100,
  });

const affinityMap =
  new Map<string, number>();

for (
  const affinity of affinities
) {

  affinityMap.set(
    affinity.targetUserId,
    affinity.score
  );
}

    //
    // Fresher detection
    //
    const isFresher =  user.experiences.length === 0 && user.engineeringScore < 150;

const context = {
  followingIds,
  skillNames,
  isFresher,
  interactionMap,
  affinityMap,
};

    //
    // POSTS
    //
    const posts =
      await prisma.post.findMany({

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

        take: 50,
      });

    //
    // PROJECTS
    //
    const projects =
      await prisma.project.findMany({

        where: {
          visibility:
            "PUBLIC",

          deletedAt: null,
        },

        include: {

          owner: {
            include: {
              profile: true,
            },
          },

          members: true,
        },

        take: 30,
      });

    //
    // HACKATHONS
    //
    const hackathons =
      await prisma.hackathon.findMany({

        where: {
          registrationDeadline: {
            gte:
              new Date(),
          },

          deletedAt: null,
        },

        include: {
          createdBy: true,
        },

        take: 20,
      });

    //
    // JOBS
    //
    const jobs =
      await prisma.job.findMany({

        where: {
          status: "OPEN",

          deletedAt: null,
        },

        include: {
          company: true,
        },

        take: 30,
      });

    //
    // COMPANIES
    //
    const companies =
      await prisma.company.findMany({

        where: {
          hiringEnabled:
            true,
        },

        take: 10,
      });

    //
    // BUILD FEED
    //
    const feed = [

      ...posts.map(
        (post) => ({

          type: "POST" as const,

          score:
            calculateFeedScore(
              post,
              "POST",
              context
            ),

          data: post,
        })
      ),

      ...projects.map(
        (project) => ({

          type: "PROJECT" as const,

          score:
            calculateFeedScore(
              project,
              "PROJECT",
              context
            ),

          data: project,
        })
      ),

      ...hackathons.map(
        (
          hackathon
        ) => ({

          type: "HACKATHON" as const,

          score:
            calculateFeedScore(
              hackathon,
              "HACKATHON",
              context
            ),

          data:
            hackathon,
        })
      ),

      ...jobs.map(
        (job) => ({

          type: "JOB" as const,

          score:
            calculateFeedScore(
              job,
              "JOB",
              context
            ),

          data: job,
        })
      ),

      ...companies.map(
        (
          company
        ) => ({

          type: "COMPANY" as const,

          score:
            calculateFeedScore(
              company,
              "COMPANY",
              context
            ),

          data:
            company,
        })
      ),
    ];

    //
    // FINAL SORT
    //
    const rankedFeed = await applyAiFeedRanking(
    userId,
    feed
  );

return rankedFeed.slice(
  0,
  60
);
  };
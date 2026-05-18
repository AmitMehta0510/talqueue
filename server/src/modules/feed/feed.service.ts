import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { calculateFeedScore } from "./feed-ranking.service";
import { applyAiFeedRanking } from "./feed-ai-ranking.service";
import { buildFeedContext } from "modules/discovery/feed-context.service";

export const getPersonalizedFeedV2 = async (userId: string) => {
  const context = await buildFeedContext(userId);

  // POSTS
  const posts = await prisma.post.findMany({
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

  // PROJECTS
  const projects = await prisma.project.findMany({
    where: {
      visibility: "PUBLIC",

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

  // HACKATHONS

  const hackathons = await prisma.hackathon.findMany({
    where: {
      registrationDeadline: {
        gte: new Date(),
      },

      deletedAt: null,
    },

    include: {
      createdBy: true,
    },

    take: 20,
  });

  // JOB
  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN",

      deletedAt: null,
    },

    include: {
      company: true,
    },

    take: 30,
  });

  // COMPANIES
  const companies = await prisma.company.findMany({
    where: {
      hiringEnabled: true,
    },

    take: 10,
  });

  // BUILD FEED
  const feed = [
    ...posts.map((post) => ({
      type: "POST" as const,

      score: calculateFeedScore(post, "POST", context),

      data: post,
    })),

    ...projects.map((project) => ({
      type: "PROJECT" as const,

      score: calculateFeedScore(project, "PROJECT", context),

      data: project,
    })),

    ...hackathons.map((hackathon) => ({
      type: "HACKATHON" as const,

      score: calculateFeedScore(hackathon, "HACKATHON", context),

      data: hackathon,
    })),

    ...jobs.map((job) => ({
      type: "JOB" as const,

      score: calculateFeedScore(job, "JOB", context),

      data: job,
    })),

    ...companies.map((company) => ({
      type: "COMPANY" as const,

      score: calculateFeedScore(company, "COMPANY", context),

      data: company,
    })),
  ];

  // FINAL SORT
  const rankedFeed = await applyAiFeedRanking(feed, context);

  return rankedFeed.slice(0, 60);
};

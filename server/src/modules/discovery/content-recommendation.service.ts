import prisma from "shared/database/prisma";

import { buildFeedContext } from "./feed-context.service";

import { calculateFeedScore } from "modules/feed/feed-ranking.service";

import { getRecommendationMemoryMap } from "./recommendation-memory.service";

// COMMON MEMORY BOOST
const applyMemoryScore = (memory: any, score: number) => {
  if (!memory) {
    return score;
  }

  score += memory.clicked * 12;

  score -= memory.ignored * 8;

  return score;
};

// PROJECTS
export const getSuggestedProjects = async (userId: string) => {
  const context = await buildFeedContext(userId);

  const memoryMap = await getRecommendationMemoryMap(userId);

  const projects = await prisma.project.findMany(
    {
    where: {
      visibility: "PUBLIC",

      deletedAt: null,

      OR: [
        {
          featured: true,
        },

        {
          verified: true,
        },

        {
          techStack: {
            array_contains: context.skillNames,
          },
        },

        {
          searchTags: {
            hasSome: context.skillNames,
          },
        },
      ],
    },

    include: {
      owner: {
        include: {
          profile: true,
        },
      },

      members: true,
    },
    take: 100,
  });

  const ranked = projects.map((project) => {
    let score = calculateFeedScore(project, "PROJECT", context);

    const memory = memoryMap.get(`PROJECT:${project.id}`);

    score = applyMemoryScore(memory, score);

    return {
      ...project,

      recommendationScore: Math.round(score),
    };
  });

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return ranked.slice(0, 20);
};

// JOBS
export const getSuggestedJobs = async (userId: string) => {
  const context = await buildFeedContext(userId);

  const memoryMap = await getRecommendationMemoryMap(userId);

  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN",

      deletedAt: null,

      OR: [
        {
          featured: true,
        },

        {
          skillsRequired: {
            hasSome: context.skillNames,
          },
        },

        {
          company: {
            verified: true,
          },
        },
      ],
    },

    include: {
      company: true,
    },

    take: 100,
  });

  const ranked = jobs.map((job) => {
    let score = calculateFeedScore(job, "JOB", context);

    const memory = memoryMap.get(`JOB:${job.id}`);

    score = applyMemoryScore(memory, score);

    return {
      ...job,

      recommendationScore: Math.round(score),
    };
  });

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return ranked.slice(0, 20);
};

// HACKATHONS
export const getSuggestedHackathons = async (userId: string) => {
  const context = await buildFeedContext(userId);

  const memoryMap = await getRecommendationMemoryMap(userId);

  const hackathons = await prisma.hackathon.findMany({
    where: {
      deletedAt: null,

      registrationDeadline: {
        gte: new Date(),
      },

      OR: [
        {
          featured: true,
        },

        {
          verified: true,
        },

        {
          tags: {
            hasSome: context.skillNames,
          },
        },
      ],
    },

    include: {
      createdBy: true,
    },

    take: 100,
  });

  const ranked = hackathons.map((hackathon) => {
    let score = calculateFeedScore(hackathon, "HACKATHON", context);

    const memory = memoryMap.get(`HACKATHON:${hackathon.id}`);

    score = applyMemoryScore(memory, score);

    return {
      ...hackathon,

      recommendationScore: Math.round(score),
    };
  });

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return ranked.slice(0, 20);
};

// COMPANIES
export const getSuggestedCompanies = async (userId: string) => {
  const context = await buildFeedContext(userId);

  const memoryMap = await getRecommendationMemoryMap(userId);

  const companies = await prisma.company.findMany({
    where: {
      hiringEnabled: true,

      OR: [
        {
          verified: true,
        },

        {
          referralEnabled: true,
        },
      ],
    },

    take: 100,
  });

  const ranked = companies.map((company) => {
    let score = calculateFeedScore(company, "COMPANY", context);

    const memory = memoryMap.get(`COMPANY:${company.id}`);

    score = applyMemoryScore(memory, score);

    // Hiring boost
    if (company.hiringEnabled) {
      score += 50;
    }

    // Verified boost
    if (company.verified) {
      score += 60;
    }

    return {
      ...company,

      recommendationScore: Math.round(score),
    };
  });

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return ranked.slice(0, 20);
};

// POSTS
export const getSuggestedPosts = async (userId: string) => {
  const context = await buildFeedContext(userId);

  const memoryMap = await getRecommendationMemoryMap(userId);

  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,

      discoverable: true,

      visibility: "PUBLIC",
    },

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

    take: 120,
  });

  const ranked = posts.map((post) => {
    let score = calculateFeedScore(post, "POST", context);

    const memory = memoryMap.get(`POST:${post.id}`);

    score = applyMemoryScore(memory, score);

    // Trending boost
    score += post.trendingScore || 0;

    return {
      ...post,

      recommendationScore: Math.round(score),
    };
  });

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return ranked.slice(0, 30);
};

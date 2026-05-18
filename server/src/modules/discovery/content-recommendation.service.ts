import AppError from "../../shared/errors/AppError";
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

  const projects = await prisma.project.findMany({
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

// COMMUNITIES
export const getSuggestedCommunities = async (userId: string) => {
  const context = await buildFeedContext(userId);

  const memoryMap = await getRecommendationMemoryMap(userId);

  // USER
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      educations: true,

      experiences: {
        include: {
          company: true,
        },
      },

      communityMemberships: {
        select: {
          communityId: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // EXCLUDE ALREADY JOINED
  const joinedCommunityIds = user.communityMemberships.map(
    (m) => m.communityId,
  );

  // COLLEGE IDS
  const collegeIds = user.educations.map((e) => e.collegeId);

  // COMPANY IDS
  const companyIds = user.experiences.map((e) => e.companyId);

  // COMMUNITIES
  const communities = await prisma.community.findMany({
    where: {
      archived: false,

      id: {
        notIn: joinedCommunityIds,
      },

      OR: [
        // Same college
        {
          collegeId: {
            in: collegeIds,
          },
        },

        // Same companies
        {
          companyId: {
            in: companyIds,
          },
        },

        // Skills overlap
        {
          tags: {
            hasSome: context.skillNames,
          },
        },

        // Search keywords overlap
        {
          searchKeywords: {
            hasSome: context.skillNames,
          },
        },

        // Trending communities
        {
          trendingScore: {
            gte: 20,
          },
        },
      ],
    },

    include: {
      createdBy: {
        include: {
          profile: true,
        },
      },

      _count: {
        select: {
          members: true,

          posts: true,

          conversations: true,
        },
      },
    },

    take: 100,
  });

  // RANKING
  const ranked = communities.map((community) => {
    let score = 0;

    // MEMBER COUNT
    score += community.memberCount * 0.4;

    // TRENDING
    score += community.trendingScore || 0;

    // ACTIVITY
    score += community.activityScore || 0;

    // VERIFIED
    if (community.verified) {
      score += 80;
    }

    // COLLEGE MATCH
    if (community.collegeId && collegeIds.includes(community.collegeId)) {
      score += 120;
    }

    // COMPANY MATCH
    if (community.companyId && companyIds.includes(community.companyId)) {
      score += 100;
    }

    // SKILL OVERLAP
    const overlap = (community.tags || []).filter((tag) =>
      context.skillNames.includes(tag.toLowerCase()),
    );

    score += overlap.length * 25;

    // MEMORY
    const memory = memoryMap.get(`COMMUNITY:${community.id}`);

    score = applyMemoryScore(memory, score);

    return {
      ...community,

      recommendationScore: Math.round(score),
    };
  });

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return ranked.slice(0, 20);
};

//////////COMMUNITY RECOMMENDATIONS  /////////
// GET COMMUNITY
export const getCommunityBySlug = async (
  slug: string,

  page = 1,

  limit = 10,
) => {
  const skip = (page - 1) * limit;

  const community = await prisma.community.findUnique({
    where: {
      slug,
    },

    include: {
      college: true,

      company: true,

      department: true,

      //
      // RECENT POSTS
      //
      posts: {
        where: {
          deletedAt: null,
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

        orderBy: {
          createdAt: "desc",
        },

        skip,

        take: limit,
      },

      //
      // CONVERSATIONS
      //
      conversations: {
        orderBy: {
          updatedAt: "desc",
        },

        take: 10,
      },

      //
      // ONLINE MEMBERS
      //
      members: {
        where: {
          active: true,

          user: {
            presence: {
              online: true,
            },
          },
        },

        include: {
          user: {
            include: {
              presence: true,
            },
          },
        },

        take: 20,
      },
    },
  });

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  return community;
};

// TRENDING COMMUNITIES
export const getTrendingCommunities = async () => {
  return prisma.community.findMany({
    where: {
      archived: false,
    },

    orderBy: [
      {
        activityScore: "desc",
      },

      {
        trendingScore: "desc",
      },

      {
        memberCount: "desc",
      },
    ],

    take: 20,
  });
};

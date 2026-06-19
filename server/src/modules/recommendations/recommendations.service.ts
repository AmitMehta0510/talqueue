import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { calculateJobRecommendationScoreSync } from "./recommendation-engine.service";

export const toggleSaveJob = async (
  userId: string,
  jobId: string
) => {
  const job = await prisma.job.findUnique({
    where: {
      id: jobId,
    },
  });

  if (!job) {
    throw new AppError(
      "Job not found",
      404
    );
  }

  const existingSave = await prisma.savedJob.findUnique({
    where: {
      userId_jobId: {
        userId,
        jobId,
      },
    },
  });

  // Unsave
  if (existingSave) {
    await prisma.savedJob.delete({
      where: {
        id: existingSave.id,
      },
    });

    return {
      saved: false,
    };
  }

  // Save
  await prisma.savedJob.create({
    data: {
      userId,
      jobId,
    },
  });

  return {
    saved: true,
  };
};

export const getSavedJobs = async (userId: string, page = 1, limit = 20) => {
  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;

  return prisma.savedJob.findMany({
    where: {
      userId,
    },
    include: {
      job: {
        include: {
          company: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: safeLimit,
  });
};

export const getRecommendedJobs = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  //
  // User profile and jobs pre-fetched in a single concurrent block Promise.all
  //
  const [user, jobs] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        experiences: true,
        projectMemberships: {
          include: {
            project: true,
          },
        },
      },
    }),
    prisma.job.findMany({
      where: {
        status: "OPEN",
      },
      include: {
        company: true,
      },
      take: 200,
    }),
  ]);

  if (!user) {
    return [];
  }

  //
  // Rank jobs synchronously without loop database delays
  //
  const ranked = jobs.map((job) => {
    const recommendationScore = calculateJobRecommendationScoreSync(user, job);
    return {
      ...job,
      recommendationScore,
    };
  });

  //
  // Sort
  //
  ranked.sort(
    (a, b) => b.recommendationScore - a.recommendationScore
  );

  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;
  return ranked.slice(skip, skip + safeLimit);
};

export const getTrendingJobs = async (page = 1, limit = 15) => {
  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN",
    },
    include: {
      company: true,
      _count: {
        select: {
          applications: true,
          savedBy: true,
        },
      },
    },
    take: 100,
  });

  const ranked = jobs.map((job) => {
    let score = 0;

    //
    // Applications
    //
    score += job._count.applications * 5;

    //
    // Saves
    //
    score += job._count.savedBy * 8;

    //
    // Views
    //
    score += job.views * 0.2;

    //
    // Featured
    //
    if (job.featured) {
      score += 50;
    }

    //
    // Freshness
    //
    const diffDays = Math.floor(
      (Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 7) {
      score += 40;
    } else if (diffDays <= 30) {
      score += 20;
    }

    return {
      ...job,
      trendingScore: Math.round(score),
    };
  });

  ranked.sort(
    (a, b) => b.trendingScore - a.trendingScore
  );

  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;
  return ranked.slice(skip, skip + safeLimit);
};

export const getInternshipRecommendations = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  //
  // User profile details and internship jobs pre-fetched in a single concurrent block Promise.all
  //
  const [user, jobs] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        projectMemberships: {
          include: {
            project: true,
          },
        },
      },
    }),
    prisma.job.findMany({
      where: {
        type: "INTERNSHIP",
        status: "OPEN",
      },
      include: {
        company: true,
      },
      take: 100,
    }),
  ]);

  if (!user) {
    return [];
  }

  const userSkills = user.skills.map((s) => s.skill.name.toLowerCase());
  const userSkillsSet = new Set(userSkills);

  //
  // Ranking
  //
  const ranked = jobs.map((job) => {
    let score = 0;

    //
    // Skill overlap (optimized using userSkillsSet)
    //
    const matchedSkills = (job.skillsRequired || []).filter(
      (skill: string) => userSkillsSet.has(skill.toLowerCase())
    );

    score += matchedSkills.length * 20;

    //
    // Engineering score
    //
    score += user.engineeringScore * 0.05;

    //
    // Verified projects
    //
    const verifiedProjects = user.projectMemberships.filter(
      (membership) => membership.project.verified
    ).length;

    score += verifiedProjects * 25;

    //
    // Hackathon potential
    //
    if (user.trustLevel === "EMERGING") {
      score += 20;
    }

    return {
      ...job,
      recommendationScore: Math.round(score),
    };
  });

  ranked.sort(
    (a, b) => b.recommendationScore - a.recommendationScore
  );

  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;
  return ranked.slice(skip, skip + safeLimit);
};
import prisma from "shared/database/prisma";

export const calculateJobRecommendationScoreSync = (
  user: any,
  job: any
): number => {
  if (!user) {
    return 0;
  }

  let score = 0;

  //
  // Skills
  //
  const userSkills = (user.skills || []).map(
    (s: any) => s.skill?.name?.toLowerCase() || ""
  ).filter(Boolean);

  const requiredSkills = (job.skillsRequired || []).map(
    (skill: string) => skill.toLowerCase()
  );

  const userSkillsSet = new Set(userSkills);
  const matchedSkills = requiredSkills.filter(
    (skill: string) => userSkillsSet.has(skill)
  );

  score += matchedSkills.length * 15;

  //
  // Engineering score
  //
  score += Math.min(
    (user.engineeringScore || 0) * 0.05,
    100
  );

  //
  // Trust level
  //
  const trustWeights: Record<string, number> = {
    BEGINNER: 5,
    EMERGING: 15,
    VERIFIED: 35,
    ADVANCED: 60,
    ELITE: 100,
  };

  score += trustWeights[user.trustLevel] || 0;

  //
  // Verified projects
  //
  const verifiedProjects = (user.projectMemberships || []).filter(
    (membership: any) => membership.project?.verified
  ).length;

  score += verifiedProjects * 20;

  //
  // Live projects
  //
  const liveProjects = (user.projectMemberships || []).filter(
    (membership: any) => membership.project?.liveUrl
  ).length;

  score += liveProjects * 10;

  //
  // GitHub strength
  //
  const totalStars = (user.projectMemberships || []).reduce(
    (acc: number, membership: any) => acc + (membership.project?.starsCount || 0),
    0
  );

  score += Math.min(totalStars * 0.5, 50);

  //
  // Experience relevance
  //
  const yearsExperience = (user.experiences || []).reduce(
    (acc: number, exp: any) => {
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const start = new Date(exp.startDate);
      const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return acc + months;
    },
    0
  ) / 12;

  score += Math.min(yearsExperience * 10, 50);

  //
  // Clamp
  //
  return Math.min(Math.round(score), 1000);
};

export const recommendJobsForUserAdvanced = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  //
  // Open jobs and user prefetch in parallel
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
  // Rank jobs
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

const SKILL_CATEGORIES: Record<string, string[]> = {
  frontend: [
    "react", "vue", "angular", "html", "css", "javascript", "typescript",
    "next.js", "nextjs", "frontend", "tailwind", "sass", "webpack", "vite", "svelte"
  ],
  backend: [
    "node.js", "nodejs", "node", "express", "nest.js", "nestjs", "python", "django",
    "flask", "go", "golang", "java", "spring", "ruby", "rails", "php", "laravel",
    "c#", ".net", "backend", "apis", "graphql", "rest", "fastapi"
  ],
  database: [
    "sql", "postgresql", "postgres", "mysql", "mongodb", "redis", "prisma", "mongoose",
    "cassandra", "dynamodb", "mariadb", "database", "elasticsearch", "neo4j"
  ],
  devops: [
    "aws", "docker", "kubernetes", "ci/cd", "gcp", "azure", "devops", "terraform",
    "nginx", "linux", "github actions", "jenkins", "ansible", "cloud"
  ],
  mobile: [
    "react native", "reactnative", "flutter", "swift", "kotlin", "android", "ios",
    "mobile", "objective-c"
  ],
  design: [
    "figma", "ui/ux", "ui", "ux", "photoshop", "illustrator", "design", "wireframing"
  ]
};

// Cached Sets for O(1) SKILL_CATEGORIES keyword lookups
const SKILL_CATEGORIES_SETS: Record<string, Set<string>> = {};
for (const [category, keywords] of Object.entries(SKILL_CATEGORIES)) {
  SKILL_CATEGORIES_SETS[category] = new Set(keywords);
}

export const calculateCosineSimilarity = (tagsA: string[], tagsB: string[]): number => {
  const cleanA = tagsA.map(t => t.toLowerCase().trim()).filter(Boolean);
  const cleanB = tagsB.map(t => t.toLowerCase().trim()).filter(Boolean);

  if (cleanA.length === 0 || cleanB.length === 0) return 0;

  const allTags = Array.from(new Set([...cleanA, ...cleanB]));

  const setA = new Set(cleanA);
  const setB = new Set(cleanB);

  const vectorA = allTags.map(tag => setA.has(tag) ? 1 : 0);
  const vectorB = allTags.map(tag => setB.has(tag) ? 1 : 0);

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < allTags.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
};

export const getSkillCategories = (skills: string[]): Set<string> => {
  const categories = new Set<string>();
  const cleanSkills = skills.map(s => s.toLowerCase().trim());

  for (const skill of cleanSkills) {
    for (const [category, keywordSet] of Object.entries(SKILL_CATEGORIES_SETS)) {
      if (keywordSet.has(skill) || skill.includes(category)) {
        categories.add(category);
      }
    }
  }

  return categories;
};

export const calculateComplementarity = (skillsA: string[], skillsB: string[]): number => {
  const catA = getSkillCategories(skillsA);
  const catB = getSkillCategories(skillsB);

  if (catA.size === 0 || catB.size === 0) return 0;

  const diff = new Set([...catB].filter(x => !catA.has(x)));
  const totalCategories = Object.keys(SKILL_CATEGORIES).length;

  return diff.size / totalCategories;
};

export const matchLookingForSkills = (userSkills: string[], lookingForText?: string): number => {
  if (!lookingForText) return 0;
  const cleanText = lookingForText.toLowerCase();
  let matches = 0;
  for (const skill of userSkills) {
    if (cleanText.includes(skill.toLowerCase())) {
      matches++;
    }
  }
  return matches;
};

export const recommendCollaborators = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      skills: {
        include: {
          skill: true,
        },
      },
    },
  });

  if (!currentUser) {
    return [];
  }

  const currentSkills = currentUser.skills.map((s) => s.skill.name.toLowerCase());
  const currentSkillsSet = new Set(currentSkills);

  const engineers = await prisma.user.findMany({
    where: {
      id: {
        not: userId,
      },
      NOT: {
        OR: [
          { primaryRole: { in: ["SUPER_ADMIN", "PLATFORM_ADMIN"] } },
          { primaryRole: { contains: "scraper", mode: "insensitive" } },
          { username: { contains: "scraper", mode: "insensitive" } },
          { email: { contains: "scraper", mode: "insensitive" } },
          {
            roles: {
              some: {
                role: {
                  name: {
                    in: ["SUPER_ADMIN", "PLATFORM_ADMIN", "SCRAPER"],
                  },
                },
              },
            },
          },
          {
            roles: {
              some: {
                role: {
                  name: {
                    contains: "scraper",
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        ],
      },
    },
    include: {
      profile: true,
      skills: {
        include: {
          skill: true,
        },
      },
    },
    take: 200,
  });

  const ranked = engineers.map((engineer) => {
    const skills = engineer.skills.map((s) => s.skill.name.toLowerCase());
    const sharedSkills = skills.filter((skill) => currentSkillsSet.has(skill));

    const similarity = calculateCosineSimilarity(currentSkills, skills);
    const complementarity = calculateComplementarity(currentSkills, skills);

    let score = 0;
    score += similarity * 80;
    score += complementarity * 120;
    score += engineer.engineeringScore * 0.05;

    if (engineer.trustLevel === "ELITE") {
      score += 50;
    }
    if (engineer.trustLevel === "ADVANCED") {
      score += 30;
    }

    return {
      engineer,
      compatibilityScore: Math.round(score),
      sharedSkills,
      similarityScore: Math.round(similarity * 100) / 100,
      complementarityScore: Math.round(complementarity * 100) / 100,
    };
  });

  ranked.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;
  return ranked.slice(skip, skip + safeLimit);
};

export const recommendProjectsForUser = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  const userSkills = await prisma.userSkill.findMany({
    where: {
      userId,
    },
    include: {
      skill: true,
    },
  });

  const skillNames = userSkills.map((s) => s.skill.name.toLowerCase());

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      visibility: "PUBLIC",
    },
    include: {
      owner: {
        include: {
          profile: true,
        },
      },
    },
    take: 200,
  });

  const ranked = projects.map((project) => {
    let score = 0;

    if (project.verified) {
      score += 50;
    }
    if (project.liveUrl) {
      score += 30;
    }

    score += project.starsCount;
    score += project.forksCount * 0.5;

    const techStack = Array.isArray(project.techStack)
      ? project.techStack.filter((tech): tech is string => typeof tech === "string")
      : [];

    const similarity = calculateCosineSimilarity(skillNames, techStack);
    score += similarity * 100;

    const lookingForMatches = matchLookingForSkills(skillNames, project.lookingFor || undefined);
    score += lookingForMatches * 30;

    return {
      ...project,
      recommendationScore: Math.round(score),
      similarityScore: Math.round(similarity * 100) / 100,
      lookingForMatches,
    };
  });

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);

  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;
  return ranked.slice(skip, skip + safeLimit);
};
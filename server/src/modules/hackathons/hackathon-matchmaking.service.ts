import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { findComplementaryTeammates } from "../matchmaking/matchmaking.service";

// Reuse categories and skill mapping values where applicable
const SKILL_CATEGORY_MAP: Record<string, string> = {
  react: "FRONTEND", angular: "FRONTEND", vue: "FRONTEND", svelte: "FRONTEND",
  "next.js": "FRONTEND", nextjs: "FRONTEND", nuxt: "FRONTEND",
  typescript: "FRONTEND", javascript: "FRONTEND", html: "FRONTEND", css: "FRONTEND",
  tailwindcss: "FRONTEND", tailwind: "FRONTEND", figma: "FRONTEND",
  "node.js": "BACKEND", nodejs: "BACKEND", express: "BACKEND",
  python: "BACKEND", django: "BACKEND", flask: "BACKEND", fastapi: "BACKEND",
  java: "BACKEND", spring: "BACKEND", kotlin: "BACKEND",
  golang: "BACKEND", go: "BACKEND", rust: "BACKEND",
  php: "BACKEND", laravel: "BACKEND", ruby: "BACKEND", rails: "BACKEND",
  graphql: "BACKEND", grpc: "BACKEND", rest: "BACKEND",
  postgresql: "BACKEND", mysql: "BACKEND", mongodb: "BACKEND",
  redis: "BACKEND", sqlite: "BACKEND", cassandra: "BACKEND",
  docker: "DEVOPS", kubernetes: "DEVOPS", aws: "DEVOPS",
  gcp: "DEVOPS", azure: "DEVOPS", terraform: "DEVOPS",
  "ci/cd": "DEVOPS", linux: "DEVOPS", git: "DEVOPS",
  ansible: "DEVOPS", jenkins: "DEVOPS", nginx: "DEVOPS",
  kafka: "DEVOPS", rabbitmq: "DEVOPS",
  "machine learning": "ML_AI", "deep learning": "ML_AI",
  tensorflow: "ML_AI", pytorch: "ML_AI", numpy: "ML_AI", pandas: "ML_AI",
  nlp: "ML_AI", "computer vision": "ML_AI", "data science": "ML_AI",
  sklearn: "ML_AI", "scikit-learn": "ML_AI",
  flutter: "MOBILE", "react native": "MOBILE", swift: "MOBILE",
  ios: "MOBILE", android: "MOBILE", "kotlin multiplatform": "MOBILE",
  spark: "DATA", hadoop: "DATA", airflow: "DATA", dbt: "DATA",
  bigquery: "DATA", snowflake: "DATA", tableau: "DATA",
  cybersecurity: "SECURITY", "penetration testing": "SECURITY",
  cryptography: "SECURITY", "network security": "SECURITY",
};

const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  FRONTEND:  ["BACKEND", "DEVOPS", "MOBILE"],
  BACKEND:   ["FRONTEND", "DATA", "DEVOPS"],
  DEVOPS:    ["BACKEND", "FRONTEND", "SECURITY"],
  ML_AI:     ["BACKEND", "DATA", "FRONTEND"],
  MOBILE:    ["BACKEND", "FRONTEND", "DEVOPS"],
  DATA:      ["ML_AI", "BACKEND", "DEVOPS"],
  SECURITY:  ["DEVOPS", "BACKEND"],
  OTHER:     ["FRONTEND", "BACKEND", "DEVOPS"],
};

function getDominantCategory(skillNames: string[]): string {
  const counts: Record<string, number> = {};
  for (const name of skillNames) {
    const category = SKILL_CATEGORY_MAP[name.toLowerCase()];
    if (category) counts[category] = (counts[category] ?? 0) + 1;
  }

  let dominant = "OTHER";
  let max = 0;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      dominant = cat;
    }
  }
  return dominant;
}

export const registerHackathonSoloSeeker = async (
  userId: string,
  hackathonId: string,
  role?: string,
  message?: string,
) => {
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found.", 404);
  }

  const seeker = await prisma.hackathonSoloSeeker.upsert({
    where: {
      hackathonId_userId: { hackathonId, userId },
    },
    update: {
      role: role || null,
      message: message || null,
    },
    create: {
      hackathonId,
      userId,
      role: role || null,
      message: message || null,
    },
  });

  return seeker;
};

export const removeHackathonSoloSeeker = async (userId: string, hackathonId: string) => {
  try {
    await prisma.hackathonSoloSeeker.delete({
      where: {
        hackathonId_userId: { hackathonId, userId },
      },
    });
  } catch (error) {
    throw new AppError("Solo seeker registration not found.", 404);
  }
};

export const findHackathonTeammates = async (
  userId: string,
  hackathonId: string,
  filters: { role?: string; search?: string } = {},
) => {
  // 1. Fetch user skills
  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: { select: { name: true } } },
  });

  if (!userSkills.length) {
    throw new AppError("Add skills to your profile before finding teammates.", 400);
  }

  const userSkillNames = userSkills.map((us) => us.skill.name.toLowerCase());
  const userCategory = getDominantCategory(userSkillNames);
  const targetCategories = COMPLEMENTARY_CATEGORIES[userCategory] || [];

  // Find complementary skills
  const complementarySkillNames = Object.entries(SKILL_CATEGORY_MAP)
    .filter(([, cat]) => targetCategories.includes(cat))
    .map(([name]) => name);

  // 2. Fetch other seekers for this hackathon
  const seekerQuery: any = {
    hackathonId,
    userId: { not: userId },
    user: {
      status: "ACTIVE",
    },
  };

  if (filters.role) {
    seekerQuery.role = { equals: filters.role, mode: "insensitive" };
  }

  if (filters.search) {
    seekerQuery.OR = [
      {
        user: {
          username: { contains: filters.search.trim(), mode: "insensitive" },
        },
      },
      {
        user: {
          profile: {
            fullName: { contains: filters.search.trim(), mode: "insensitive" },
          },
        },
      },
      {
        user: {
          skills: {
            some: {
              skill: {
                name: { contains: filters.search.trim(), mode: "insensitive" },
              },
            },
          },
        },
      },
    ];
  }

  const seekers = await prisma.hackathonSoloSeeker.findMany({
    where: seekerQuery,
    select: {
      role: true,
      message: true,
      user: {
        select: {
          id: true,
          username: true,
          engineeringScore: true,
          profile: { select: { fullName: true, avatarUrl: true, headline: true } },
          skills: {
            select: { skill: { select: { name: true } } },
            take: 20,
          },
        },
      },
    },
    take: 25,
  });

  // 3. Fallback to general platform match if no event specific seeker matched
  if (seekers.length === 0 && !filters.role && !filters.search) {
    const generalMatches = await findComplementaryTeammates(userId, 10);
    return {
      userCategory,
      isFallback: true,
      matches: generalMatches.matches.map((m) => ({
        ...m,
        role: null,
        message: null,
      })),
    };
  }

  const matches = seekers.map((s) => {
    const candidateSkillNames = s.user.skills.map((sk) => sk.skill.name.toLowerCase());
    const dominantCategory = getDominantCategory(candidateSkillNames);
    const matchedSkills = candidateSkillNames.filter((sk) =>
      complementarySkillNames.includes(sk),
    ).slice(0, 5);

    return {
      id: s.user.id,
      username: s.user.username,
      fullName: s.user.profile?.fullName ?? null,
      avatar: s.user.profile?.avatarUrl ?? null,
      headline: s.user.profile?.headline ?? null,
      dominantCategory,
      matchedSkills,
      engineeringScore: s.user.engineeringScore ?? 0,
      role: s.role,
      message: s.message,
    };
  });

  // Sort: Complementary stack matches first, then engineeringScore
  matches.sort((a, b) => {
    const aIsComplementary = targetCategories.includes(a.dominantCategory) ? 1 : 0;
    const bIsComplementary = targetCategories.includes(b.dominantCategory) ? 1 : 0;
    if (aIsComplementary !== bIsComplementary) return bIsComplementary - aIsComplementary;
    return b.engineeringScore - a.engineeringScore;
  });

  return {
    userCategory,
    isFallback: false,
    matches,
  };
};

export const getSoloSeekerStatus = async (userId: string, hackathonId: string) => {
  const seeker = await prisma.hackathonSoloSeeker.findUnique({
    where: {
      hackathonId_userId: { hackathonId, userId },
    },
  });
  return seeker;
};

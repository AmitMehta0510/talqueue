/**
 * Complementary Stack Matchmaking Service
 *
 * Groups engineering skills into broad tech categories and finds users
 * whose dominant category COMPLEMENTS the requesting user's category.
 * E.g.: a Frontend developer (React, Vue) gets matched with Backend
 * developers (Node.js, Django) and DevOps engineers.
 */

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

// ── Skill taxonomy ─────────────────────────────────────────────────────────────

type SkillCategory = "FRONTEND" | "BACKEND" | "DEVOPS" | "ML_AI" | "MOBILE" | "DATA" | "SECURITY" | "OTHER";

const SKILL_CATEGORY_MAP: Record<string, SkillCategory> = {
  // Frontend
  react: "FRONTEND", angular: "FRONTEND", vue: "FRONTEND", svelte: "FRONTEND",
  "next.js": "FRONTEND", nextjs: "FRONTEND", nuxt: "FRONTEND",
  typescript: "FRONTEND", javascript: "FRONTEND", html: "FRONTEND", css: "FRONTEND",
  tailwindcss: "FRONTEND", tailwind: "FRONTEND", figma: "FRONTEND",
  // Backend
  "node.js": "BACKEND", nodejs: "BACKEND", express: "BACKEND",
  python: "BACKEND", django: "BACKEND", flask: "BACKEND", fastapi: "BACKEND",
  java: "BACKEND", spring: "BACKEND", kotlin: "BACKEND",
  golang: "BACKEND", go: "BACKEND", rust: "BACKEND",
  php: "BACKEND", laravel: "BACKEND", ruby: "BACKEND", rails: "BACKEND",
  graphql: "BACKEND", grpc: "BACKEND", rest: "BACKEND",
  // Databases (map to BACKEND)
  postgresql: "BACKEND", mysql: "BACKEND", mongodb: "BACKEND",
  redis: "BACKEND", sqlite: "BACKEND", cassandra: "BACKEND",
  // DevOps
  docker: "DEVOPS", kubernetes: "DEVOPS", aws: "DEVOPS",
  gcp: "DEVOPS", azure: "DEVOPS", terraform: "DEVOPS",
  "ci/cd": "DEVOPS", linux: "DEVOPS", git: "DEVOPS",
  ansible: "DEVOPS", jenkins: "DEVOPS", nginx: "DEVOPS",
  kafka: "DEVOPS", rabbitmq: "DEVOPS",
  // ML / AI
  "machine learning": "ML_AI", "deep learning": "ML_AI",
  tensorflow: "ML_AI", pytorch: "ML_AI", numpy: "ML_AI", pandas: "ML_AI",
  nlp: "ML_AI", "computer vision": "ML_AI", "data science": "ML_AI",
  sklearn: "ML_AI", "scikit-learn": "ML_AI",
  // Mobile
  flutter: "MOBILE", "react native": "MOBILE", swift: "MOBILE",
  ios: "MOBILE", android: "MOBILE", "kotlin multiplatform": "MOBILE",
  // Data Engineering
  spark: "DATA", hadoop: "DATA", airflow: "DATA", dbt: "DATA",
  bigquery: "DATA", snowflake: "DATA", tableau: "DATA",
  // Security
  cybersecurity: "SECURITY", "penetration testing": "SECURITY",
  cryptography: "SECURITY", "network security": "SECURITY",
};

/**
 * Returns the complementary categories for a given primary category.
 * Complementary = teams that need you as a missing piece.
 */
const COMPLEMENTARY_CATEGORIES: Record<SkillCategory, SkillCategory[]> = {
  FRONTEND:  ["BACKEND", "DEVOPS", "MOBILE"],
  BACKEND:   ["FRONTEND", "DATA", "DEVOPS"],
  DEVOPS:    ["BACKEND", "FRONTEND", "SECURITY"],
  ML_AI:     ["BACKEND", "DATA", "FRONTEND"],
  MOBILE:    ["BACKEND", "FRONTEND", "DEVOPS"],
  DATA:      ["ML_AI", "BACKEND", "DEVOPS"],
  SECURITY:  ["DEVOPS", "BACKEND"],
  OTHER:     ["FRONTEND", "BACKEND", "DEVOPS"],
};

/**
 * Returns the dominant skill category for a list of skill names.
 */
function getDominantCategory(skillNames: string[]): SkillCategory {
  const counts: Partial<Record<SkillCategory, number>> = {};
  for (const name of skillNames) {
    const category = SKILL_CATEGORY_MAP[name.toLowerCase()];
    if (category) counts[category] = (counts[category] ?? 0) + 1;
  }

  let dominant: SkillCategory = "OTHER";
  let max = 0;
  for (const [cat, count] of Object.entries(counts) as [SkillCategory, number][]) {
    if (count > max) { max = count; dominant = cat; }
  }
  return dominant;
}

export interface TeammateMatch {
  id: string;
  username: string | null;
  fullName: string | null;
  avatar: string | null;
  headline: string | null;
  dominantCategory: SkillCategory;
  matchedSkills: string[];
  engineeringScore: number;
}

/**
 * Finds engineers whose primary skill category complements the requesting user.
 * Ordered by engineering score descending.
 *
 * @param userId  - The requesting user's ID.
 * @param limit   - Maximum results to return (default 10, max 25).
 */
export const findComplementaryTeammates = async (
  userId: string,
  limit = 10,
): Promise<{ userCategory: SkillCategory; matches: TeammateMatch[] }> => {
  const safeLimit = Math.min(limit, 25);

  // Fetch the requesting user's skills
  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: { select: { name: true } } },
  });

  if (!userSkills.length) {
    throw new AppError("Add skills to your profile before finding teammates.", 400);
  }

  const userSkillNames = userSkills.map((us) => us.skill.name.toLowerCase());
  const userCategory = getDominantCategory(userSkillNames);
  const targetCategories = COMPLEMENTARY_CATEGORIES[userCategory];

  // Find skills belonging to complementary categories
  const complementarySkillNames = Object.entries(SKILL_CATEGORY_MAP)
    .filter(([, cat]) => targetCategories.includes(cat))
    .map(([name]) => name);

  // Find users who have at least one complementary skill
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: userId },
      deletedAt: null,
      skills: {
        some: {
          skill: {
            name: { in: complementarySkillNames, mode: "insensitive" },
          },
        },
      },
    },
    select: {
      id: true,
      username: true,
      engineeringScore: true,
      profile: { select: { fullName: true, avatar: true, headline: true } },
      skills: {
        include: { skill: { select: { name: true } } },
        take: 20,
      },
    },
    orderBy: { engineeringScore: "desc" },
    take: safeLimit,
  });

  const matches: TeammateMatch[] = candidates.map((candidate) => {
    const candidateSkillNames = candidate.skills.map((s) => s.skill.name.toLowerCase());
    const dominantCategory = getDominantCategory(candidateSkillNames);
    const matchedSkills = candidateSkillNames.filter((s) =>
      complementarySkillNames.includes(s),
    ).slice(0, 5);

    return {
      id: candidate.id,
      username: candidate.username,
      fullName: candidate.profile?.fullName ?? null,
      avatar: candidate.profile?.avatar ?? null,
      headline: candidate.profile?.headline ?? null,
      dominantCategory,
      matchedSkills,
      engineeringScore: candidate.engineeringScore ?? 0,
    };
  });

  return { userCategory, matches };
};

/**
 * Skills sub-service — extracted from users.service.ts
 * Owns: getMySkills, searchSkills, upsertSkillByName, addSkill, removeSkill
 */
import {
  type PaginationParams,
  type AddSkillData,
  MAX_SKILLS,
  DEFAULT_SECTION_LIMIT,
  MAX_SECTION_LIMIT,
  clampLimit,
  normalizeSearchText,
} from "./_shared";

export { type AddSkillData } from "./_shared";

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { SkillLevel } from "@prisma/client";
import AppError from "shared/errors/AppError";
import { syncUserToResdex } from "services/resdexSyncService";
import { syncUserToElastic } from "services/elasticSync";
import { addReputation } from "../reputation/reputation.service";
import { createActivity } from "../activities/activity.service";
import { calculateEngineeringScore } from "../reputation/engineering-score.service";
import { verifyUserSkills } from "./skill-verification.service";
import slugify from "slugify";


export const getMySkills = async (
  userId: string,

  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const skills = await prisma.userSkill.findMany({
    where: {
      userId,
    },

    include: {
      skill: true,
    },

    orderBy: {
      createdAt: "desc",
    },

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },

          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const hasNextPage = skills.length > limit;

  const items = hasNextPage ? skills.slice(0, limit) : skills;

  return {
    skills: items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};


export const searchSkills = async (query: string, limit = 12) => {
  const normalizedQuery = normalizeSearchText(query);
  const safeLimit = Math.min(MAX_SECTION_LIMIT, Math.max(1, limit || 12));

  if (normalizedQuery.length < 2) {
    return [];
  }

  return prisma.skill.findMany({
    where: {
      name: {
        startsWith: normalizedQuery,
        mode: "insensitive",
      },
    },

    orderBy: [
      {
        verified: "desc",
      },

      {
        searchScore: "desc",
      },

      {
        name: "asc",
      },
    ],

    take: safeLimit,
  });
};

export const upsertSkillByName = async (rawName: string) => {
  const name = rawName.trim();
  if (!name || name.length < 2) {
    throw new AppError("Skill name must be at least 2 characters", 400);
  }

  // Check if skill already exists (case-insensitive)
  const existing = await prisma.skill.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existing) return existing;

  return prisma.skill.create({
    data: { name },
  });
};



export const addSkill = async (userId: string, data: AddSkillData) => {
  const skill = await prisma.skill.findUnique({
    where: {
      id: data.skillId,
    },

    select: {
      id: true,
    },
  });

  if (!skill) {
    throw new AppError("Skill not found", 404);
  }

  // Check if this is a new skill (not an update of an existing one)
  const existingUserSkill = await prisma.userSkill.findUnique({
    where: {
      userId_skillId: {
        userId,
        skillId: data.skillId,
      },
    },
    select: { id: true },
  });

  if (!existingUserSkill) {
    const skillCount = await prisma.userSkill.count({ where: { userId } });
    if (skillCount >= MAX_SKILLS) {
      throw new AppError(`You can add a maximum of ${MAX_SKILLS} skills`, 400);
    }
  }

  const result = await prisma.userSkill.upsert({
    where: {
      userId_skillId: {
        userId,
        skillId: data.skillId,
      },
    },

    update: {
      level: data.level,
    },

    create: {
      userId,
      skillId: data.skillId,
      level: data.level,
    },

    include: {
      skill: true,
    },
  });

  // Sync user profile to Resdex
  syncUserToResdex(userId);
  syncUserToElastic(userId);

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return result;
};


export const removeSkill = async (userId: string, skillId: string) => {
  const userSkill = await prisma.userSkill.findFirst({
    where: { userId, skillId },
    select: { id: true },
  });

  if (!userSkill) {
    throw new AppError("Skill not found on your profile", 404);
  }

  await prisma.userSkill.delete({ where: { id: userSkill.id } });

  calculateEngineeringScore(userId).catch(console.error);

  // Sync user profile to Resdex
  syncUserToResdex(userId);
  syncUserToElastic(userId);

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return { id: userSkill.id };
};


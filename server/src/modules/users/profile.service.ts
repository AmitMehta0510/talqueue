/**
 * Profile sub-service — extracted from users.service.ts
 * Owns: getMyProfile, getMyFullProfile, getUserFullProfile, updateProfile, getMyProjects
 */
import {
  type PaginationParams,
  type UpdateProfileData,
  getCachedStandardDepartments,
  bustStandardDepartmentCache,
  resolveCollegeDepartment,
  MAX_SKILLS,
  DEFAULT_SECTION_LIMIT,
  MAX_SECTION_LIMIT,
  userProfileSelect,
  userFullProfileSelect,
  compactEducationInclude,
  stripUndefined,
  isDomainAllowed,
  toDate,
  clampLimit,
  normalizeSearchText,
  buildCompanySlug,
  buildStableCompanySlug,
  buildFallbackCompanySlug,
  assertDepartmentBelongsToCollege,
  normalizeEmploymentType,
  assertNoDuplicateEducation,
  assertNoExperienceConflict,
  getOrCreateCompany,
} from "./_shared";

export {
  type PaginationParams,
  type UpdateProfileData,
  getCachedStandardDepartments,
  bustStandardDepartmentCache,
  resolveCollegeDepartment,
} from "./_shared";

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { Prisma } from "@prisma/client";
import AppError from "shared/errors/AppError";
import { syncUserToResdex } from "services/resdexSyncService";
import { addReputation } from "../reputation/reputation.service";
import { createActivity } from "../activities/activity.service";
import { calculateEngineeringScore } from "../reputation/engineering-score.service";
import { autoJoinUserCommunities } from "modules/community/community.service";
import { createHash, randomBytes } from "crypto";
import slugify from "slugify";
import { verifyUserSkills } from "./skill-verification.service";
import { ensureOfficialDepartmentCommunity } from "modules/colleges/colleges.service";
import { getOrSetCache, bustCache } from "shared/database/redisCache";

export const getMyProfile = async (userId: string) => {
  const cacheKey = `profile:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      await redis.expire(cacheKey, 180);
      return parsed;
    }
  } catch (err: any) {
    console.warn(`[Profile Cache] Redis get failed for user ${userId}:`, err?.message || err);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: userProfileSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  try {
    await redis.setex(cacheKey, 180, JSON.stringify(user));
  } catch (err: any) {
    console.warn(`[Profile Cache] Redis set failed for user ${userId}:`, err?.message || err);
  }

  return user;
};

export const getMyFullProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: userFullProfileSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const getUserFullProfile = async (userId: string) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  let resolvedId = userId;
  if (!isUuid) {
    const user = await prisma.user.findFirst({
      where: { username: userId },
      select: { id: true },
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    resolvedId = user.id;
  }

  const cacheKey = `profile:${resolvedId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.skills) {
        await redis.expire(cacheKey, 180);
        const { email: _email, ...publicUser } = parsed;
        return publicUser;
      }
    }
  } catch (err: any) {
    console.warn(`[Profile Cache] Redis get failed for user ${resolvedId}:`, err?.message || err);
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: resolvedId },
        { username: resolvedId },
      ],
    },

    select: userFullProfileSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  try {
    await redis.setex(cacheKey, 180, JSON.stringify(user));
  } catch (err: any) {
    console.warn(`[Profile Cache] Redis set failed for user ${resolvedId}:`, err?.message || err);
  }

  const { email: _email, ...publicUser } = user;

  return publicUser;
};


export const updateProfile = async (
  userId: string,
  data: UpdateProfileData,
) => {
  const {
    username,
    acceptingReferrals,
    openToWork,
    openToInternship,
    availabilityStatus,
    leetcodeUrl,
    hackerrankUrl,
    gfgUrl,

    ...profileData
  } = data;

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        username: true,
        profile: {
          select: {
            fullName: true,
            collegeId: true,
            departmentId: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (username && username !== user.username) {
      const existingUsername = await tx.user.findUnique({
        where: {
          username,
        },

        select: {
          id: true,
        },
      });

      if (existingUsername && existingUsername.id !== userId) {
        throw new AppError("Username already taken", 400);
      }

      await tx.user.update({
        where: {
          id: userId,
        },

        data: {
          username,
        },
      });
    }

    if (
      acceptingReferrals !== undefined ||
      openToWork !== undefined ||
      openToInternship !== undefined ||
      availabilityStatus !== undefined
    ) {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          ...(acceptingReferrals !== undefined && { acceptingReferrals }),
          ...(openToWork !== undefined && { openToWork }),
          ...(openToInternship !== undefined && { openToInternship }),
          ...(availabilityStatus !== undefined && { availabilityStatus }),
        },
      });
    }

    const cleanProfileData = stripUndefined(profileData);

    const effectiveCollegeId =
      cleanProfileData.collegeId ?? user.profile?.collegeId ?? undefined;

    if (
      cleanProfileData.collegeId &&
      cleanProfileData.collegeId !== user.profile?.collegeId &&
      cleanProfileData.departmentId === undefined &&
      user.profile?.departmentId
    ) {
      cleanProfileData.departmentId = null;
    }

    if (cleanProfileData.collegeId) {
      const college = await tx.college.findUnique({
        where: {
          id: cleanProfileData.collegeId,
        },

        select: {
          id: true,
        },
      });

      if (!college) {
        throw new AppError("College not found", 404);
      }
    }

    await assertDepartmentBelongsToCollege(
      tx,
      effectiveCollegeId,
      cleanProfileData.departmentId,
    );

    if (Object.keys(cleanProfileData).length > 0 || !user.profile) {
      await tx.profile.upsert({
        where: {
          userId,
        },

        update: cleanProfileData,

        create: {
          userId,

          fullName:
            cleanProfileData.fullName ||
            user.profile?.fullName ||
            username ||
            user.username,

          ...cleanProfileData,
        },
      });
    }

    if (cleanProfileData.collegeId || cleanProfileData.departmentId) {
      await autoJoinUserCommunities(
        userId,
        {
          collegeId: cleanProfileData.collegeId ?? user.profile?.collegeId,

          departmentId:
            cleanProfileData.departmentId ?? user.profile?.departmentId,
        },
        tx,
      );
    }

    // Sync LeetCode URL
    if (leetcodeUrl !== undefined) {
      await tx.codingProfile.deleteMany({
        where: { userId, platform: "LeetCode" },
      });
      if (leetcodeUrl) {
        const usernameLC = leetcodeUrl.replace(/\/$/, "").split("/").pop() || "";
        await tx.codingProfile.create({
          data: {
            userId,
            platform: "LeetCode",
            url: leetcodeUrl,
            username: usernameLC,
          },
        });
      }
    }

    // Sync HackerRank URL
    if (hackerrankUrl !== undefined) {
      await tx.codingProfile.deleteMany({
        where: { userId, platform: "HackerRank" },
      });
      if (hackerrankUrl) {
        const usernameHR = hackerrankUrl.replace(/\/$/, "").split("/").pop() || "";
        await tx.codingProfile.create({
          data: {
            userId,
            platform: "HackerRank",
            url: hackerrankUrl,
            username: usernameHR,
          },
        });
      }
    }

    // Sync GeeksforGeeks URL
    if (gfgUrl !== undefined) {
      await tx.codingProfile.deleteMany({
        where: { userId, platform: "GeeksforGeeks" },
      });
      if (gfgUrl) {
        const usernameGFG = gfgUrl.replace(/\/$/, "").split("/").pop() || "";
        await tx.codingProfile.create({
          data: {
            userId,
            platform: "GeeksforGeeks",
            url: gfgUrl,
            username: usernameGFG,
          },
        });
      }
    }

    return tx.user.findUnique({
      where: {
        id: userId,
      },

      select: userProfileSelect,
    });
  });

  // Trigger skill verification asynchronously in the background
  const hasProfileLinksUpdated =
    data.githubUrl !== undefined ||
    leetcodeUrl !== undefined ||
    hackerrankUrl !== undefined ||
    gfgUrl !== undefined;

  if (hasProfileLinksUpdated) {
    verifyUserSkills(userId).catch((err) => {
      console.error("Skill verification background job error:", err);
    });
  }

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return updatedUser;
};


export const getMyProjects = async (userId: string) => {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
      deletedAt: null,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: [
      { updatedAt: "desc" },
    ],
    take: 50,
  });

  return projects;
};


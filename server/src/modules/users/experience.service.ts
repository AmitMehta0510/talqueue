/**
 * Experience sub-service — extracted from users.service.ts
 * Owns: getMyExperiences, addExperience, updateExperience, removeExperience, verifyWorkEmail
 */
import {
  type PaginationParams,
  type AddExperienceData,
  type UpdateExperienceData,
  type UserWriteClient,
  DEFAULT_SECTION_LIMIT,
  MAX_SECTION_LIMIT,
  clampLimit,
  stripUndefined,
  isDomainAllowed,
  toDate,
  normalizeEmploymentType,
  normalizeSearchText,
  buildCompanySlug,
  buildStableCompanySlug,
  buildFallbackCompanySlug,
  assertNoExperienceConflict,
  getOrCreateCompany,
  assertDepartmentBelongsToCollege,
} from "./_shared";

export { type AddExperienceData, type UpdateExperienceData } from "./_shared";

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { EmploymentType, Prisma } from "@prisma/client";
import AppError from "shared/errors/AppError";
import { syncUserToResdex } from "services/resdexSyncService";
import { addReputation } from "../reputation/reputation.service";
import { createActivity } from "../activities/activity.service";
import { calculateEngineeringScore } from "../reputation/engineering-score.service";
import { autoJoinUserCommunities } from "modules/community/community.service";
import slugify from "slugify";
import { createHash, randomBytes } from "crypto";


export const getMyExperiences = async (
  userId: string,

  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const experiences = await prisma.experience.findMany({
    where: {
      userId,
    },

    include: {
      company: true,
    },

    orderBy: [
      {
        isCurrent: "desc",
      },

      {
        startDate: "desc",
      },
    ],

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

  const hasNextPage = experiences.length > limit;

  const items = hasNextPage ? experiences.slice(0, limit) : experiences;

  return {
    experiences: items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};


export const addExperience = async (
  userId: string,

  data: AddExperienceData,
) => {
  const companyName = normalizeSearchText(data.companyName);

  if (!companyName) {
    throw new AppError("Company name is required", 400);
  }

  const startDate = toDate(data.startDate, "startDate");

  const endDate =
    data.isCurrent || !data.endDate ? null : toDate(data.endDate, "endDate");

  if (endDate && endDate < startDate) {
    throw new AppError("End date cannot be before start date", 400);
  }

  const employmentType = normalizeEmploymentType(data.employmentType);

  await assertNoExperienceConflict(userId, employmentType, startDate, endDate);

  // Verification scoring
  let verificationScore = 0;

  // Work email
  if (data.workEmail) {
    verificationScore += 25;
  }

  // Manager email
  if (data.managerEmail) {
    verificationScore += 15;
  }

  // Documents
  if (
    data.documents &&
    Array.isArray(data.documents) &&
    data.documents.length > 0
  ) {
    verificationScore += 25;
  }

  // Tech stack
  if (data.techStack && Array.isArray(data.techStack)) {
    verificationScore += 10;
  }

  // Skills used
  if (data.skillsUsed && Array.isArray(data.skillsUsed)) {
    verificationScore += 10;
  }

  // Duration check
  const scoringEndDate = endDate || new Date();

  const months =
    (scoringEndDate.getTime() - startDate.getTime()) /
    (1000 * 60 * 60 * 24 * 30);

  if (months >= 3) {
    verificationScore += 15;
  }

  // Verified threshold
  const verified = verificationScore >= 60;

  const experience = await prisma.$transaction(async (tx) => {
    const company = await getOrCreateCompany(tx, companyName, data.companyWebsiteUrl);

    if (data.isCurrent) {
      await tx.experience.updateMany({
        where: {
          userId,
          isCurrent: true,
        },

        data: {
          isCurrent: false,
        },
      });
    }

    const createdExperience = await tx.experience.create({
      data: {
        userId,

        companyId: company.id,

        companyName: company.name,

        title: data.title,

        employmentType,

        startDate,

        endDate,

        isCurrent: data.isCurrent || false,

        description: data.description,

        //
        // Authenticity
        //
        verified,

        verificationScore,

        verifiedAt: verified ? new Date() : null,

        workEmail: data.workEmail,

        managerName: data.managerName,

        managerEmail: data.managerEmail,

        managerLinkedinUrl: data.managerLinkedinUrl,

        documents: data.documents,

        skillsUsed: data.skillsUsed,

        achievements: data.achievements,

        techStack: data.techStack,

        teamSize: data.teamSize,
      },

      include: {
        company: true,
      },
    });

    return createdExperience;
  });

  setImmediate(() => {
    const tasks = [
      async () => {
        await autoJoinUserCommunities(userId, { companyId: experience.companyId });
      },
      async () => {
        await addReputation(
          userId,
          "EXPERIENCE_ADDED",
          verified ? 20 : 0,
          verified ? "Added verified experience" : "Added experience",
          { experienceId: experience.id }
        );
      },
      async () => {
        await createActivity(
          userId,
          "EXPERIENCE_ADDED",
          "Added experience",
          `Added experience at "${experience.companyName || companyName}"`,
          { experienceId: experience.id }
        );
      },
      async () => {
        await calculateEngineeringScore(userId);
      },
      async () => {
        await syncUserToResdex(userId);
      }
    ];

    for (const task of tasks) {
      task().catch((err) => {
        console.error("Error in asynchronous post-experience pipeline task:", err);
      });
    }
  });

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return experience;
};


export const removeExperience = async (userId: string, experienceId: string) => {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, userId },
    select: { id: true, companyName: true },
  });

  if (!experience) {
    throw new AppError("Experience not found", 404);
  }

  await prisma.experience.delete({ where: { id: experienceId } });

  Promise.all([
    addReputation(userId, "EXPERIENCE_ADDED", -5, "Removed experience", {
      experienceId,
    }),
    calculateEngineeringScore(userId),
  ]).catch(console.error);

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return { id: experienceId };
};

export const updateExperience = async (
  userId: string,
  experienceId: string,
  data: UpdateExperienceData,
) => {
  const existing = await prisma.experience.findFirst({
    where: { id: experienceId, userId },
    select: { id: true, startDate: true, endDate: true, isCurrent: true, companyId: true },
  });

  if (!existing) {
    throw new AppError("Experience not found", 404);
  }

  const updateData: Record<string, any> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.workEmail !== undefined) updateData.workEmail = data.workEmail;
  if (data.managerName !== undefined) updateData.managerName = data.managerName;
  if (data.managerEmail !== undefined) updateData.managerEmail = data.managerEmail;
  if (data.managerLinkedinUrl !== undefined) updateData.managerLinkedinUrl = data.managerLinkedinUrl;
  if (data.skillsUsed !== undefined) updateData.skillsUsed = data.skillsUsed;
  if (data.techStack !== undefined) updateData.techStack = data.techStack;
  if (data.teamSize !== undefined) updateData.teamSize = data.teamSize;

  if (data.employmentType !== undefined) {
    updateData.employmentType = normalizeEmploymentType(data.employmentType);
  }

  if (data.isCurrent !== undefined) {
    updateData.isCurrent = data.isCurrent;
    if (data.isCurrent) {
      updateData.endDate = null;
    }
  }

  if (data.companyWebsiteUrl !== undefined) {
    await prisma.company.update({
      where: { id: existing.companyId },
      data: { websiteUrl: data.companyWebsiteUrl },
    });
  }

  if (data.startDate !== undefined) {
    updateData.startDate = toDate(data.startDate, "startDate");
  }

  if (data.endDate !== undefined && !data.isCurrent) {
    updateData.endDate = toDate(data.endDate, "endDate");
  }

  const effectiveStart = updateData.startDate || existing.startDate;
  const effectiveEnd = updateData.endDate ?? (updateData.isCurrent ? null : existing.endDate);

  if (effectiveEnd && effectiveEnd < effectiveStart) {
    throw new AppError("End date cannot be before start date", 400);
  }

  // Recalculate verification score
  let verificationScore = 0;
  const finalData = { ...data };
  if (finalData.workEmail || (!finalData.workEmail && data.workEmail === undefined)) verificationScore += 25;
  if (finalData.managerEmail || (!finalData.managerEmail && data.managerEmail === undefined)) verificationScore += 15;
  if (finalData.techStack?.length || (!finalData.techStack && data.techStack === undefined)) verificationScore += 10;
  if (finalData.skillsUsed?.length || (!finalData.skillsUsed && data.skillsUsed === undefined)) verificationScore += 10;

  const scoringEnd = effectiveEnd || new Date();
  const months = (scoringEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months >= 3) verificationScore += 15;

  updateData.verificationScore = verificationScore;
  updateData.verified = verificationScore >= 60;
  updateData.verifiedAt = updateData.verified ? new Date() : null;

  // If marking current, unset other current experiences
  if (data.isCurrent) {
    await prisma.experience.updateMany({
      where: { userId, isCurrent: true, id: { not: experienceId } },
      data: { isCurrent: false },
    });
  }

  const updated = await prisma.experience.update({
    where: { id: experienceId },
    data: updateData,
    include: { company: true },
  });

  if (existing.isCurrent && !updated.isCurrent && updated.companyId) {
    const communities = await prisma.community.findMany({
      where: { companyId: updated.companyId },
      select: { id: true, name: true },
    });
    for (const c of communities) {
      const membership = await prisma.communityMember.findUnique({
        where: {
          communityId_userId: { communityId: c.id, userId },
        },
      });
      if (membership && membership.role !== "ALUMNI") {
        await prisma.communityMember.update({
          where: { id: membership.id },
          data: { role: "ALUMNI" },
        });
        console.log(`[AlumniTransition] User ${userId} role changed to ALUMNI in community ${c.name}`);
      }
    }
  }

  calculateEngineeringScore(userId).catch(console.error);

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return updated;
};


export const verifyWorkEmail = async (
  userId: string,
  experienceId: string,
  workEmail: string,
  code?: string
) => {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, userId },
    include: { company: true },
  });

  if (!experience) {
    throw new AppError("Experience record not found", 404);
  }

  if (!experience.companyId) {
    throw new AppError("This experience record is not linked to a registered company", 400);
  }

  const allowedDomains = experience.company?.emailDomains || [];
  const parts = workEmail.split("@");
  const domain = parts[1]?.toLowerCase().trim();

  if (allowedDomains.length > 0 && !allowedDomains.some((d) => isDomainAllowed(domain, d))) {
    throw new AppError(`Email domain '${domain}' does not match any approved domains for ${experience.company?.name || "your company"}.`, 400);
  }

  if (!code) {
    const codeVal = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `verification:work:${userId}:${experienceId}`;
    await redis.setex(redisKey, 600, JSON.stringify({ email: workEmail, code: codeVal }));

    console.log(`[WorkEmailVerification] Verification code for ${workEmail} is '${codeVal}'`);
    return {
      success: true,
      message: `A verification code has been sent to ${workEmail}. Please use the code to confirm.`,
    };
  }

  const redisKey = `verification:work:${userId}:${experienceId}`;
  const storedData = await redis.get(redisKey);
  if (!storedData) {
    throw new AppError("Verification code expired or not requested. Please request a new code.", 400);
  }

  const { email: storedEmail, code: storedCode } = JSON.parse(storedData);
  if (storedEmail.toLowerCase().trim() !== workEmail.toLowerCase().trim() || storedCode !== code) {
    throw new AppError("Invalid verification code. Please try again.", 400);
  }

  await redis.del(redisKey);

  const updatedExperience = await prisma.$transaction(async (tx) => {
    const res = await tx.experience.update({
      where: { id: experienceId },
      data: {
        workEmail,
        workEmailVerified: true,
        verified: true,
        verifiedAt: new Date(),
        verificationScore: 100, // force complete verification score
      },
    });

    await autoJoinUserCommunities(
      userId,
      {
        companyId: res.companyId,
      },
      tx
    );

    return res;
  });

  return {
    success: true,
    message: "Work email verified successfully!",
    experience: updatedExperience,
  };
};

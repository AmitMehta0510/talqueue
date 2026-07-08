/**
 * Education sub-service — extracted from users.service.ts
 * Owns: getMyEducations, addEducation, updateEducation, removeEducation, verifyCollegeEmail
 */
import {
  type PaginationParams,
  type AddEducationData,
  type UpdateEducationData,
  type UserWriteClient,
  DEFAULT_SECTION_LIMIT,
  MAX_SECTION_LIMIT,
  clampLimit,
  stripUndefined,
  isDomainAllowed,
  compactEducationInclude,
  assertDepartmentBelongsToCollege,
  assertNoDuplicateEducation,
  resolveCollegeDepartment,
} from "./_shared";

export { type AddEducationData, type UpdateEducationData } from "./_shared";

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { Prisma } from "@prisma/client";
import AppError from "shared/errors/AppError";
import { syncUserToResdex } from "services/resdexSyncService";
import { addReputation } from "../reputation/reputation.service";
import { createActivity } from "../activities/activity.service";
import { calculateEngineeringScore } from "../reputation/engineering-score.service";
import { autoJoinUserCommunities } from "modules/community/community.service";
import { ensureOfficialDepartmentCommunity } from "modules/colleges/colleges.service";
import { getOrSetCache, bustCache } from "shared/database/redisCache";


export const getMyEducations = async (
  userId: string,

  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const educations = await prisma.education.findMany({
    where: {
      userId,
    },

    include: compactEducationInclude,

    orderBy: [
      {
        current: "desc",
      },

      {
        startYear: "desc",
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

  const hasNextPage = educations.length > limit;

  const items = hasNextPage ? educations.slice(0, limit) : educations;

  return {
    educations: items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};


export const addEducation = async (userId: string, data: AddEducationData) => {
  // Guard: must have either a known college OR a custom name
  const hasKnownCollege = Boolean(data.collegeId);
  const hasCustomCollege = Boolean(data.customCollegeName?.trim());

  if (!hasKnownCollege && !hasCustomCollege) {
    throw new AppError(
      "Please select a college or provide a college name",
      400,
    );
  }

  if (data.startYear && data.endYear && data.endYear < data.startYear) {
    throw new AppError("End year cannot be before start year", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // ── Track A: Known college in DB ─────────────────────────────────────
    if (hasKnownCollege) {
      const college = await tx.college.findUnique({
        where: { id: data.collegeId! },
        select: { id: true },
      });

      if (!college) {
        throw new AppError("College not found", 404);
      }

      const { departmentId, fieldOfStudy } = await resolveCollegeDepartment(
        tx,
        userId,
        data.collegeId!,
        data.departmentId,
        data.fieldOfStudy
      );

      await assertNoDuplicateEducation(tx, userId, {
        ...data,
        departmentId,
        fieldOfStudy: fieldOfStudy || undefined,
      });

      if (data.current) {
        await tx.education.updateMany({
          where: { userId, current: true },
          data: { current: false },
        });
      }

      const education = await tx.education.create({
        data: {
          userId,
          collegeId: data.collegeId!,
          departmentId,
          degree: data.degree,
          fieldOfStudy: fieldOfStudy || undefined,
          startYear: data.startYear,
          endYear: data.endYear,
          current: data.current || false,
          cgpa: data.cgpa,
          backlogs: data.backlogs,
          currentYear: data.currentYear,
        },
        include: compactEducationInclude,
      });

      // Sync to user's profile
      await tx.profile.upsert({
        where: { userId },
        update: { collegeId: data.collegeId!, departmentId: departmentId || null },
        create: {
          userId,
          fullName: "",
          collegeId: data.collegeId!,
          departmentId: departmentId || null,
        },
      });

      return education;
    }

    // ── Track B: Custom (unlisted) college ───────────────────────────────
    const customName = data.customCollegeName!.trim();

    let resolvedFieldOfStudy = data.fieldOfStudy;
    if (data.departmentId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.departmentId);
      if (isUuid) {
        const standardDept = await tx.standardDepartment.findUnique({
          where: { id: data.departmentId },
        });
        if (standardDept) {
          resolvedFieldOfStudy = standardDept.name;
        }
      } else {
        resolvedFieldOfStudy = data.departmentId;
      }
    }

    await assertNoDuplicateEducation(tx, userId, {
      ...data,
      departmentId: null,
      fieldOfStudy: resolvedFieldOfStudy,
    });

    if (data.current) {
      await tx.education.updateMany({
        where: { userId, current: true },
        data: { current: false },
      });
    }

    const education = await tx.education.create({
      data: {
        userId,
        collegeId: null,
        customCollegeName: customName,
        departmentId: null,
        degree: data.degree,
        fieldOfStudy: resolvedFieldOfStudy,
        startYear: data.startYear,
        endYear: data.endYear,
        current: data.current || false,
        cgpa: data.cgpa,
        backlogs: data.backlogs,
        currentYear: data.currentYear,
      },
      include: compactEducationInclude,
    });

    // Create a CollegeRequest for admin review (deduplicate same name per user)
    const existingRequest = await tx.collegeRequest.findFirst({
      where: { userId, name: customName, status: "PENDING" },
      select: { id: true },
    });
    if (!existingRequest) {
      await tx.collegeRequest.create({
        data: { userId, name: customName },
      });
    }

    return education;
  });

  setImmediate(() => {
    const tasks = [
      async () => {
        if (hasKnownCollege && result.collegeId) {
          await autoJoinUserCommunities(userId, {
            collegeId: result.collegeId,
            departmentId: result.departmentId,
          });
        }
      },
      async () => {
        await syncUserToResdex(userId);
      }
    ];

    for (const task of tasks) {
      task().catch((err) => {
        console.error("Error in asynchronous post-education pipeline task:", err);
      });
    }
  });

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return result;
};

// ─── Remove Operations ──────────────────────────────────────────────────────


export const removeEducation = async (userId: string, educationId: string) => {
  const education = await prisma.education.findFirst({
    where: { id: educationId, userId },
    select: { id: true },
  });

  if (!education) {
    throw new AppError("Education not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.education.delete({ where: { id: educationId } });

    // Find next most recent education
    const remaining = await tx.education.findFirst({
      where: { userId },
      orderBy: [
        { current: "desc" },
        { startYear: "desc" },
      ],
      select: { collegeId: true, departmentId: true },
    });

    if (remaining) {
      await tx.profile.upsert({
        where: { userId },
        update: { collegeId: remaining.collegeId, departmentId: remaining.departmentId },
        create: {
          userId,
          fullName: "",
          collegeId: remaining.collegeId,
          departmentId: remaining.departmentId,
        },
      });
    } else {
      await tx.profile.upsert({
        where: { userId },
        update: { collegeId: null, departmentId: null },
        create: {
          userId,
          fullName: "",
          collegeId: null,
          departmentId: null,
        },
      });
    }
  });

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return { id: educationId };
};

// ─── Update Operations ──────────────────────────────────────────────────────

export const updateEducation = async (
  userId: string,
  educationId: string,
  data: UpdateEducationData,
) => {
  const existing = await prisma.education.findFirst({
    where: { id: educationId, userId },
    select: { id: true, collegeId: true, departmentId: true, cgpa: true },
  });

  if (!existing) {
    throw new AppError("Education not found", 404);
  }

  const cgpaChanged = data.cgpa !== undefined && data.cgpa !== existing.cgpa;

  if (data.startYear && data.endYear && !data.current && data.endYear < data.startYear) {
    throw new AppError("End year cannot be before start year", 400);
  }

  const updateData: Record<string, any> = {};

  if (data.degree !== undefined) updateData.degree = data.degree;
  if (data.startYear !== undefined) updateData.startYear = data.startYear;

  if (data.current !== undefined) {
    updateData.current = data.current;
    if (data.current) {
      updateData.endYear = null;
      // Unset other current educations
      await prisma.education.updateMany({
        where: { userId, current: true, id: { not: educationId } },
        data: { current: false },
      });
    }
  }

  if (data.endYear !== undefined && !data.current) {
    updateData.endYear = data.endYear;
  }

  if (data.cgpa !== undefined) updateData.cgpa = data.cgpa;
  if (data.backlogs !== undefined) updateData.backlogs = data.backlogs;
  if (data.currentYear !== undefined) updateData.currentYear = data.currentYear;

  const result = await prisma.$transaction(async (tx) => {
    // Fetch full existing record for fallback fields
    const fullExisting = await tx.education.findUnique({
      where: { id: educationId },
      select: { fieldOfStudy: true, collegeId: true, departmentId: true },
    });

    const effectiveCollegeId = data.collegeId !== undefined ? data.collegeId : fullExisting?.collegeId;
    let finalDepartmentId = data.departmentId !== undefined ? data.departmentId : fullExisting?.departmentId;
    let finalFieldOfStudy = data.fieldOfStudy !== undefined ? data.fieldOfStudy : fullExisting?.fieldOfStudy;

    if (effectiveCollegeId) {
      if (
        data.collegeId !== undefined ||
        data.departmentId !== undefined ||
        data.fieldOfStudy !== undefined
      ) {
        const resolved = await resolveCollegeDepartment(
          tx,
          userId,
          effectiveCollegeId,
          data.departmentId !== undefined ? data.departmentId : fullExisting?.departmentId,
          data.fieldOfStudy !== undefined ? data.fieldOfStudy : fullExisting?.fieldOfStudy
        );
        finalDepartmentId = resolved.departmentId;
        finalFieldOfStudy = resolved.fieldOfStudy;
      }
    } else {
      finalDepartmentId = null;
      if (data.departmentId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.departmentId);
        if (isUuid) {
          const standardDept = await tx.standardDepartment.findUnique({
            where: { id: data.departmentId },
          });
          if (standardDept) {
            finalFieldOfStudy = standardDept.name;
          }
        } else {
          finalFieldOfStudy = data.departmentId;
        }
      } else if (data.fieldOfStudy !== undefined) {
        finalFieldOfStudy = data.fieldOfStudy;
      }
    }

    if (data.collegeId !== undefined) {
      if (data.collegeId) {
        const college = await tx.college.findUnique({
          where: { id: data.collegeId },
          select: { id: true },
        });
        if (!college) {
          throw new AppError("College not found", 404);
        }
      }
      updateData.collegeId = data.collegeId;
    }

    updateData.departmentId = finalDepartmentId;
    updateData.fieldOfStudy = finalFieldOfStudy;

    const res = await tx.education.update({
      where: { id: educationId },
      data: updateData,
      include: compactEducationInclude,
    });

    // Sync to user's profile
    await tx.profile.upsert({
      where: { userId },
      update: { collegeId: res.collegeId, departmentId: res.departmentId || null },
      create: {
        userId,
        fullName: "",
        collegeId: res.collegeId,
        departmentId: res.departmentId || null,
      },
    });

    await autoJoinUserCommunities(
      userId,
      {
        collegeId: res.collegeId,
        departmentId: res.departmentId,
      },
      tx,
    );

    return res;
  });

  // Fire-and-forget: notify college TPO admins when CGPA is updated
  if (cgpaChanged) {
    void notifyCgpaChange(userId, existing.collegeId, data.cgpa);
  }

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  try {
    await redis.del(`profile:${userId}`);
  } catch (err: any) {
    console.warn(`[Profile Cache] Invalidation failed for user ${userId}:`, err?.message || err);
  }

  return result;
};

// CGPA change TPO notification (called separately to avoid blocking transaction)
async function notifyCgpaChange(userId: string, collegeId: string | null | undefined, newCgpa: number | null | undefined) {
  if (!collegeId || newCgpa === null || newCgpa === undefined) return;
  try {
    const [admins, user] = await Promise.all([
      prisma.collegeAdmin.findMany({ where: { collegeId }, select: { userId: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { username: true, profile: { select: { fullName: true } } } }),
    ]);
    if (admins.length === 0) return;
    const studentName = user?.profile?.fullName || user?.username || "A student";
    await prisma.notification.createMany({
      data: admins.map((adm) => ({
        userId: adm.userId,
        actorId: userId,
        type: "SYSTEM",
        title: "Student CGPA Updated",
        message: `${studentName} has updated their CGPA to ${newCgpa}. Please review their placement eligibility.`,
        actionUrl: `/colleges/${collegeId}`,
      })),
    });
  } catch {
    // Non-critical — do not throw
  }
}

// ─── User Projects ──────────────────────────────────────────────────────────


export const verifyCollegeEmail = async (
  userId: string,
  educationId: string,
  collegeEmail: string,
  code?: string
) => {
  const education = await prisma.education.findFirst({
    where: { id: educationId, userId },
    include: { college: true },
  });

  if (!education) {
    throw new AppError("Education record not found", 404);
  }

  if (!education.collegeId) {
    throw new AppError("This education record is not linked to a registered college", 400);
  }

  const allowedDomains = education.college?.emailDomains || [];
  const parts = collegeEmail.split("@");
  const domain = parts[1]?.toLowerCase().trim();

  if (allowedDomains.length > 0 && !allowedDomains.some((d) => isDomainAllowed(domain, d))) {
    throw new AppError(`Email domain '${domain}' does not match any approved domains for ${education.college?.name || "your college"}.`, 400);
  }

  if (!code) {
    const codeVal = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `verification:college:${userId}:${educationId}`;
    await redis.setex(redisKey, 600, JSON.stringify({ email: collegeEmail, code: codeVal }));

    console.log(`[CollegeEmailVerification] Verification code for ${collegeEmail} is '${codeVal}'`);
    return {
      success: true,
      message: `A verification code has been sent to ${collegeEmail}. Please use the code to confirm.`,
    };
  }

  const redisKey = `verification:college:${userId}:${educationId}`;
  const storedData = await redis.get(redisKey);
  if (!storedData) {
    throw new AppError("Verification code expired or not requested. Please request a new code.", 400);
  }

  const { email: storedEmail, code: storedCode } = JSON.parse(storedData);
  if (storedEmail.toLowerCase().trim() !== collegeEmail.toLowerCase().trim() || storedCode !== code) {
    throw new AppError("Invalid verification code. Please try again.", 400);
  }

  await redis.del(redisKey);

  const updatedEducation = await prisma.$transaction(async (tx) => {
    const res = await tx.education.update({
      where: { id: educationId },
      data: {
        collegeEmail,
        collegeEmailVerified: true,
      },
    });

    await autoJoinUserCommunities(
      userId,
      {
        collegeId: res.collegeId,
        departmentId: res.departmentId,
      },
      tx
    );

    return res;
  });

  return {
    success: true,
    message: "College email verified successfully!",
    education: updatedEducation,
  };
};


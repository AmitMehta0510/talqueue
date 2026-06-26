import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import AppError from "shared/errors/AppError";
import {
  InterviewQueryParams,
  CreateInterviewResourceInput,
  UpdateInterviewResourceInput,
} from "./interviews.validation";

// ─── Redis cache configuration ────────────────────────────────────────────────

const CACHE_PREFIX = "interviews:page";
const CACHE_TTL_SECONDS = 60;

/**
 * Builds a deterministic, filter-keyed Redis cache key so each unique
 * combination of filters gets its own isolated cache slot.
 */
const buildCacheKey = (params: InterviewQueryParams): string => {
  const parts: string[] = [
    `p${params.page}`,
    `l${Math.min(params.limit, 50)}`,
  ];
  if (params.roleTag)    parts.push(`rt=${params.roleTag}`);
  if (params.difficulty) parts.push(`df=${params.difficulty}`);
  if (params.companyTag) parts.push(`ct=${params.companyTag}`);
  if (params.roundType)  parts.push(`rnd=${params.roundType}`);
  if (params.formatTag)  parts.push(`fmt=${params.formatTag}`);
  if (params.langTag)    parts.push(`lng=${params.langTag.toLowerCase().slice(0, 40)}`);
  if (params.search)     parts.push(`q=${params.search.trim().toLowerCase().slice(0, 60)}`);
  return `${CACHE_PREFIX}:${parts.join(":")}`;
};

/**
 * Invalidates ALL interview listing cache entries.
 * Called after seed/create/update/delete operations.
 */
export const invalidateInterviewCache = async (): Promise<void> => {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${CACHE_PREFIX}:*`,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error("[InterviewCache] Failed to invalidate cache:", err);
  }
};

// ─── Public listing ───────────────────────────────────────────────────────────

export const getInterviewResources = async (params: InterviewQueryParams) => {
  const cacheKey = buildCacheKey(params);

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const { page, limit, roleTag, difficulty, companyTag, roundType, formatTag, langTag, search } = params;
  const skip = (page - 1) * limit;

  const where: any = { isActive: true };

  if (roleTag)    where.roleTag    = roleTag;
  if (difficulty) where.difficulty = difficulty;
  if (companyTag) where.companyTag = companyTag;
  if (roundType)  where.roundType  = roundType;
  if (formatTag)  where.formatTag  = formatTag;
  if (langTag)    where.langTags   = { hasSome: [langTag] };
  if (search) {
    where.title = {
      contains: search.trim(),
      mode: "insensitive",
    };
  }

  const [data, total] = await prisma.$transaction([
    prisma.interviewResource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.interviewResource.count({ where }),
  ]);

  const result = {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  // Populate cache
  await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));

  return result;
};

// ─── Single resource ──────────────────────────────────────────────────────────

export const getInterviewResourceById = async (id: string) => {
  const resource = await prisma.interviewResource.findUnique({ where: { id } });
  if (!resource || !resource.isActive) {
    throw new AppError("Interview resource not found", 404);
  }
  return resource;
};

// ─── Save / Unsave (auth-gated toggle) ───────────────────────────────────────

export const toggleSaveInterviewResource = async (userId: string, resourceId: string) => {
  // Verify resource exists
  const resource = await prisma.interviewResource.findUnique({ where: { id: resourceId } });
  if (!resource || !resource.isActive) {
    throw new AppError("Interview resource not found", 404);
  }

  const existing = await prisma.savedInterviewResource.findUnique({
    where: { userId_resourceId: { userId, resourceId } },
  });

  if (existing) {
    await prisma.savedInterviewResource.delete({
      where: { userId_resourceId: { userId, resourceId } },
    });
    return { saved: false };
  }

  await prisma.savedInterviewResource.create({
    data: { userId, resourceId },
  });
  return { saved: true };
};

/**
 * Returns the set of resourceIds the given user has saved.
 * Used by the listing endpoint to annotate cards with a saved state.
 */
export const getSavedResourceIds = async (userId: string): Promise<Set<string>> => {
  const rows = await prisma.savedInterviewResource.findMany({
    where: { userId },
    select: { resourceId: true },
  });
  return new Set(rows.map((r) => r.resourceId));
};

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export const createInterviewResource = async (
  data: CreateInterviewResourceInput,
  adminUserId: string,
) => {
  const resource = await prisma.interviewResource.create({
    data: { ...data, addedById: adminUserId },
  });
  await invalidateInterviewCache();
  return resource;
};

export const updateInterviewResource = async (
  id: string,
  data: UpdateInterviewResourceInput,
) => {
  const existing = await prisma.interviewResource.findUnique({ where: { id } });
  if (!existing) throw new AppError("Interview resource not found", 404);

  const updated = await prisma.interviewResource.update({
    where: { id },
    data,
  });
  await invalidateInterviewCache();
  return updated;
};

export const deleteInterviewResource = async (id: string) => {
  const existing = await prisma.interviewResource.findUnique({ where: { id } });
  if (!existing) throw new AppError("Interview resource not found", 404);

  // Soft delete — preserve history and avoid orphaned saves
  await prisma.interviewResource.update({
    where: { id },
    data: { isActive: false },
  });
  await invalidateInterviewCache();
  return { deleted: true, id };
};

// ─── Seed (called by scraper/cron) ───────────────────────────────────────────

export type InterviewResourceSeedItem = CreateInterviewResourceInput;

/**
 * Upserts a batch of scraped/curated resources.
 * Keyed on `youtubeId` — safe to re-run multiple times.
 */
export const seedInterviewResources = async (
  items: InterviewResourceSeedItem[],
): Promise<{ created: number; updated: number }> => {
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const existing = await prisma.interviewResource.findUnique({
      where: { youtubeId: item.youtubeId },
    });

    if (existing) {
      await prisma.interviewResource.update({
        where: { youtubeId: item.youtubeId },
        data: { ...item, isActive: true },
      });
      updated++;
    } else {
      await prisma.interviewResource.create({ data: item });
      created++;
    }
  }

  await invalidateInterviewCache();
  return { created, updated };
};

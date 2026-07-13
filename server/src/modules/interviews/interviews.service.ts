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

// ─── Live Mock Interview Rooms & AI Evaluation ──────────────────────────────────

import { InterviewRoomStatus } from "@prisma/client";

async function callGeminiForInterview(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError("GEMINI_API_KEY environment variable is not configured.", 500);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(`AI API Request failed: ${errorText}`, 502);
  }

  const body: any = await response.json();
  const rawText = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  return rawText;
}

export const createInterviewRoom = async (userId: string, resourceId?: string) => {
  const room = await prisma.interviewRoom.create({
    data: {
      status: "SCHEDULED",
      hostId: userId,
      resourceId: resourceId || null,
      scheduledAt: new Date(),
    },
    include: {
      resource: true,
    },
  });

  return room;
};

export const getInterviewRooms = async (userId: string) => {
  return prisma.interviewRoom.findMany({
    where: {
      OR: [{ hostId: userId }, { guestId: userId }],
    },
    include: {
      resource: true,
      host: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
      guest: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getInterviewRoomDetail = async (roomId: string, userId: string) => {
  const room = await prisma.interviewRoom.findUnique({
    where: { id: roomId },
    include: {
      resource: true,
      host: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
      guest: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
    },
  });

  if (!room) {
    throw new AppError("Interview room not found.", 404);
  }

  if (room.hostId !== userId && room.guestId !== userId) {
    throw new AppError("Access denied. You are not a participant in this room.", 403);
  }

  return room;
};

export const evaluateInterviewRoom = async (
  roomId: string,
  userId: string,
  transcript: string,
  answers?: any,
) => {
  const room = await getInterviewRoomDetail(roomId, userId);

  const resourceTitle = room.resource?.title || "General Technical Interview";
  const resourceRole = room.resource?.roleTag || "SDE";

  const prompt = `You are an expert AI interviewer auditing a mock technical interview.
The interview topic/resource is: ${resourceTitle} (${resourceRole}).
Here is the raw text transcript/user answers of the session:
${transcript}
${answers ? `Additional questions/answers details:\n${JSON.stringify(answers, null, 2)}` : ""}

Review this session and grade the user. Your output must be a valid JSON object only. Do not wrap in markdown code blocks or add any other text outside the JSON.

Required JSON format:
{
  "score": 78,
  "technicalScore": 80,
  "communicationScore": 75,
  "feedback": "Detailed general summary of the candidate's performance...",
  "strengths": ["Excellent usage of standard parameters", "Clear algorithm setup"],
  "improvements": ["Needs to optimize space complexity", "Better structure in explanations"]
}
`;

  const rawResult = await callGeminiForInterview(prompt);
  // Clean markdown JSON wrapper if present
  const cleanedText = rawResult.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  try {
    const feedback = JSON.parse(cleanedText);

    // Save evaluation to database and mark room as completed
    const updatedRoom = await prisma.interviewRoom.update({
      where: { id: roomId },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        aiFeedback: feedback,
      },
      include: {
        resource: true,
      },
    });

    return updatedRoom;
  } catch (error) {
    console.error("Failed to parse Gemini interview response:", cleanedText);
    throw new AppError("Failed to parse AI evaluation feedback. Please try again.", 500);
  }
};


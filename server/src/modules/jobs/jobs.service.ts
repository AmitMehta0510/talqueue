import { Prisma } from "@prisma/client";
import prisma from "shared/database/prisma";
import { runJobScrape } from "modules/companies/scraper/job-scraper.service";
import { syncJobsToElasticBulk } from "services/elasticSync";
import { z } from "zod";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import { addReputation } from "modules/reputation/reputation.service";

import { createActivity } from "modules/activities/activity.service";

import { generateSlug } from "shared/utils/slugify";

import redis from "shared/database/redis";

// ─── Jobs listing Redis cache ────────────────────────────────────────────────
const JOBS_PAGE_CACHE_PREFIX = "jobs:page";
const JOBS_LISTING_TTL_SECONDS = 60;
const JOBS_AUTOCOMPLETE_TTL_SECONDS = 3600; // 1 hour

// Filter params accepted by getJobs
export interface JobsFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  workMode?: string[]; // e.g. ["REMOTE","ONSITE"]
  jobType?: string[];  // e.g. ["FULL_TIME","INTERNSHIP"]
  skills?: string[];   // e.g. ["React","Node.js"]
  location?: string[]; // e.g. ["Bengaluru"]
  freshness?: "24h" | "3d" | "7d" | "15d" | "30d" | null;
}

/**
 * Builds a stable, deterministic Redis cache key that encodes all active
 * filter params so each unique filter combination gets its own cache slot.
 */
const getJobsFilterCacheKey = (params: JobsFilterParams): string => {
  const p = params;
  const parts: string[] = [
    `p${p.page ?? 1}`,
    `l${Math.min(p.limit ?? 20, 50)}`,
  ];
  if (p.search)                  parts.push(`q=${p.search.trim().toLowerCase().slice(0, 60)}`);
  if (p.workMode?.length)        parts.push(`wm=${[...p.workMode].sort().join(",")}`);
  if (p.jobType?.length)         parts.push(`jt=${[...p.jobType].sort().join(",")}`);
  if (p.skills?.length)          parts.push(`sk=${[...p.skills].sort().join(",").slice(0, 120)}`);
  if (p.location?.length)        parts.push(`lo=${[...p.location].sort().join(",").slice(0, 120)}`);
  if (p.freshness)               parts.push(`fr=${p.freshness}`);
  return `${JOBS_PAGE_CACHE_PREFIX}:${parts.join(":")}`;
};

// Invalidates ALL jobs listing cache entries (called on create/archive/delete).
const invalidateJobsListingCache = async (): Promise<void> => {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${JOBS_PAGE_CACHE_PREFIX}:*`,
        "COUNT",
        100,
      );
      if (keys.length > 0) await redis.del(...keys);
      cursor = nextCursor;
    } while (cursor !== "0");
  } catch (err: any) {
    console.warn("[Jobs Cache] Cache invalidation failed:", err?.message || err);
  }
};

//
// HELPERS
//
const getOwnedJob = async (jobId: string, recruiterId: string) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,

      postedById: recruiterId,

      deletedAt: null,
    },

    select: {
      id: true,
    },
  });

  if (!job) {
    throw new AppError("Job not found or unauthorized", 404);
  }

  return job;
};

//
// CREATE JOB
//
export const createJob = async (userId: string, data: any) => {
  //
  // COMPANY
  //
  const company = await prisma.company.findUnique({
    where: {
      id: data.companyId,
    },

    select: {
      id: true,

      name: true,
    },
  });

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  //
  // COMPANY MEMBERSHIP CHECK
  // Recruiter must have a work experience at this company OR be a company admin
  //
  const [experienceRecord, adminRecord] = await Promise.all([
    prisma.experience.findFirst({
      where: { userId, companyId: company.id },
      select: { id: true },
    }),
    prisma.companyAdmin.findFirst({
      where: { userId, companyId: company.id },
      select: { id: true },
    }),
  ]);

  if (!experienceRecord && !adminRecord) {
    throw new AppError(
      "You can only post jobs for companies you are part of. Add this company to your work experience first.",
      403,
    );
  }

  //
  // FEATURED MUTATION SECURITY CHECK
  // Only platform admins or company admins for this company can set featured: true
  //
  if (data.featured === true) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: true,
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
    });
    const roleNames = new Set((user?.roles || []).map((r) => r.role.name));
    if (user?.primaryRole) {
      roleNames.add(user.primaryRole);
    }
    const isPlatformAdmin = roleNames.has("PLATFORM_ADMIN") || roleNames.has("SUPER_ADMIN");
    const isCompanyAdmin = !!adminRecord;

    if (!isPlatformAdmin && !isCompanyAdmin) {
      throw new AppError(
        "Only company administrators or platform administrators can post featured jobs",
        403,
      );
    }
  }


  //
  // SLUG
  //
  const baseSlug = generateSlug(`${data.title}-${company.name}`);

  const slug = `${baseSlug}-${Date.now()}`;

  //
  // CREATE JOB
  //
  const job = await prisma.job.create({
    data: {
      companyId: company.id,

      postedById: userId,

      title: data.title,

      slug,

      description: data.description,

      requirements: data.requirements,

      responsibilities: data.responsibilities,

      perks: data.perks,

      location: data.location,

      workMode: data.workMode,

      type: data.type,

      experienceLevel: data.experienceLevel,

      salaryMin: data.salaryMin,

      salaryMax: data.salaryMax,

      currency: data.currency || "INR",

      openings: data.openings,

      skillsRequired: data.skillsRequired || [],

      applicationDeadline: data.applicationDeadline
        ? new Date(data.applicationDeadline)
        : null,

      applyUrl: data.applyUrl,

      featured: data.featured || false,
    },

    select: {
      id: true,

      title: true,

      slug: true,

      companyId: true,

      createdAt: true,

      company: {
        select: {
          id: true,

          name: true,

          logoUrl: true,

          slug: true,
        },
      },
    },
  });

  // Sync to Elasticsearch
  syncJobsToElasticBulk([job.id]);

  // Invalidate all per-page job listing cache entries so the new job appears immediately
  invalidateJobsListingCache().catch(console.warn);

  //
  // ACTIVITY
  //
  createActivity(
    userId,

    "JOB_POSTED",

    "Created a new job",

    `Posted ${job.title} role at ${company.name}`,

    {
      jobId: job.id,
    },
  ).catch(console.error);

  //
  // REPUTATION
  //
  addReputation(
    userId,

    "JOB_POSTED",

    20,

    "Posted a job",

    {
      jobId: job.id,

      companyId: company.id,
    },
  ).catch(console.error);

  // Offload connection and employee notifications to background execution
  setImmediate(() => {
    Promise.all([
      prisma.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [
            {
              senderId: userId,
            },
            {
              receiverId: userId,
            },
          ],
        },
        select: {
          senderId: true,
          receiverId: true,
        },
      }),
      prisma.experience.findMany({
        where: {
          companyId: company.id,
          isCurrent: true,
        },
        select: {
          userId: true,
        },
      }),
    ])
      .then(([connections, employees]) => {
        const connectionNotifications = connections.map((connection) => {
          const targetUserId =
            connection.senderId === userId
              ? connection.receiverId
              : connection.senderId;

          return createNotification({
            userId: targetUserId,
            type: "SYSTEM",
            title: "New Job Posted",
            message: `${job.title} role posted at ${company.name}`,
          });
        });

        const employeeNotifications = employees
          .filter((employee) => employee.userId !== userId)
          .map((employee) =>
            createNotification({
              userId: employee.userId,
              type: "SYSTEM",
              title: "New Opening At Your Company",
              message: `${job.title} opening was posted at ${company.name}`,
            }),
          );

        return Promise.all([...connectionNotifications, ...employeeNotifications]);
      })
      .catch((error) => {
        console.error("[Job Notifications] Background notification dispatch failed:", error);
      });
  });

  return job;
};

//
// GET JOBS — server-side filtered, paginated
//
export const getJobs = async (params: JobsFilterParams = {}) => {
  const safeLimit = Math.min(params.limit ?? 20, 50);
  const safePage  = Math.max(params.page ?? 1, 1);
  const skip      = (safePage - 1) * safeLimit;
  const cacheKey  = getJobsFilterCacheKey({ ...params, page: safePage, limit: safeLimit });

  // ── Cache-aside: filter-aware key ────────────────────────────────────────
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (cacheErr: any) {
    console.warn("[Jobs Cache] Redis read failed, falling back to Prisma:", cacheErr?.message || cacheErr);
  }

  // ── Build Prisma where clause from active filters ─────────────────────────
  const where: Prisma.JobWhereInput = { status: "OPEN", deletedAt: null };

  // Full-text search across title, description, company name via subquery
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    where.OR = [
      { title:       { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { company:     { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  // Work mode filter (multi-select)
  if (params.workMode?.length) {
    where.workMode = { in: params.workMode as any };
  }

  // Job type filter (multi-select)
  if (params.jobType?.length) {
    where.type = { in: params.jobType as any };
  }

  // Skills filter — job must contain at least one of the selected skills
  if (params.skills?.length) {
    where.skillsRequired = { hasSome: params.skills };
  }

  // Location filter (multi-select, case-insensitive substring match)
  if (params.location?.length) {
    where.OR = [
      ...(where.OR ?? []),
      ...params.location.map((loc) => ({
        location: { contains: loc, mode: "insensitive" as const },
      })),
    ];
    // When location filter is combined with other ORs from search, we need
    // to restructure: wrap search ORs in AND + location OR.
    if (params.search?.trim() && params.location.length) {
      const searchOr = [
        { title:       { contains: params.search.trim(), mode: "insensitive" as const } },
        { description: { contains: params.search.trim(), mode: "insensitive" as const } },
        { company:     { name: { contains: params.search.trim(), mode: "insensitive" as const } } },
      ];
      const locationOr = params.location.map((loc) => ({
        location: { contains: loc, mode: "insensitive" as const },
      }));
      delete where.OR;
      (where as any).AND = [
        { OR: searchOr },
        { OR: locationOr },
      ];
    } else if (params.location.length) {
      where.OR = params.location.map((loc) => ({
        location: { contains: loc, mode: "insensitive" as const },
      }));
    }
  }

  // Freshness filter — compare against postedAt (ATS source date), fallback to createdAt
  if (params.freshness) {
    const freshnessMap: Record<string, number> = {
      "24h":  1,
      "3d":   3,
      "7d":   7,
      "15d": 15,
      "30d": 30,
    };
    const days = freshnessMap[params.freshness];
    if (days) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      // Use postedAt if set (ATS source date), otherwise fall back to createdAt.
      // We check: (postedAt >= cutoff) OR (postedAt is null AND createdAt >= cutoff)
      (where as any).AND = [
        ...((where as any).AND ?? []),
        {
          OR: [
            { postedAt: { gte: cutoff, not: null } },
            { AND: [{ postedAt: null }, { createdAt: { gte: cutoff } }] },
          ],
        },
      ];
    }
  }

  // ── DB-level pagination (LIMIT/OFFSET pushed to Postgres) ─────────────────
  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        location: true,
        workMode: true,
        type: true,
        experienceLevel: true,
        salaryMin: true,
        salaryMax: true,
        createdAt: true,
        postedAt: true,
        featured: true,
        description: true,
        requirements: true,
        responsibilities: true,
        perks: true,
        skillsRequired: true,
        applyUrl: true,
        currency: true,
        openings: true,
        applicationsCount: true,
        company: {
          select: { id: true, name: true, logoUrl: true, verified: true, slug: true },
        },
      },
      orderBy: [
        { featured: "desc" },
        { postedAt: "desc" },
        { createdAt: "desc" },
      ],
      skip,
      take: safeLimit,
    }),
  ]);

  const result = {
    jobs,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };

  // Populate cache — do not block the HTTP response
  redis
    .setex(cacheKey, JOBS_LISTING_TTL_SECONDS, JSON.stringify(result))
    .catch((err: any) => {
      console.warn("[Jobs Cache] Failed to populate listing cache:", err?.message || err);
    });

  return result;
};

// ─── SKILLS AUTOCOMPLETE ──────────────────────────────────────────────────────

/**
 * Returns a deduplicated list of skill strings from active jobs that match
 * the query prefix. Results are cached in Redis for 1 hour to avoid
 * repeated expensive array-unnest queries.
 *
 * Implementation uses a two-level cache:
 *  1. If full warm list exists in Redis → filter in-memory (O(n) over strings).
 *  2. Otherwise → raw SQL unnest → cache result.
 */
export const getJobSkillsAutocomplete = async (
  q: string,
  limit = 15,
): Promise<string[]> => {
  const warmKey = "jobs:skills:all";
  const safeLimit = Math.min(limit, 50);

  // Try warm list first
  try {
    const warm = await redis.get(warmKey);
    if (warm) {
      const all: string[] = JSON.parse(warm);
      const lower = q.toLowerCase();
      return all
        .filter((s) => s.toLowerCase().includes(lower))
        .slice(0, safeLimit);
    }
  } catch { /* fall through to DB */ }

  // Warm list missing → fetch all unique skills from DB via raw SQL unnest
  const rows = await prisma.$queryRaw<{ skill: string }[]>`
    SELECT DISTINCT UNNEST("skillsRequired") AS skill
    FROM "Job"
    WHERE status = 'OPEN' AND "deletedAt" IS NULL
    ORDER BY skill
  `;
  const all = rows.map((r) => r.skill).filter(Boolean);

  // Populate warm list (non-blocking)
  redis
    .setex(warmKey, JOBS_AUTOCOMPLETE_TTL_SECONDS, JSON.stringify(all))
    .catch((err: any) =>
      console.warn("[Jobs Cache] Failed to cache skills list:", err?.message || err),
    );

  const lower = q.toLowerCase();
  return all
    .filter((s) => s.toLowerCase().includes(lower))
    .slice(0, safeLimit);
};

// ─── LOCATIONS AUTOCOMPLETE ──────────────────────────────────────────────────

/**
 * Returns a deduplicated list of unique location strings from active jobs
 * that contain the query string. Redis-cached for 1 hour.
 */
export const getJobLocationsAutocomplete = async (
  q: string,
  limit = 15,
): Promise<string[]> => {
  const warmKey = "jobs:locations:all";
  const safeLimit = Math.min(limit, 50);

  // Try warm list first
  try {
    const warm = await redis.get(warmKey);
    if (warm) {
      const all: string[] = JSON.parse(warm);
      const lower = q.toLowerCase();
      return all
        .filter((l) => l.toLowerCase().includes(lower))
        .slice(0, safeLimit);
    }
  } catch { /* fall through to DB */ }

  // Warm list missing → fetch all unique locations from DB
  const rows = await prisma.$queryRaw<{ location: string }[]>`
    SELECT DISTINCT "location"
    FROM "Job"
    WHERE status = 'OPEN'
      AND "deletedAt" IS NULL
      AND "location" IS NOT NULL
      AND "location" <> ''
    ORDER BY "location"
  `;
  const all = rows.map((r) => r.location).filter(Boolean);

  // Populate warm list (non-blocking)
  redis
    .setex(warmKey, JOBS_AUTOCOMPLETE_TTL_SECONDS, JSON.stringify(all))
    .catch((err: any) =>
      console.warn("[Jobs Cache] Failed to cache locations list:", err?.message || err),
    );

  const lower = q.toLowerCase();
  return all
    .filter((l) => l.toLowerCase().includes(lower))
    .slice(0, safeLimit);
};

//
// GET JOB BY SLUG
//
export const getJobBySlug = async (slug: string) => {
  const job = await prisma.job.findUnique({
    where: {
      slug,
    },

    select: {
      id: true,

      title: true,

      slug: true,

      description: true,

      requirements: true,

      responsibilities: true,

      perks: true,

      location: true,

      workMode: true,

      type: true,

      experienceLevel: true,

      salaryMin: true,

      salaryMax: true,

      currency: true,

      openings: true,

      skillsRequired: true,

      views: true,

      applicationsCount: true,

      createdAt: true,

      company: {
        select: {
          id: true,

          name: true,

          logoUrl: true,

          verified: true,

          websiteUrl: true,

          slug: true,
        },
      },

      postedBy: {
        select: {
          id: true,

          username: true,

          profile: {
            select: {
              fullName: true,

              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  //
  // NON BLOCKING VIEW UPDATE
  //
  prisma.job
    .update({
      where: {
        id: job.id,
      },

      data: {
        views: {
          increment: 1,
        },
      },
    })
    .catch(console.error);

  return job;
};

//
// COMPANY JOBS
//
export const getCompanyJobs = async (
  companyId: string,

  page = 1,

  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;

  const [total, jobs] = await Promise.all([
    prisma.job.count({
      where: {
        companyId,
        status: "OPEN",
        deletedAt: null,
      },
    }),
    prisma.job.findMany({
      where: {
        companyId,

        status: "OPEN",

        deletedAt: null,
      },

      select: {
        id: true,

        title: true,

        slug: true,

        location: true,

        type: true,

        workMode: true,

        experienceLevel: true,

        createdAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      skip,

      take: safeLimit,
    }),
  ]);

  return {
    jobs,
    total,
    page,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };
};

//
// RECRUITER JOBS
//
export const getRecruiterJobs = async (
  userId: string,

  page = 1,

  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);

  return prisma.job.findMany({
    where: {
      postedById: userId,

      deletedAt: null,
    },

    select: {
      id: true,

      title: true,

      slug: true,

      status: true,

      views: true,

      applicationsCount: true,

      createdAt: true,

      company: {
        select: {
          id: true,

          name: true,

          logoUrl: true,

          slug: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    skip: (page - 1) * safeLimit,

    take: safeLimit,
  });
};

//
// ARCHIVE JOB
//
export const archiveJob = async (
  recruiterId: string,

  jobId: string,
) => {
  await getOwnedJob(jobId, recruiterId);

  const job = await prisma.job.update({
    where: {
      id: jobId,
    },

    data: {
      status: "ARCHIVED",

      archivedAt: new Date(),
    },
  });

  // Invalidate all per-page job listing cache entries
  invalidateJobsListingCache().catch(console.warn);

  //
  // ACTIVITY
  //
  createActivity(
    recruiterId,

    "JOB_ARCHIVED",

    "Archived a job",

    "Archived a job posting",

    {
      jobId,
    },
  ).catch(console.error);

  return job;
};


// DELETE JOB
//
export const deleteJob = async (
  recruiterId: string,

  jobId: string,
) => {
  await getOwnedJob(jobId, recruiterId);

  const job = await prisma.job.update({
    where: {
      id: jobId,
    },

    data: {
      status: "DELETED",

      deletedAt: new Date(),
    },
  });

  // Invalidate all per-page job listing cache entries
  invalidateJobsListingCache().catch(console.warn);

  //
  // REPUTATION
  //
  addReputation(
    recruiterId,

    "JOB_DELETED",

    -10,

    "Deleted job posting",

    {
      jobId,
    },
  ).catch(console.error);

  //
  // ACTIVITY
  //
  createActivity(
    recruiterId,

    "JOB_DELETED",

    "Deleted a job",

    "Removed a job posting",

    {
      jobId,
    },
  ).catch(console.error);

  return job;
};
const requestCompanyAndCreateJobSchema = z.object({
  companyName: z.string().min(2).max(100),
  title: z.string().min(2).max(100),
  description: z.string().min(10).max(5000),
  requirements: z.string().max(5000).optional().nullable(),
  responsibilities: z.string().max(5000).optional().nullable(),
  perks: z.string().max(5000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional().nullable(),
  type: z.enum(["FULL_TIME", "INTERNSHIP", "PART_TIME", "CONTRACT", "FREELANCE"]),
  experienceLevel: z.string().max(100).optional().nullable(),
  salaryMin: z.number().int().nonnegative().optional().nullable(),
  salaryMax: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  openings: z.number().int().positive().max(1000).optional().nullable(),
  skillsRequired: z.array(z.string().max(50)).max(20).default([]),
  applicationDeadline: z.string().optional().nullable(),
  applyUrl: z.string().max(512).optional().nullable(),
  featured: z.boolean().optional().default(false),
});

// REQUEST COMPANY AND CREATE JOB (pending admin approval)
//
export const requestCompanyAndCreateJob = async (
  userId: string,
  data: any,
) => {
  const validated = requestCompanyAndCreateJobSchema.safeParse(data);
  if (!validated.success) {
    throw new AppError(
      `Invalid request data: ${validated.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ")}`,
      400,
    );
  }
  const validatedData = validated.data;

  // Store the entire job payload for later posting
  const pendingJobData = {
    title: validatedData.title,
    description: validatedData.description,
    requirements: validatedData.requirements,
    responsibilities: validatedData.responsibilities,
    location: validatedData.location,
    workMode: validatedData.workMode,
    type: validatedData.type,
    experienceLevel: validatedData.experienceLevel,
    salaryMin: validatedData.salaryMin,
    salaryMax: validatedData.salaryMax,
    currency: validatedData.currency || "INR",
    openings: validatedData.openings,
    skillsRequired: validatedData.skillsRequired,
    applicationDeadline: validatedData.applicationDeadline,
    applyUrl: validatedData.applyUrl,
    featured: false, // Force false for requested company pending approval
  };

  const request = await prisma.companyRequest.create({
    data: {
      requestedById: userId,
      companyName: validatedData.companyName,
      pendingJobData,
    },
    select: {
      id: true,
      companyName: true,
      status: true,
      createdAt: true,
    },
  });

  return {
    pending: true,
    requestId: request.id,
    message: `Company "${validatedData.companyName}" is pending admin verification. Your job will be posted automatically once approved.`,
  };
};

const assertIsPlatformAdmin = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryRole: true,
      roles: {
        select: { role: { select: { name: true } } },
      },
    },
  });
  const roleNames = new Set((user?.roles || []).map((r) => r.role.name));
  if (user?.primaryRole) {
    roleNames.add(user.primaryRole);
  }
  const isPlatformAdmin = roleNames.has("PLATFORM_ADMIN") || roleNames.has("SUPER_ADMIN");
  if (!isPlatformAdmin) {
    throw new AppError("Only the platform administrator (PLATFORM_ADMIN) can seed jobs", 403);
  }
};

//
// SEED JOBS
//
export const seedJobs = async (userId: string) => {
  await assertIsPlatformAdmin(userId);
  return await runJobScrape();
};


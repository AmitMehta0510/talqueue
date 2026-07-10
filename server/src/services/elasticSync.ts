import prisma from "shared/database/prisma";
import elasticClient from "./elasticClient";

/**
 * Synchronizes a hackathon record to Elasticsearch.
 * Fetches the record from PostgreSQL and upserts it into the 'hackathons' index.
 * Fail-soft: Logs indexing errors but does not reject or throw.
 */
export function syncHackathonToElastic(hackathonId: string): void {
  prisma.hackathon
    .findUnique({
      where: { id: hackathonId },
    })
    .then(async (hackathon) => {
      if (!hackathon) {
        console.warn(`[ES Sync] Hackathon with ID '${hackathonId}' not found. Skipping sync.`);
        return;
      }
      
      // If deleted, we should clean it up or mark it as deleted in ES
      if (hackathon.deletedAt || hackathon.status === "DELETED") {
        try {
          await elasticClient.delete({
            index: "hackathons",
            id: hackathon.id,
          });
          console.log(`[ES Sync] Deleted hackathon '${hackathon.id}' from Elasticsearch index.`);
        } catch (delErr: any) {
          // If document was not found, it's fine
          if (delErr?.meta?.statusCode !== 404) {
            console.error(`[ES Sync] Failed to delete hackathon '${hackathon.id}' from ES:`, delErr?.message || delErr);
          }
        }
        return;
      }

      await elasticClient.index({
        index: "hackathons",
        id: hackathon.id,
        document: {
          title: hackathon.title,
          description: hackathon.description,
          shortDescription: hackathon.shortDescription,
          organizerName: hackathon.organizerName,
          status: hackathon.status,
          mode: hackathon.mode,
          location: hackathon.location,
          difficultyLevel: hackathon.difficultyLevel,
          tags: hackathon.tags || [],
          createdAt: hackathon.createdAt,
          startDate: hackathon.startDate,
          endDate: hackathon.endDate,
        },
      });
      console.log(`[ES Sync] Successfully synced hackathon '${hackathon.title}' (${hackathon.id}) to Elasticsearch.`);
    })
    .catch((error) => {
      console.error(`[ES Sync] Failed to sync hackathon '${hackathonId}' to Elasticsearch:`, error?.message || error);
    });
}

/**
 * Synchronizes multiple hackathon records to Elasticsearch in bulk.
 * Fetches the records from PostgreSQL and upserts or deletes them in the 'hackathons' index.
 */
export async function syncHackathonsToElasticBulk(hackathonIds: string[]): Promise<void> {
  if (!hackathonIds || hackathonIds.length === 0) return;

  const uniqueIds = Array.from(new Set(hackathonIds));

  try {
    const hackathons = await prisma.hackathon.findMany({
      where: {
        id: { in: uniqueIds },
      },
    });

    const hackathonsMap = new Map<string, any>();
    for (const h of hackathons) {
      hackathonsMap.set(h.id, h);
    }

    const operations: any[] = [];

    for (const id of uniqueIds) {
      const h = hackathonsMap.get(id);
      if (!h || h.deletedAt || h.status === "DELETED") {
        operations.push({ delete: { _index: "hackathons", _id: id } });
      } else {
        operations.push({ index: { _index: "hackathons", _id: id } });
        operations.push({
          title: h.title,
          description: h.description,
          shortDescription: h.shortDescription,
          organizerName: h.organizerName,
          status: h.status,
          mode: h.mode,
          location: h.location,
          difficultyLevel: h.difficultyLevel,
          tags: h.tags || [],
          createdAt: h.createdAt,
          startDate: h.startDate,
          endDate: h.endDate,
        });
      }
    }

    if (operations.length === 0) return;

    console.log(`[ES Sync] Flushing bulk of ${operations.length} operations to Elasticsearch...`);
    const response = await elasticClient.bulk({ operations });

    if (response.errors) {
      console.error("[ES Sync] Bulk sync errors occurred for hackathons:");
      if (response.items) {
        for (const item of response.items) {
          const action = Object.keys(item)[0];
          const result = (item as any)[action];
          if (result && result.error) {
            console.error(`  - Failed action for ID '${result._id}':`, result.error);
          }
        }
      }
    } else {
      console.log(`[ES Sync] Successfully synced bulk hackathons to Elasticsearch.`);
    }
  } catch (error: any) {
    console.error("[ES Sync] Elasticsearch bulk sync failed:", error?.message || error);
  }
}

/**
 * Synchronizes a job record to Elasticsearch.
 * Fetches the record and its company name from PostgreSQL and upserts it into the 'jobs' index.
 * Fail-soft: Logs indexing errors but does not reject or throw.
 */
export function syncJobToElastic(jobId: string): void {
  prisma.job
    .findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            name: true,
            isPromoted: true,
            _count: {
              select: {
                adPlacements: { where: { isActive: true, expiresAt: { gt: new Date() } } },
              },
            },
          },
        },
      },
    })
    .then(async (job) => {
      if (!job) {
        console.warn(`[ES Sync] Job with ID '${jobId}' not found. Skipping sync.`);
        return;
      }

      // If deleted, we should clean it up or mark it as deleted in ES
      if (job.deletedAt || job.status === "DELETED") {
        try {
          await elasticClient.delete({
            index: "jobs",
            id: job.id,
          });
          console.log(`[ES Sync] Deleted job '${job.id}' from Elasticsearch index.`);
        } catch (delErr: any) {
          // If document was not found, it's fine
          if (delErr?.meta?.statusCode !== 404) {
            console.error(`[ES Sync] Failed to delete job '${job.id}' from ES:`, delErr?.message || delErr);
          }
        }
        return;
      }

      const isPromoted: boolean = job.company?.isPromoted ?? false;
      const hasActiveAd: boolean = (job.company?._count?.adPlacements ?? 0) > 0;

      await elasticClient.index({
        index: "jobs",
        id: job.id,
        document: buildJobDocument(job, isPromoted, hasActiveAd),
      });
      console.log(`[ES Sync] Successfully synced job '${job.title}' (${job.id}) to Elasticsearch.`);
    })
    .catch((error) => {
      console.error(`[ES Sync] Failed to sync job '${jobId}' to Elasticsearch:`, error?.message || error);
    });
}

/**
 * Synchronizes multiple job records to Elasticsearch in bulk.
 * Fetches the records and their company names from PostgreSQL and upserts or deletes them in the 'jobs' index.
 */
export async function syncJobsToElasticBulk(jobIds: string[]): Promise<void> {
  if (!jobIds || jobIds.length === 0) return;

  const uniqueIds = Array.from(new Set(jobIds));

  try {
    const jobs = await prisma.job.findMany({
      where: {
        id: { in: uniqueIds },
      },
      include: {
        company: {
          select: {
            name: true,
            isPromoted: true,
            _count: {
              select: {
                adPlacements: { where: { isActive: true, expiresAt: { gt: new Date() } } },
              },
            },
          },
        },
      },
    });

    const jobsMap = new Map<string, any>();
    for (const j of jobs) {
      jobsMap.set(j.id, j);
    }

    const operations: any[] = [];

    for (const id of uniqueIds) {
      const j = jobsMap.get(id);
      if (!j || j.deletedAt || j.status === "DELETED") {
        operations.push({ delete: { _index: "jobs", _id: id } });
      } else {
        const isPromoted: boolean = j.company?.isPromoted ?? false;
        const hasActiveAd: boolean = (j.company?._count?.adPlacements ?? 0) > 0;

        operations.push({ index: { _index: "jobs", _id: id } });
        operations.push(buildJobDocument(j, isPromoted, hasActiveAd));
      }
    }

    if (operations.length === 0) return;

    console.log(`[ES Sync] Flushing bulk of ${operations.length} operations to Elasticsearch for jobs...`);
    const response = await elasticClient.bulk({ operations });

    if (response.errors) {
      console.error("[ES Sync] Bulk sync errors occurred for jobs:");
      if (response.items) {
        for (const item of response.items) {
          const action = Object.keys(item)[0];
          const result = (item as any)[action];
          if (result && result.error) {
            console.error(`  - Failed action for ID '${result._id}':`, result.error);
          }
        }
      }
    } else {
      console.log(`[ES Sync] Successfully synced bulk jobs to Elasticsearch.`);
    }
  } catch (error: any) {
    console.error("[ES Sync] Elasticsearch bulk sync failed for jobs:", error?.message || error);
  }
}

/**
 * Builds the Elasticsearch document for a job record.
 * Shared by both single and bulk sync functions to avoid duplication.
 * Indexes all pipeline v2 structured fields for rich filtering and search.
 */
function buildJobDocument(job: any, isPromoted: boolean, hasActiveAd: boolean): Record<string, any> {
  // Deserialize techStackJson if stored as JSON string
  let techStack: any = null;
  if (job.techStackJson) {
    try {
      techStack = typeof job.techStackJson === "string"
        ? JSON.parse(job.techStackJson)
        : job.techStackJson;
    } catch { techStack = null; }
  }

  return {
    // ── Core fields (backward-compatible with v1 consumers) ─────────────────
    title:            job.title,
    description:      job.description,
    companyName:      job.company?.name || job.companyName || "Unknown Company",
    requirements:     job.requirements,
    responsibilities: job.responsibilities,
    benefits:         job.perks,
    status:           job.status,
    type:             job.type,
    workMode:         job.workMode,
    location:         job.location,
    experienceLevel:  job.experienceLevel,
    salaryMin:        job.salaryMin,
    salaryMax:        job.salaryMax,
    ppoOffered:       job.ppoOffered,
    featured:         job.featured,
    atsSource:        job.atsSource,
    createdAt:        job.createdAt,
    postedAt:         job.postedAt,
    isPromoted,
    hasActiveAd,

    // ── Pipeline v2 skill fields ─────────────────────────────────────────────
    requiredSkills:   job.skillsRequired || [],    // v2 alias in ES mapping
    preferredSkills:  job.preferredSkills || [],
    techStack:        techStack,

    // ── Pipeline v2 location fields ──────────────────────────────────────────
    locationCity:         job.locationCity ?? null,
    locationState:        job.locationState ?? null,
    locationCountry:      job.locationCountry ?? null,
    locationCountryCode:  job.locationCountryCode ?? null,
    visaSponsorship:      job.visaSponsorship ?? null,
    relocationAssistance: job.relocationAssistance ?? null,

    // ── Pipeline v2 experience fields ────────────────────────────────────────
    experienceMinYears:   job.experienceMinYears ?? null,
    experienceMaxYears:   job.experienceMaxYears ?? null,

    // ── Pipeline v2 education fields ─────────────────────────────────────────
    educationDegree:      job.educationDegree ?? null,

    // ── Pipeline v2 compensation fields ─────────────────────────────────────
    currency:     job.currency ?? null,
    salaryPeriod: job.salaryPeriod ?? "annual",

    // ── Pipeline v2 provenance fields ────────────────────────────────────────
    parserConfidence:  job.parserConfidence ?? null,
    needsLLMReview:    job.needsLLMReview ?? false,
    pipelineVersion:   job.pipelineVersion ?? "1.0.0",
  };
}

/**
 * Synchronizes a project record to Elasticsearch (Stub / Placeholder).
 * Fail-soft: Logs indexing errors but does not reject or throw.
 */
export function syncProjectToElastic(projectId: string): void {
  try {
    console.log(`[ES Sync] syncProjectToElastic called for project ID '${projectId}' (Stub)`);
  } catch (error: any) {
    console.error(`[ES Sync] Failed to sync project '${projectId}' to Elasticsearch:`, error?.message || error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER SYNC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Elasticsearch document for a user from a Prisma user record.
 * All skill names are lowercased so keyword filter matching is case-insensitive.
 */
function buildUserEsDocument(user: any): Record<string, unknown> {
  const profile = user.profile ?? {};
  const skills: string[] = (user.skills ?? [])
    .map((s: any) => s.skill?.name?.toLowerCase())
    .filter(Boolean);

  return {
    fullName:              profile.fullName ?? null,
    username:              user.username,
    bio:                   profile.bio ?? null,
    headline:              profile.headline ?? null,

    skills,
    primaryRole:           user.primaryRole ?? null,
    trustLevel:            user.trustLevel,
    collegeId:             profile.collegeId ?? null,
    collegeName:           profile.college?.name ?? null,
    departmentId:          profile.departmentId ?? null,
    country:               profile.country ?? null,
    location:              profile.location ?? null,
    graduationYear:        profile.graduationYear ?? null,

    openToWork:            user.openToWork,
    openToInternship:      user.openToInternship,
    acceptingCollaborators: user.acceptingCollaborators,
    acceptingReferrals:    user.acceptingReferrals,
    searchVisibility:      user.searchVisibility,

    engineeringScore:      user.engineeringScore,
    reputationScore:       user.reputationScore,
    searchScore:           user.searchScore,

    lastActiveAt:          user.lastActiveAt ?? null,
    createdAt:             user.createdAt,
  };
}

/**
 * Fire-and-forget single-user sync to the Elasticsearch `users` index.
 * Called after profile update, skill change, trust level change, etc.
 *
 * Soft-deletes: if the user's searchVisibility is false the document is
 * still indexed (so it can be re-shown when they toggle back), but the
 * search query always filters `searchVisibility: true`.
 */
export function syncUserToElastic(userId: string): void {
  prisma.user
    .findUnique({
      where: { id: userId },
      include: {
        profile: { include: { college: true, department: true } },
        skills:  { include: { skill: true } },
      },
    })
    .then(async (user) => {
      if (!user) {
        // User deleted — remove from index
        try {
          await elasticClient.delete({ index: "users", id: userId });
        } catch (delErr: any) {
          if (delErr?.meta?.statusCode !== 404) {
            console.error(`[ES Sync] Failed to delete user '${userId}' from ES:`, delErr?.message);
          }
        }
        return;
      }

      await elasticClient.index({
        index:    "users",
        id:       userId,
        document: buildUserEsDocument(user),
      });
    })
    .catch((err) => {
      console.error(`[ES Sync] Failed to sync user '${userId}' to Elasticsearch:`, err?.message || err);
    });
}

/**
 * Bulk-syncs an array of user IDs to Elasticsearch.
 * Used by the admin backfill endpoint and the first-time index job.
 */
export async function syncUsersToElasticBulk(userIds: string[]): Promise<void> {
  if (!userIds.length) return;

  const uniqueIds = Array.from(new Set(userIds));

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      profile: { include: { college: true, department: true } },
      skills:  { include: { skill: true } },
    },
  });

  if (!users.length) return;

  // Build Elasticsearch bulk request body
  const operations: unknown[] = [];
  for (const user of users) {
    operations.push({ index: { _index: "users", _id: user.id } });
    operations.push(buildUserEsDocument(user));
  }

  try {
    const result = await elasticClient.bulk({ operations, refresh: false });
    const errored = result.items.filter((item: any) => item.index?.error);
    if (errored.length) {
      console.error(`[ES Sync] ${errored.length}/${users.length} user bulk-index errors:`, errored[0]);
    } else {
      console.log(`[ES Sync] Bulk-indexed ${users.length} users successfully.`);
    }
  } catch (err: any) {
    console.error("[ES Sync] User bulk-index failed:", err?.message || err);
  }
}

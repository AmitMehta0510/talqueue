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
          select: { name: true },
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

      await elasticClient.index({
        index: "jobs",
        id: job.id,
        document: {
          title: job.title,
          description: job.description,
          companyName: job.company?.name || "Unknown Company",
          requirements: job.requirements,
          status: job.status,
          type: job.type,
          workMode: job.workMode,
          location: job.location,
          experienceLevel: job.experienceLevel,
          skillsRequired: job.skillsRequired || [],
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          ppoOffered: job.ppoOffered,
          featured: job.featured,
          createdAt: job.createdAt,
        },
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
          select: { name: true },
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
        operations.push({ index: { _index: "jobs", _id: id } });
        operations.push({
          title: j.title,
          description: j.description,
          companyName: j.company?.name || "Unknown Company",
          requirements: j.requirements,
          status: j.status,
          type: j.type,
          workMode: j.workMode,
          location: j.location,
          experienceLevel: j.experienceLevel,
          skillsRequired: j.skillsRequired || [],
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          ppoOffered: j.ppoOffered,
          featured: j.featured,
          createdAt: j.createdAt,
        });
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


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

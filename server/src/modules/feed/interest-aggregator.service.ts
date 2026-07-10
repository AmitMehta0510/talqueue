/**
 * @file modules/feed/interest-aggregator.service.ts
 *
 * Aggregates FeedInteraction signals into UserInterestProfile.
 *
 * UserInterestProfile already exists as a Prisma model. This service is the
 * write path — it was previously NEVER written to. After this change:
 *
 *   FeedInteraction rows (raw signals)
 *     └─ aggregateInterestProfile(userId)
 *         └─ UserInterestProfile (materialized aggregates)
 *             └─ buildFeedContext() reads it → feed-ai-ranking uses it
 *
 * Aggregation windows:
 *   - Looks at interactions from the last 30 days (configurable)
 *   - Weights recent interactions more heavily (decay by recency bucket)
 *
 * Called by:
 *   - interest-aggregator.cron.ts: Daily batch for all active users
 *   - FeedInteraction endpoint: Enqueued via BullMQ after user action (debounced)
 */

import prisma from "shared/database/prisma";
import logger from "shared/logger";

// ─── Config ──────────────────────────────────────────────────────────────────

const WINDOW_DAYS      = 30;
const MAX_INTERACTIONS = 500; // max rows to read per user per aggregation

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise a string array from a Json? Prisma column */
function parseJsonArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string");
  return [];
}

/** Weighted counter — closer interactions count more */
function buildWeightedCounter(items: { value: string; weight: number }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { value, weight } of items) {
    counts[value] = (counts[value] || 0) + weight;
  }
  return counts;
}

/** Top N entries sorted by score descending */
function topN(counter: Record<string, number>, n = 10): string[] {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

// ─── Core aggregation ─────────────────────────────────────────────────────────

/**
 * Aggregates the last 30 days of FeedInteraction rows for a user into
 * a materialized UserInterestProfile record. Upserts (create or update).
 *
 * @returns true if the profile was written, false on no-op / error.
 */
export async function aggregateInterestProfile(userId: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const interactions = await prisma.feedInteraction.findMany({
      where:   { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take:    MAX_INTERACTIONS,
      select: {
        targetType:      true,
        targetId:        true,
        interactionType: true,
        duration:        true,
        createdAt:       true,
      },
    });

    if (!interactions.length) return false;

    // ── Recency decay weight ──────────────────────────────────────────────────
    // Interactions are sorted DESC by createdAt (most recent first).
    // We assign higher weight to more recent interactions.
    const now = Date.now();
    const weightedItems = interactions.map((ix) => {
      const ageMs    = now - new Date(ix.createdAt).getTime();
      const ageDays  = ageMs / (1000 * 60 * 60 * 24);
      // Linear decay: weight = 1.0 at day 0, 0.1 at day 30
      const weight   = Math.max(0.1, 1.0 - (ageDays / WINDOW_DAYS) * 0.9);
      return { ix, weight };
    });

    // ── Skill interest (from JOB interactions) ────────────────────────────────
    const jobIds = interactions
      .filter((ix) => ix.targetType === "JOB")
      .map((ix) => ix.targetId);

    let interestedSkills: string[] = [];
    if (jobIds.length > 0) {
      const jobs = await prisma.job.findMany({
        where:  { id: { in: [...new Set(jobIds)] } },
        select: { id: true, skillsRequired: true },
      });
      const jobSkillMap = new Map(jobs.map((j) => [j.id, j.skillsRequired]));

      const skillWeighted: { value: string; weight: number }[] = [];
      for (const { ix, weight } of weightedItems) {
        if (ix.targetType !== "JOB") continue;
        const skills = jobSkillMap.get(ix.targetId) || [];
        for (const skill of skills) {
          skillWeighted.push({ value: skill.toLowerCase(), weight });
        }
      }
      interestedSkills = topN(buildWeightedCounter(skillWeighted), 15);
    }

    // ── Content type preference ───────────────────────────────────────────────
    // Which entity types does this user engage with most?
    const contentTypeCounter = buildWeightedCounter(
      weightedItems.map(({ ix, weight }) => ({ value: ix.targetType, weight })),
    );
    const preferredContentTypes = topN(contentTypeCounter, 5);

    // ── Interaction type preference ───────────────────────────────────────────
    // LIKE, SAVE, APPLY, CLICK, SHARE, SCROLL, etc.
    const interactionTypeCounter = buildWeightedCounter(
      weightedItems.map(({ ix, weight }) => ({ value: ix.interactionType, weight })),
    );
    const preferredInteractionTypes = topN(interactionTypeCounter, 5);

    // ── Domain / job type preference ─────────────────────────────────────────
    // Based on HACKATHON interactions' tags (if available)
    const hackathonIds = interactions
      .filter((ix) => ix.targetType === "HACKATHON")
      .map((ix) => ix.targetId);

    let interestedDomains: string[] = [];
    if (hackathonIds.length > 0) {
      const hackathons = await prisma.hackathon.findMany({
        where:  { id: { in: [...new Set(hackathonIds)] } },
        select: { id: true, tags: true },
      });
      const hackathonTagMap = new Map(hackathons.map((h) => [h.id, h.tags || []]));

      const domainWeighted: { value: string; weight: number }[] = [];
      for (const { ix, weight } of weightedItems) {
        if (ix.targetType !== "HACKATHON") continue;
        const tags = hackathonTagMap.get(ix.targetId) || [];
        for (const tag of tags) {
          domainWeighted.push({ value: tag.toLowerCase(), weight });
        }
      }
      interestedDomains = topN(buildWeightedCounter(domainWeighted), 10);
    }

    // ── Job type preference ───────────────────────────────────────────────────
    const jobTypeIds = interactions
      .filter((ix) => ix.targetType === "JOB")
      .map((ix) => ix.targetId);

    let preferredJobTypes: string[] = [];
    if (jobTypeIds.length > 0) {
      const jobTypes = await prisma.job.findMany({
        where:  { id: { in: [...new Set(jobTypeIds)] } },
        select: { id: true, type: true },
      });
      const jobTypeMap = new Map(jobTypes.map((j) => [j.id, j.type]));

      const jobTypeWeighted: { value: string; weight: number }[] = [];
      for (const { ix, weight } of weightedItems) {
        if (ix.targetType !== "JOB") continue;
        const jt = jobTypeMap.get(ix.targetId);
        if (jt) jobTypeWeighted.push({ value: jt, weight });
      }
      preferredJobTypes = topN(buildWeightedCounter(jobTypeWeighted), 5);
    }

    // ── Affinity scores ───────────────────────────────────────────────────────
    const recruiterInteractionCount = interactions.filter(
      (ix) => ix.interactionType === "APPLY" || ix.interactionType === "SAVE",
    ).length;
    const recruiterInterestScore = Math.min(1.0, recruiterInteractionCount / 20);

    const openSourceInteractionCount = interactions.filter(
      (ix) => ix.targetType === "PROJECT",
    ).length;
    const openSourceAffinity = Math.min(1.0, openSourceInteractionCount / 30);

    const collaborationInteractionCount = interactions.filter(
      (ix) => ix.targetType === "HACKATHON",
    ).length;
    const collaborationAffinity = Math.min(1.0, collaborationInteractionCount / 20);

    // ── Upsert UserInterestProfile ────────────────────────────────────────────
    await prisma.userInterestProfile.upsert({
      where:  { userId },
      create: {
        userId,
        interestedSkills:         interestedSkills,
        interestedDomains:        interestedDomains,
        preferredJobTypes:        preferredJobTypes,
        preferredContentTypes:    preferredContentTypes,
        preferredInteractionTypes: preferredInteractionTypes,
        recruiterInterestScore,
        openSourceAffinity,
        collaborationAffinity,
      },
      update: {
        interestedSkills:         interestedSkills,
        interestedDomains:        interestedDomains,
        preferredJobTypes:        preferredJobTypes,
        preferredContentTypes:    preferredContentTypes,
        preferredInteractionTypes: preferredInteractionTypes,
        recruiterInterestScore,
        openSourceAffinity,
        collaborationAffinity,
      },
    });

    logger.debug(
      { userId, skills: interestedSkills.length, domains: interestedDomains.length },
      "[InterestAggregator] Profile updated",
    );

    return true;
  } catch (err: any) {
    logger.error({ userId, err }, "[InterestAggregator] Aggregation failed");
    return false;
  }
}

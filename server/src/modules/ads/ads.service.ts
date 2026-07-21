/**
 * ads.service.ts
 *
 * Core ad serving logic:
 *  - serveAd(): Pick the best matching active ad for a user + zone
 *  - recordImpression(): Log impression event + increment counter
 *  - recordClick(): Log click event + increment counter + return destination URL
 *
 * Targeting priority:
 *  1. Zone must match
 *  2. Campaign must be ACTIVE, within date range, budget not exhausted
 *  3. Targeting filters (role, college, skills, grad year) — empty = match all
 *  4. Highest-priority / most recently approved ad wins (simple first-match)
 *  5. Dedup: same ad not served twice to same session within 1 hour
 */

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import logger from "shared/logger";
import { AdStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServeAdContext {
  zone: string;
  userId?: string;
  userRole?: string;       // e.g. "STUDENT"
  userCollegeId?: string;
  userSkills?: string[];
  userGradYear?: number;
  sessionId?: string;      // For impression dedup
}

export interface ServedAd {
  id: string;
  type: string;
  zone: string;
  headline: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  ctaText: string;
  destinationUrl: string;
  campaignId: string;
}

// ---------------------------------------------------------------------------
// Ad Serving
// ---------------------------------------------------------------------------

/**
 * Returns the best active ad for the given zone and user context.
 * Returns null if no eligible ad is found (component renders nothing).
 */
export async function serveAd(ctx: ServeAdContext): Promise<ServedAd | null> {
  const now = new Date();

  // Fetch all active ads for this zone with their campaign
  const candidates = await prisma.ad.findMany({
    where: {
      zone: ctx.zone,
      isActive: true,
      campaign: {
        status: AdStatus.ACTIVE,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
    },
    include: {
      campaign: {
        select: {
          targetRoles: true,
          targetColleges: true,
          targetSkills: true,
          targetGradYears: true,
          budgetInPaise: true,
          spentInPaise: true,
        },
      },
    },
    orderBy: { createdAt: "asc" }, // oldest approved first (fair rotation)
  });

  if (!candidates.length) return null;

  // Apply targeting filters
  const eligible = candidates.filter((ad) => {
    const c = ad.campaign;

    // Budget check: 0 = FREE / unlimited
    if (c.budgetInPaise > 0 && c.spentInPaise >= c.budgetInPaise) return false;

    // Role targeting
    if (c.targetRoles.length > 0 && ctx.userRole) {
      if (!c.targetRoles.includes(ctx.userRole)) return false;
    }

    // College targeting
    if (c.targetColleges.length > 0 && ctx.userCollegeId) {
      if (!c.targetColleges.includes(ctx.userCollegeId)) return false;
    }

    // Skills targeting — match if user has ANY of the targeted skills
    if (c.targetSkills.length > 0 && ctx.userSkills?.length) {
      const hasSkill = ctx.userSkills.some((s) => c.targetSkills.includes(s));
      if (!hasSkill) return false;
    }

    // Grad year targeting
    if (c.targetGradYears.length > 0 && ctx.userGradYear) {
      if (!c.targetGradYears.includes(ctx.userGradYear)) return false;
    }

    return true;
  });

  if (!eligible.length) return null;

  // Pick first eligible (simple round-robin; extend to weighted auction later)
  const ad = eligible[0];

  return {
    id: ad.id,
    type: ad.type,
    zone: ad.zone,
    headline: ad.headline,
    bodyText: ad.bodyText,
    imageUrl: ad.imageUrl,
    ctaText: ad.ctaText,
    destinationUrl: ad.destinationUrl,
    campaignId: ad.campaignId,
  };
}

// ---------------------------------------------------------------------------
// Event Recording
// ---------------------------------------------------------------------------

/**
 * Record an impression. Called when the ad becomes visible in the viewport.
 * Idempotency: same (adId + sessionId) within 1 hour is deduplicated.
 */
export async function recordImpression(
  adId: string,
  userId?: string,
  sessionId?: string,
  zone?: string,
): Promise<void> {
  // Dedup check: if same session already impressed this ad in last hour, skip
  if (sessionId) {
    const recentImpression = await prisma.adEvent.findFirst({
      where: {
        adId,
        sessionId,
        eventType: "IMPRESSION",
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentImpression) return; // Already counted
  }

  await prisma.$transaction([
    prisma.adEvent.create({
      data: {
        adId,
        userId: userId ?? null,
        eventType: "IMPRESSION",
        zone: zone ?? "",
        sessionId: sessionId ?? null,
        costInPaise: 0, // Cost calculation added in Phase 2
      },
    }),
    prisma.ad.update({
      where: { id: adId },
      data: { impressions: { increment: 1 } },
    }),
  ]);
}

/**
 * Record a click and return the destination URL for redirect.
 * Click is always recorded (no dedup — user may click multiple times).
 */
export async function recordClick(
  adId: string,
  userId?: string,
  sessionId?: string,
  zone?: string,
): Promise<string> {
  const ad = await prisma.ad.findUnique({
    where: { id: adId },
    select: { destinationUrl: true, zone: true },
  });

  if (!ad) throw new AppError("Ad not found.", 404);

  await prisma.$transaction([
    prisma.adEvent.create({
      data: {
        adId,
        userId: userId ?? null,
        eventType: "CLICK",
        zone: zone ?? ad.zone,
        sessionId: sessionId ?? null,
        costInPaise: 0,
      },
    }),
    prisma.ad.update({
      where: { id: adId },
      data: { clicks: { increment: 1 } },
    }),
  ]);

  logger.info({ adId, userId }, "Ad click recorded");
  return ad.destinationUrl;
}

// ---------------------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------------------

export async function getAdAnalytics(campaignId: string, advertiserId: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, advertiserId },
    include: {
      ads: {
        include: {
          _count: { select: { events: true } },
        },
      },
    },
  });

  if (!campaign) throw new AppError("Campaign not found.", 404);

  const totalImpressions = campaign.ads.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = campaign.ads.reduce((s, a) => s + a.clicks, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    },
    summary: { totalImpressions, totalClicks, ctr: `${ctr}%` },
    ads: campaign.ads.map((a) => ({
      id: a.id,
      type: a.type,
      zone: a.zone,
      headline: a.headline,
      impressions: a.impressions,
      clicks: a.clicks,
      ctr: a.impressions > 0 ? `${((a.clicks / a.impressions) * 100).toFixed(2)}%` : "0.00%",
    })),
  };
}

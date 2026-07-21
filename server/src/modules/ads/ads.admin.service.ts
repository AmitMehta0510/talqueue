/**
 * ads.admin.service.ts
 *
 * Admin-only CRUD for campaigns and ads.
 * All operations restricted to platform admins via route middleware.
 */

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { AdStatus, AdType, BillingModel } from "@prisma/client";
import logger from "shared/logger";

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------

export async function adminListCampaigns(
  status?: AdStatus,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;
  const where = status ? { status } : {};

  const [campaigns, total] = await Promise.all([
    prisma.adCampaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        advertiser: { select: { id: true, username: true, email: true } },
        _count: { select: { ads: true } },
      },
    }),
    prisma.adCampaign.count({ where }),
  ]);

  return { campaigns, total, page, limit };
}

export async function adminGetCampaign(id: string) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id },
    include: {
      advertiser: { select: { id: true, username: true, email: true } },
      ads: true,
    },
  });
  if (!campaign) throw new AppError("Campaign not found.", 404);
  return campaign;
}

export interface CreateCampaignInput {
  advertiserId: string;
  name: string;
  billingModel?: BillingModel;
  budgetInPaise?: number;
  dailyCapInPaise?: number;
  startDate: Date;
  endDate?: Date;
  targetRoles?: string[];
  targetColleges?: string[];
  targetSkills?: string[];
  targetGradYears?: number[];
}

export async function adminCreateCampaign(data: CreateCampaignInput) {
  return prisma.adCampaign.create({
    data: {
      advertiserId: data.advertiserId,
      name: data.name,
      status: AdStatus.ACTIVE, // Admin-created campaigns are immediately active
      billingModel: data.billingModel ?? BillingModel.FREE,
      budgetInPaise: data.budgetInPaise ?? 0,
      dailyCapInPaise: data.dailyCapInPaise ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      targetRoles: data.targetRoles ?? [],
      targetColleges: data.targetColleges ?? [],
      targetSkills: data.targetSkills ?? [],
      targetGradYears: data.targetGradYears ?? [],
    },
  });
}

export async function adminUpdateCampaignStatus(
  id: string,
  status: AdStatus,
  adminNote?: string,
) {
  await adminGetCampaign(id); // 404 guard
  const updated = await prisma.adCampaign.update({
    where: { id },
    data: { status, ...(adminNote !== undefined && { adminNote }) },
  });
  logger.info({ campaignId: id, status }, "Admin updated campaign status");
  return updated;
}

export async function adminDeleteCampaign(id: string) {
  await adminGetCampaign(id);
  return prisma.adCampaign.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Ad CRUD (within a campaign)
// ---------------------------------------------------------------------------

export interface CreateAdInput {
  campaignId: string;
  type: AdType;
  zone: string;
  headline?: string;
  bodyText?: string;
  imageUrl?: string;
  ctaText?: string;
  destinationUrl: string;
}

export async function adminCreateAd(data: CreateAdInput) {
  // Verify campaign exists
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: data.campaignId },
  });
  if (!campaign) throw new AppError("Campaign not found.", 404);

  return prisma.ad.create({
    data: {
      campaignId: data.campaignId,
      type: data.type,
      zone: data.zone,
      headline: data.headline ?? null,
      bodyText: data.bodyText ?? null,
      imageUrl: data.imageUrl ?? null,
      ctaText: data.ctaText ?? "Learn More",
      destinationUrl: data.destinationUrl,
    },
  });
}

export async function adminToggleAd(adId: string, isActive: boolean) {
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  if (!ad) throw new AppError("Ad not found.", 404);
  return prisma.ad.update({ where: { id: adId }, data: { isActive } });
}

export async function adminDeleteAd(adId: string) {
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  if (!ad) throw new AppError("Ad not found.", 404);
  return prisma.ad.delete({ where: { id: adId } });
}

// ---------------------------------------------------------------------------
// Platform-wide analytics
// ---------------------------------------------------------------------------

export async function adminGetPlatformAdStats() {
  const [
    totalCampaigns,
    activeCampaigns,
    totalImpressions,
    totalClicks,
    topAds,
  ] = await Promise.all([
    prisma.adCampaign.count(),
    prisma.adCampaign.count({ where: { status: AdStatus.ACTIVE } }),
    prisma.ad.aggregate({ _sum: { impressions: true } }),
    prisma.ad.aggregate({ _sum: { clicks: true } }),
    prisma.ad.findMany({
      orderBy: { impressions: "desc" },
      take: 5,
      include: { campaign: { select: { name: true } } },
    }),
  ]);

  const impressions = totalImpressions._sum.impressions ?? 0;
  const clicks = totalClicks._sum.clicks ?? 0;

  return {
    totalCampaigns,
    activeCampaigns,
    totalImpressions: impressions,
    totalClicks: clicks,
    platformCtr: impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : "0.00%",
    topAds: topAds.map((a) => ({
      id: a.id,
      headline: a.headline,
      campaign: a.campaign.name,
      impressions: a.impressions,
      clicks: a.clicks,
    })),
  };
}

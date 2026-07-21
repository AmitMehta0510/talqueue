/**
 * ads.controller.ts
 *
 * HTTP handlers for the ads module.
 * Public routes: serve ad, record impression/click
 * Admin routes: campaign & ad CRUD + analytics
 */

import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import AppError from "shared/errors/AppError";
import { AdStatus } from "@prisma/client";

import { serveAd, recordImpression, recordClick, getAdAnalytics } from "./ads.service";
import {
  adminListCampaigns,
  adminGetCampaign,
  adminCreateCampaign,
  adminUpdateCampaignStatus,
  adminDeleteCampaign,
  adminCreateAd,
  adminToggleAd,
  adminDeleteAd,
  adminGetPlatformAdStats,
} from "./ads.admin.service";

// ---------------------------------------------------------------------------
// Public — Ad Serving
// ---------------------------------------------------------------------------

/**
 * GET /ads/serve?zone=feed_inline
 * Returns best matching ad for the requesting user + zone.
 * Returns { ad: null } if no eligible ad found.
 */
export const serveAdHandler = asyncHandler(
  async (req: any, res: Response) => {
    const zone = req.query.zone as string;
    if (!zone) throw new AppError("zone query param is required.", 400);

    const sessionId = req.headers["x-session-id"] as string | undefined;

    // Build user context from authenticated user (if any)
    const ctx = {
      zone,
      sessionId,
      userId: req.user?.id,
      userRole: req.user?.primaryRole ?? undefined,
      // Add college, skills, gradYear later from user profile
    };

    const ad = await serveAd(ctx);
    res.json(successResponse({ ad }, ad ? "Ad ready" : "No ad available"));
  },
);

/**
 * POST /ads/impression
 * Body: { adId: string }
 * Called by frontend when the ad enters the viewport.
 */
export const recordImpressionHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { adId, zone } = req.body as { adId: string; zone?: string };
    if (!adId) throw new AppError("adId is required.", 400);

    const sessionId = req.headers["x-session-id"] as string | undefined;
    await recordImpression(adId, req.user?.id, sessionId, zone);
    res.json(successResponse(null, "Impression recorded"));
  },
);

/**
 * POST /ads/click
 * Body: { adId: string }
 * Records click and returns destination URL for frontend redirect.
 */
export const recordClickHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { adId, zone } = req.body as { adId: string; zone?: string };
    if (!adId) throw new AppError("adId is required.", 400);

    const sessionId = req.headers["x-session-id"] as string | undefined;
    const destinationUrl = await recordClick(adId, req.user?.id, sessionId, zone);
    res.json(successResponse({ destinationUrl }, "Click recorded"));
  },
);

// ---------------------------------------------------------------------------
// Advertiser — Campaign analytics (own campaigns only)
// ---------------------------------------------------------------------------

export const getMyAnalyticsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const data = await getAdAnalytics(req.params.campaignId as string, req.user.id);
    res.json(successResponse(data));
  },
);

// ---------------------------------------------------------------------------
// Admin — Campaigns
// ---------------------------------------------------------------------------

export const adminListCampaignsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const status = req.query.status as AdStatus | undefined;
    const page = Number(req.query.page) || 1;
    const data = await adminListCampaigns(status, page);
    res.json(successResponse(data));
  },
);

export const adminGetCampaignHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await adminGetCampaign(req.params.id as string);
    res.json(successResponse(data));
  },
);

export const adminCreateCampaignHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const campaign = await adminCreateCampaign({
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    });
    res.status(201).json(successResponse(campaign, "Campaign created"));
  },
);

export const adminUpdateCampaignStatusHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, adminNote } = req.body as { status: AdStatus; adminNote?: string };
    const campaign = await adminUpdateCampaignStatus(req.params.id as string, status, adminNote);
    res.json(successResponse(campaign, `Campaign status updated to ${status}`));
  },
);

export const adminDeleteCampaignHandler = asyncHandler(
  async (req: Request, res: Response) => {
    await adminDeleteCampaign(req.params.id as string);
    res.json(successResponse(null, "Campaign deleted"));
  },
);

// ---------------------------------------------------------------------------
// Admin — Ads (creatives within a campaign)
// ---------------------------------------------------------------------------

export const adminCreateAdHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const ad = await adminCreateAd(req.body);
    res.status(201).json(successResponse(ad, "Ad creative created"));
  },
);

export const adminToggleAdHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { isActive } = req.body as { isActive: boolean };
    const ad = await adminToggleAd(req.params.id as string, isActive);
    res.json(successResponse(ad, `Ad ${isActive ? "activated" : "paused"}`));
  },
);

export const adminDeleteAdHandler = asyncHandler(
  async (req: Request, res: Response) => {
    await adminDeleteAd(req.params.id as string);
    res.json(successResponse(null, "Ad deleted"));
  },
);

// ---------------------------------------------------------------------------
// Admin — Platform analytics
// ---------------------------------------------------------------------------

export const adminPlatformAdStatsHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await adminGetPlatformAdStats();
    res.json(successResponse(stats));
  },
);

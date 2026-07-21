/**
 * ads.routes.ts
 *
 * Route registration for the ads module.
 * Mount in app.ts / server.ts:
 *   app.use("/api/v1/ads", adsRouter);
 */

import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { requirePlatformAdmin } from "shared/middleware/requirePlatformAdmin";

import {
  serveAdHandler,
  recordImpressionHandler,
  recordClickHandler,
  getMyAnalyticsHandler,
  adminListCampaignsHandler,
  adminGetCampaignHandler,
  adminCreateCampaignHandler,
  adminUpdateCampaignStatusHandler,
  adminDeleteCampaignHandler,
  adminCreateAdHandler,
  adminToggleAdHandler,
  adminDeleteAdHandler,
  adminPlatformAdStatsHandler,
} from "./ads.controller";

const router = Router();

// ── Public / Optional-Auth ──────────────────────────────────────────────────

/**
 * GET /api/v1/ads/serve?zone=feed_inline
 * optionalProtect: serves contextual ad if user is logged in, anonymous if not.
 * Using protect here — unauthenticated users won't get targeted ads (fine for Phase 1).
 */
router.get("/serve", protect, serveAdHandler);

/**
 * POST /api/v1/ads/impression
 * Body: { adId, zone? }
 * Called when ad enters viewport. Auth optional but preferred for analytics.
 */
router.post("/impression", protect, recordImpressionHandler);

/**
 * POST /api/v1/ads/click
 * Body: { adId, zone? }
 * Returns { destinationUrl } — frontend redirects there.
 */
router.post("/click", protect, recordClickHandler);

// ── Advertiser (own analytics) ──────────────────────────────────────────────

router.use(protect);

/**
 * GET /api/v1/ads/campaigns/:campaignId/analytics
 * Returns impression/click stats for the requesting user's campaign.
 */
router.get("/campaigns/:campaignId/analytics", getMyAnalyticsHandler);

// ── Admin ───────────────────────────────────────────────────────────────────

router.use(requirePlatformAdmin);

/** GET /api/v1/ads/admin/stats — platform-wide ad performance */
router.get("/admin/stats", adminPlatformAdStatsHandler);

/** GET /api/v1/ads/admin/campaigns?status=PENDING&page=1 */
router.get("/admin/campaigns", adminListCampaignsHandler);

/** GET /api/v1/ads/admin/campaigns/:id */
router.get("/admin/campaigns/:id", adminGetCampaignHandler);

/** POST /api/v1/ads/admin/campaigns — create campaign + activate immediately */
router.post("/admin/campaigns", adminCreateCampaignHandler);

/** PATCH /api/v1/ads/admin/campaigns/:id/status — approve/pause/reject */
router.patch("/admin/campaigns/:id/status", adminUpdateCampaignStatusHandler);

/** DELETE /api/v1/ads/admin/campaigns/:id */
router.delete("/admin/campaigns/:id", adminDeleteCampaignHandler);

/** POST /api/v1/ads/admin/ads — create ad creative */
router.post("/admin/ads", adminCreateAdHandler);

/** PATCH /api/v1/ads/admin/ads/:id/toggle — activate/pause ad */
router.patch("/admin/ads/:id/toggle", adminToggleAdHandler);

/** DELETE /api/v1/ads/admin/ads/:id */
router.delete("/admin/ads/:id", adminDeleteAdHandler);

export { router as adsRouter };

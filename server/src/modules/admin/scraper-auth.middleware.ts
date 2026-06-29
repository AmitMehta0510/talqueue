import { Response, NextFunction } from "express";
import { protect } from "modules/auth/auth.middleware";
import { requirePlatformAdmin } from "shared/middleware/requirePlatformAdmin";

/**
 * Hybrid authorization middleware for scraper trigger endpoints.
 * Allows access if:
 *  1. Header x-scraper-cron-key matches the configured SCRAPER_CRON_KEY environment secret.
 *  2. OR if the request is authenticated with standard JWT platform admin cookies/headers.
 */
export const scraperAuthMiddleware = (req: any, res: Response, next: NextFunction) => {
  const cronKey = req.headers["x-scraper-cron-key"];
  const configuredKey = process.env.SCRAPER_CRON_KEY;

  if (configuredKey && cronKey === configuredKey) {
    return next(); // Bypassed via Serverless Cron secret header
  }

  // Fall back to standard Platform Admin JWT authentication checks
  return protect(req, res, () => {
    return requirePlatformAdmin(req, res, next);
  });
};

import { Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import AppError from "shared/errors/AppError";

import { getAdminDashboardAnalytics } from "./admin-analytics.service";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Roles that are permitted to call the analytics dashboard endpoint.
 * Any authenticated user whose roles array does NOT include at least one
 * of these names will receive an immediate 403 Access Denied response.
 */
const ANALYTICS_ALLOWED_ROLES = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN"]);

// ─────────────────────────────────────────────────────────────────────────────
// GUARD HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns `true` when the requesting user holds at least one of the
 * analytics-allowed roles (SUPER_ADMIN | PLATFORM_ADMIN).
 *
 * Reads from `req.user.roles[]` — the hydrated role array attached by the
 * `protect` auth middleware — matching the same pattern used by the shared
 * `requireSuperAdmin` and `requirePlatformAdmin` middlewares.
 */
const hasAnalyticsAccess = (user: any): boolean => {
  const roleNames = new Set<string>(
    (user?.roles ?? [])
      .map((ur: any) => ur.role?.name)
      .filter(Boolean),
  );

  return [...ANALYTICS_ALLOWED_ROLES].some((r) => roleNames.has(r));
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `GET /api/admin/analytics/dashboard?range=<days>`
 *
 * Returns daily bucketed analytics data for the admin dashboard.
 *
 * Access Control (rigid hierarchy):
 *   ✅ SUPER_ADMIN       — full access
 *   ✅ PLATFORM_ADMIN    — full access
 *   ❌ ADMIN / any lower — 403 Access Denied (explicit, immediate)
 *
 * Query Parameters:
 *   `range` (optional, integer) — Number of days to look back.
 *            Parsed from the query string and sanitised inside the service
 *            via `Math.min(Math.max(7, range), 90)`.
 *            Defaults to 30 when absent or not a valid integer.
 */
export const getAdminDashboardAnalyticsHandler = asyncHandler(
  async (req: any, res: Response) => {
    // ── 1. Rigid role hierarchy access check ─────────────────────────────────
    //
    // req.user.roles[] is checked (not req.user.primaryRole) to mirror the
    // existing requireSuperAdmin / requirePlatformAdmin middleware pattern.
    //
    // Any role that is NOT SUPER_ADMIN or PLATFORM_ADMIN — including an
    // ordinary ADMIN, COLLEGE_ADMIN, COMPANY_ADMIN, or any lower entity —
    // receives an immediate 403 Access Denied via AppError so the central
    // errorMiddleware formats the response consistently.
    if (!hasAnalyticsAccess(req.user)) {
      throw new AppError(
        "Access Denied: analytics dashboard requires SUPER_ADMIN or PLATFORM_ADMIN privileges",
        403,
      );
    }

    // ── 2. Sanitise `range` query param ──────────────────────────────────────
    //
    // The raw string value is coerced to an integer; non-numeric / absent
    // values fall back to 30. The service layer performs the authoritative
    // clamping: Math.min(Math.max(7, range), 90).
    const rawRange = req.query.range as string | undefined;
    const parsedRange = rawRange ? parseInt(rawRange, 10) : 30;
    const range = Number.isFinite(parsedRange) ? parsedRange : 30;

    // ── 3. Delegate to service ────────────────────────────────────────────────
    const payload = await getAdminDashboardAnalytics(range);

    res.json(successResponse(payload, "Dashboard analytics fetched successfully"));
  },
);

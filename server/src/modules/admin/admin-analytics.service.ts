import prisma from "shared/database/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A single daily data point for a time-series bucket. */
export interface DailyBucket {
  /** ISO date string in `YYYY-MM-DD` format. */
  date: string;
  /** Aggregate count for that calendar day. */
  count: number;
}

/**
 * Typed return shape for `getAdminDashboardAnalytics`.
 * Contains two parallel daily time-series:
 *  - `userRegistrations` — new users created per day
 *  - `userFootprint`     — profile-view events recorded per day
 */
export interface DashboardAnalyticsPayload {
  /** Clamped day window used for the query (always 7–90). */
  range: number;
  /** ISO timestamp marking when this payload was generated. */
  generatedAt: string;
  /** Daily user registration counts within the window. */
  userRegistrations: DailyBucket[];
  /** Daily user footprint (ProfileView) counts within the window. */
  userFootprint: DailyBucket[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a UTC `Date` into an ISO date string (`YYYY-MM-DD`).
 */
const toDateKey = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Fills in missing days inside the window with a zero count so the
 * time-series is always a dense, contiguous array.
 */
const fillDailyBuckets = (
  rawMap: Record<string, number>,
  startDate: Date,
  endDate: Date,
): DailyBucket[] => {
  const buckets: DailyBucket[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const key = toDateKey(cursor);
    buckets.push({ date: key, count: rawMap[key] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return buckets;
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a `DashboardAnalyticsPayload` covering the requested `range` of days.
 *
 * The `range` is sanitised by clamping it to [7, 90] via
 * `Math.min(Math.max(7, range), 90)` before any database work is done —
 * this guards against unbounded table scans on very large date windows.
 *
 * Both aggregation queries run **concurrently** via `Promise.all` so
 * the round-trip is bounded by the slower of the two, not their sum.
 *
 * @param rawRange - Requested window in days (caller-supplied, unchecked).
 */
export const getAdminDashboardAnalytics = async (
  rawRange: number,
): Promise<DashboardAnalyticsPayload> => {
  // ── 1. Sanitise / clamp the range ──────────────────────────────────────────
  const range = Math.min(Math.max(7, rawRange), 90);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - range);
  // Normalise startDate to the very beginning of that UTC day
  startDate.setUTCHours(0, 0, 0, 0);

  // ── 2. Concurrent aggregation via Promise.all ───────────────────────────────
  const [rawRegistrations, rawFootprints] = await Promise.all([
    // ── 2a. User registrations: group new user rows by calendar day ──────────
    prisma.user.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),

    // ── 2b. User footprint: group ProfileView events by calendar day ─────────
    prisma.profileView.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // ── 3. Map raw rows into daily bucket maps ──────────────────────────────────
  const registrationMap: Record<string, number> = {};
  for (const row of rawRegistrations) {
    const key = toDateKey(row.createdAt);
    registrationMap[key] = (registrationMap[key] ?? 0) + 1;
  }

  const footprintMap: Record<string, number> = {};
  for (const row of rawFootprints) {
    const key = toDateKey(row.createdAt);
    footprintMap[key] = (footprintMap[key] ?? 0) + 1;
  }

  // ── 4. Build dense, zero-filled daily series ────────────────────────────────
  const userRegistrations = fillDailyBuckets(registrationMap, startDate, endDate);
  const userFootprint = fillDailyBuckets(footprintMap, startDate, endDate);

  // ── 5. Return typed payload ─────────────────────────────────────────────────
  return {
    range,
    generatedAt: new Date().toISOString(),
    userRegistrations,
    userFootprint,
  };
};

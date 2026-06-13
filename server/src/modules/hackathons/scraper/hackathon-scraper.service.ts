/**
 * hackathon-scraper.service.ts
 *
 * Fetches open hackathons from Devpost's public JSON API and upserts
 * them into the database. Adheres to Devpost's robots.txt (allows all
 * general crawlers) with a 1-second delay between pages to be a
 * respectful crawler and avoid overloading their servers.
 *
 * API: https://devpost.com/api/hackathons.json?status=open&order_by=deadline&page=N
 */

import axios from "axios";
import slugify from "slugify";
import prisma from "shared/database/prisma";

const DEVPOST_API = "https://devpost.com/api/hackathons.json";
const SOURCE_PLATFORM = "Devpost";
const MAX_PAGES = 25; // cap at 225 hackathons per run (9 per page)
const CRAWL_DELAY_MS = 1000; // 1 second between requests — respectful crawling

// -------------------------
// Devpost API types
// -------------------------

interface DevpostLocation {
  icon: string;
  location: string;
}

interface DevpostTheme {
  id: number;
  name: string;
}

interface DevpostHackathon {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string;
  open_state: string;
  organization_name: string;
  displayed_location: DevpostLocation;
  submission_period_dates: string; // e.g. "Jun 10 - 13, 2026"
  themes: DevpostTheme[];
  invite_only: boolean;
  prize_amount: string;
}

interface DevpostResponse {
  hackathons: DevpostHackathon[];
  meta: {
    total_count: number;
    per_page: number;
  };
}

// -------------------------
// Date parsing helpers
// -------------------------

/**
 * Parses Devpost's "Jun 10 - 13, 2026" or "Apr 15 - Jun 14, 2026" style
 * date ranges into { startDate, endDate }.
 */
function parseDevpostDateRange(dateStr: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const currentYear = now.getFullYear();

  try {
    // Pattern: "Jun 10 - 13, 2026" (same month)
    const sameMonthMatch = dateStr.match(
      /([A-Za-z]+)\s+(\d+)\s*-\s*(\d+),\s*(\d{4})/,
    );
    if (sameMonthMatch) {
      const [, month, startDay, endDay, year] = sameMonthMatch;
      const startDate = new Date(`${month} ${startDay}, ${year}`);
      const endDate = new Date(`${month} ${endDay}, ${year}`);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 0);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }

    // Pattern: "Apr 15 - Jun 14, 2026" (different months)
    const crossMonthMatch = dateStr.match(
      /([A-Za-z]+)\s+(\d+)\s*-\s*([A-Za-z]+)\s+(\d+),\s*(\d{4})/,
    );
    if (crossMonthMatch) {
      const [, startMonth, startDay, endMonth, endDay, year] = crossMonthMatch;
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 0);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
  } catch {
    // fall through to defaults
  }

  // Fallback: start = now, end = 7 days from now
  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7);
  return { startDate, endDate };
}

// -------------------------
// System bot user resolver
// -------------------------

let _scraperUserId: string | null = null;

async function getScraperUserId(): Promise<string> {
  if (_scraperUserId) return _scraperUserId;

  const botUser = await prisma.user.findUnique({
    where: { email: "scraper@platform.internal" },
    select: { id: true },
  });

  if (!botUser) {
    throw new Error(
      "[Scraper] System bot user not found. Run: npx ts-node -r tsconfig-paths/register prisma/seedScraper.ts",
    );
  }

  _scraperUserId = botUser.id;
  return botUser.id;
}

// -------------------------
// Mapping Devpost → our schema
// -------------------------

function mapDevpostHackathon(
  item: DevpostHackathon,
  createdById: string,
): {
  sourceId: string;
  sourcePlatform: string;
  title: string;
  slug: string;
  description: string;
  bannerUrl: string | null;
  organizerName: string | null;
  externalUrl: string;
  isExternal: boolean;
  verified: boolean;
  status: string;
  mode: string | null;
  location: string | null;
  tags: string[];
  maxTeamSize: number;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  createdById: string;
} {
  const { startDate, endDate } = parseDevpostDateRange(
    item.submission_period_dates,
  );

  // Registration deadline = 1 day before start (best approximation from API data)
  const registrationDeadline = new Date(startDate);
  registrationDeadline.setDate(registrationDeadline.getDate() - 1);

  const locationText = item.displayed_location?.location || "";
  const isOnline =
    item.displayed_location?.icon === "globe" ||
    locationText.toLowerCase() === "online";

  // Clean banner URL (Devpost sometimes uses protocol-relative URLs)
  const rawThumbnail = item.thumbnail_url || "";
  const bannerUrl = rawThumbnail.startsWith("//")
    ? `https:${rawThumbnail}`
    : rawThumbnail || null;

  const tags = (item.themes || []).map((t) => t.name).filter(Boolean);

  const slug = slugify(`${item.title}-${item.id}`, {
    lower: true,
    strict: true,
    trim: true,
  });

  return {
    sourceId: String(item.id),
    sourcePlatform: SOURCE_PLATFORM,
    title: item.title,
    slug,
    description: item.title, // Devpost API listing doesn't expose full description
    bannerUrl,
    organizerName: item.organization_name || null,
    externalUrl: item.url,
    isExternal: true,
    verified: true, // auto-verify scraped content
    status: "OPEN",
    mode: isOnline ? "ONLINE" : null,
    location: isOnline ? null : locationText || null,
    tags,
    maxTeamSize: 1, // external hackathons — team managed on their platform
    startDate,
    endDate,
    registrationDeadline,
    createdById,
  };
}

// -------------------------
// Scraper core
// -------------------------

interface ScraperResult {
  created: number;
  updated: number;
  errors: number;
  totalFetched: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runDevpostScraper(): Promise<ScraperResult> {
  const result: ScraperResult = {
    created: 0,
    updated: 0,
    errors: 0,
    totalFetched: 0,
  };

  const createdById = await getScraperUserId();

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    try {
      const response = await axios.get<DevpostResponse>(DEVPOST_API, {
        params: {
          status: "open",
          order_by: "deadline",
          page,
        },
        headers: {
          "User-Agent": "Engineering-Platform-Bot/1.0 (platform aggregator)",
          Accept: "application/json",
        },
        timeout: 15_000,
      });

      const { hackathons, meta } = response.data;

      if (!hackathons || hackathons.length === 0) {
        break;
      }

      result.totalFetched += hackathons.length;

      // Process hackathons in this page
      for (const item of hackathons) {
        try {
          const data = mapDevpostHackathon(item, createdById);

          const existing = await prisma.hackathon.findUnique({
            where: {
              sourceId_sourcePlatform: {
                sourceId: data.sourceId,
                sourcePlatform: data.sourcePlatform,
              },
            },
            select: { id: true },
          });

          if (existing) {
            // Update existing record (dates, title, banner, tags may have changed)
            await prisma.hackathon.update({
              where: { id: existing.id },
              data: {
                title: data.title,
                bannerUrl: data.bannerUrl,
                organizerName: data.organizerName,
                externalUrl: data.externalUrl,
                tags: data.tags,
                startDate: data.startDate,
                endDate: data.endDate,
                registrationDeadline: data.registrationDeadline,
                mode: data.mode as any,
                location: data.location,
                status: data.status as any,
                verified: data.verified,
              },
            });
            result.updated++;
          } else {
            // Create new record
            await prisma.hackathon.create({
              data: {
                sourceId: data.sourceId,
                sourcePlatform: data.sourcePlatform,
                title: data.title,
                slug: data.slug,
                description: data.description,
                bannerUrl: data.bannerUrl,
                organizerName: data.organizerName,
                externalUrl: data.externalUrl,
                isExternal: data.isExternal,
                verified: data.verified,
                status: data.status as any,
                mode: data.mode as any,
                location: data.location,
                tags: data.tags,
                maxTeamSize: data.maxTeamSize,
                startDate: data.startDate,
                endDate: data.endDate,
                registrationDeadline: data.registrationDeadline,
                createdById: data.createdById,
              },
            });
            result.created++;
          }
        } catch (itemError) {
          console.error(
            `[Scraper] Failed to upsert hackathon id=${item.id}:`,
            itemError,
          );
          result.errors++;
        }
      }

      // Determine if there are more pages
      const totalPages = Math.ceil(meta.total_count / meta.per_page);
      hasMore = page < totalPages;
      page++;

      // Respectful crawl delay between pages
      if (hasMore) {
        await sleep(CRAWL_DELAY_MS);
      }
    } catch (pageError) {
      console.error(`[Scraper] Failed to fetch page ${page}:`, pageError);
      result.errors++;
      break;
    }
  }

  return result;
}

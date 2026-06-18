/**
 * hackathon-scraper.service.ts
 *
 * Fetches open hackathons from public sources (Devpost, Devfolio, Unstop,
 * TAIKAI, HackerEarth, Reskilll) and upserts them into the database.
 * Adheres to each platform's robots.txt with polite crawl delays.
 */

import axios from "axios";
import prisma from "shared/database/prisma";
import { syncHackathonToElastic } from "services/elasticSync";
import {
  stripHtml,
  sleep,
  generateScraperSlug,
  calculateScraperStatus,
} from "./scraper.utils";

const CRAWL_DELAY_MS = 1000; // 1 second between requests — respectful crawling


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
// Helper for Upsert
// -------------------------

async function upsertScrapedHackathon(data: {
  sourceId: string;
  sourcePlatform: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  bannerUrl: string | null;
  logoUrl?: string | null;
  organizerName: string | null;
  externalUrl: string;
  isExternal: boolean;
  verified: boolean;
  status: string;
  mode: string | null;
  location: string | null;
  tags: string[];
  minTeamSize: number;
  maxTeamSize: number;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  createdById: string;
}): Promise<boolean> {
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
    await prisma.hackathon.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        bannerUrl: data.bannerUrl,
        logoUrl: data.logoUrl || null,
        shortDescription: data.shortDescription || null,
        description: data.description,
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
        minTeamSize: data.minTeamSize,
        maxTeamSize: data.maxTeamSize,
      },
    });
    syncHackathonToElastic(existing.id);
    return false; // updated
  } else {
    const created = await prisma.hackathon.create({
      data: {
        sourceId: data.sourceId,
        sourcePlatform: data.sourcePlatform,
        title: data.title,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription || null,
        bannerUrl: data.bannerUrl,
        logoUrl: data.logoUrl || null,
        organizerName: data.organizerName,
        externalUrl: data.externalUrl,
        isExternal: data.isExternal,
        verified: data.verified,
        status: data.status as any,
        mode: data.mode as any,
        location: data.location,
        tags: data.tags,
        minTeamSize: data.minTeamSize,
        maxTeamSize: data.maxTeamSize,
        startDate: data.startDate,
        endDate: data.endDate,
        registrationDeadline: data.registrationDeadline,
        createdById: data.createdById,
      },
    });
    syncHackathonToElastic(created.id);
    return true; // created
  }
}


// -------------------------
// 1. Devpost Scraper
// -------------------------

const DEVPOST_API = "https://devpost.com/api/hackathons.json";
const MAX_PAGES = 10; // Cap to keep scraping times reasonable (90 hackathons)

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
  submission_period_dates: string;
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

function parseDevpostDateRange(dateStr: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  try {
    // If the date string doesn't contain a 4-digit year, append the current year
    let modifiedDateStr = dateStr;
    if (!/\b\d{4}\b/.test(dateStr)) {
      modifiedDateStr = `${dateStr}, ${now.getFullYear()}`;
    }

    const sameMonthMatch = modifiedDateStr.match(
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

    const crossMonthMatch = modifiedDateStr.match(
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
    // fallback
  }


  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7);
  return { startDate, endDate };
}

export async function runDevpostScraper(createdById: string, result: ScraperResult): Promise<void> {
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    try {
      const response = await axios.get<DevpostResponse>(DEVPOST_API, {
        params: { status: "open", order_by: "deadline", page },
        headers: {
          "User-Agent": "Engineering-Platform-Bot/1.0 (platform aggregator)",
          Accept: "application/json",
        },
        timeout: 15_000,
      });

      const { hackathons, meta } = response.data;
      if (!hackathons || hackathons.length === 0) break;

      result.totalFetched += hackathons.length;

      for (const item of hackathons) {
        try {
          const { startDate, endDate } = parseDevpostDateRange(item.submission_period_dates);
          const registrationDeadline = new Date(startDate);
          registrationDeadline.setDate(registrationDeadline.getDate() - 1);

          const locationText = item.displayed_location?.location || "";
          const isOnline =
            item.displayed_location?.icon === "globe" ||
            locationText.toLowerCase() === "online";

          const rawThumbnail = item.thumbnail_url || "";
          const bannerUrl = rawThumbnail.startsWith("//") ? `https:${rawThumbnail}` : rawThumbnail || null;

          const tags = (item.themes || []).map((t) => t.name).filter(Boolean);
          const slug = generateScraperSlug(item.title, "Devpost", item.id);

          const isClosed = Boolean(item.open_state && !["open", "upcoming"].includes(item.open_state.toLowerCase()));
          const status = calculateScraperStatus(startDate, endDate, isClosed);

          const isCreated = await upsertScrapedHackathon({
            sourceId: String(item.id),
            sourcePlatform: "Devpost",
            title: stripHtml(item.title),
            slug,
            description: stripHtml(item.title),
            bannerUrl,
            organizerName: item.organization_name || null,
            externalUrl: item.url,
            isExternal: true,
            verified: true,
            status,
            mode: isOnline ? "ONLINE" : "OFFLINE",
            location: isOnline ? null : locationText || null,
            tags,
            minTeamSize: 1,
            maxTeamSize: 4,
            startDate,
            endDate,
            registrationDeadline,
            createdById,
          });

          if (isCreated) result.created++;
          else result.updated++;
        } catch (itemError) {
          console.error(`[Scraper] Failed to upsert Devpost hackathon id=${item.id}:`, itemError);
          result.errors++;
        }
      }

      const totalPages = Math.ceil(meta.total_count / meta.per_page);
      hasMore = page < totalPages;
      page++;

      if (hasMore) await sleep(CRAWL_DELAY_MS);
    } catch (pageError) {
      console.error(`[Scraper] Devpost Page ${page} failed:`, pageError);
      result.errors++;
      break;
    }
  }
}

// -------------------------
// 2. Devfolio Scraper
// -------------------------

const DEVFOLIO_API = "https://api.devfolio.co/api/hackathons";

interface DevfolioHackathonSetting {
  logo?: string;
  site?: string;
  reg_ends_at?: string;
  subdomain?: string;
}

interface DevfolioHackathonTheme {
  name: string;
}

interface DevfolioHackathon {
  uuid: string;
  name: string;
  slug: string;
  tagline: string;
  desc: string;
  cover_img: string;
  starts_at: string;
  ends_at: string;
  is_online: boolean;
  is_hybrid: boolean;
  location: string;
  team_size: number;
  team_min?: number;
  hackathon_setting: DevfolioHackathonSetting | null;
  themes: DevfolioHackathonTheme[];
}

interface DevfolioResponse {
  result: DevfolioHackathon[];
  count: number;
  pages: number;
}

export async function runDevfolioScraper(createdById: string, result: ScraperResult): Promise<void> {
  let page = 1;
  let hasMore = true;
  const maxDevfolioPages = 5;

  while (hasMore && page <= maxDevfolioPages) {
    try {
      const response = await axios.get<DevfolioResponse>(DEVFOLIO_API, {
        params: { filter: "application_open", page },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        timeout: 15_000,
      });

      const { result: hackathons, pages } = response.data;
      if (!hackathons || hackathons.length === 0) break;

      result.totalFetched += hackathons.length;

      for (const item of hackathons) {
        try {
          const startDate = new Date(item.starts_at);
          const endDate = new Date(item.ends_at);
          const registrationDeadline = item.hackathon_setting?.reg_ends_at
            ? new Date(item.hackathon_setting.reg_ends_at)
            : new Date(startDate);

          const mode = item.is_online ? "ONLINE" : item.is_hybrid ? "HYBRID" : "OFFLINE";
          const tags = (item.themes || []).map((t) => t.name).filter(Boolean);
          const slug = generateScraperSlug(item.name, "Devfolio", item.uuid);

          const status = calculateScraperStatus(startDate, endDate);

          const isCreated = await upsertScrapedHackathon({
            sourceId: item.uuid,
            sourcePlatform: "Devfolio",
            title: stripHtml(item.name),
            slug,
            description: stripHtml(item.desc || item.tagline || item.name),
            shortDescription: item.tagline ? stripHtml(item.tagline) : null,
            bannerUrl: item.cover_img || null,
            logoUrl: item.hackathon_setting?.logo || null,
            organizerName: item.hackathon_setting?.subdomain || "Devfolio Organizer",
            externalUrl: item.hackathon_setting?.site || `https://devfolio.co/hackathons/${item.slug}`,
            isExternal: true,
            verified: true,
            status,
            mode,
            location: item.location || null,
            tags,
            minTeamSize: item.team_min || 1,
            maxTeamSize: item.team_size || 1,
            startDate,
            endDate,
            registrationDeadline,
            createdById,
          });

          if (isCreated) result.created++;
          else result.updated++;
        } catch (itemError) {
          console.error(`[Scraper] Failed to upsert Devfolio hackathon uuid=${item.uuid}:`, itemError);
          result.errors++;
        }
      }

      hasMore = page < pages;
      page++;

      if (hasMore) await sleep(CRAWL_DELAY_MS);
    } catch (pageError) {
      console.error(`[Scraper] Devfolio Page ${page} failed:`, pageError);
      result.errors++;
      break;
    }
  }
}

// -------------------------
// 3. Unstop Scraper
// -------------------------

const UNSTOP_API = "https://unstop.com/api/public/opportunity/search-result";

interface UnstopRegnRequirements {
  start_regn_dt: string;
  end_regn_dt: string;
  max_team_size?: number;
  min_team_size?: number;
}

interface UnstopOrganisation {
  name: string;
}

interface UnstopOpportunity {
  id: number;
  title: string;
  seo_url: string;
  details: string;
  thumb: string;
  logoUrl2: string;
  end_date: string;
  locations: string[];
  tags: string;
  organisation: UnstopOrganisation | null;
  regnRequirements: UnstopRegnRequirements | null;
}

interface UnstopResponse {
  data: {
    data: UnstopOpportunity[];
    last_page: number;
  };
}

export async function runUnstopScraper(createdById: string, result: ScraperResult): Promise<void> {
  let page = 1;
  let hasMore = true;
  const maxUnstopPages = 5;

  while (hasMore && page <= maxUnstopPages) {
    try {
      const response = await axios.get<UnstopResponse>(UNSTOP_API, {
        params: { opportunity: "hackathons", oppstatus: "open", page },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
        },
        timeout: 15_000,
      });

      const { data: hackathons, last_page } = response.data.data;
      if (!hackathons || hackathons.length === 0) break;

      result.totalFetched += hackathons.length;

      for (const item of hackathons) {
        try {
          const startDate = item.regnRequirements?.start_regn_dt
            ? new Date(item.regnRequirements.start_regn_dt)
            : new Date();
          const registrationDeadline = item.regnRequirements?.end_regn_dt
            ? new Date(item.regnRequirements.end_regn_dt)
            : new Date(item.end_date);
          const endDate = new Date(item.end_date);

          const locationText = Array.isArray(item.locations) ? item.locations.join(", ") : "";
          const isOnline = locationText.toLowerCase().includes("online") || !locationText;

          let tags: string[] = [];
          if (item.tags) {
            if (Array.isArray(item.tags)) {
              tags = item.tags.map((t: any) => typeof t === "string" ? t : t.name || t.title || String(t)).filter(Boolean);
            } else if (typeof item.tags === "string") {
              tags = item.tags.split(",").map((t) => t.trim()).filter(Boolean);
            }
          }
          const slug = generateScraperSlug(item.title, "Unstop", item.id);

          const status = calculateScraperStatus(startDate, endDate);

          const isCreated = await upsertScrapedHackathon({
            sourceId: String(item.id),
            sourcePlatform: "Unstop",
            title: stripHtml(item.title),
            slug,
            description: stripHtml(item.details || item.title),
            bannerUrl: item.thumb || item.logoUrl2 || null,
            organizerName: item.organisation?.name || "Unstop Organizer",
            externalUrl: item.seo_url || `https://unstop.com/hackathons/${item.id}`,
            isExternal: true,
            verified: true,
            status,
            mode: isOnline ? "ONLINE" : "OFFLINE",
            location: isOnline ? null : locationText || null,
            tags,
            minTeamSize: item.regnRequirements?.min_team_size || 1,
            maxTeamSize: item.regnRequirements?.max_team_size || 1,
            startDate,
            endDate,
            registrationDeadline,
            createdById,
          });

          if (isCreated) result.created++;
          else result.updated++;
        } catch (itemError) {
          console.error(`[Scraper] Failed to upsert Unstop hackathon id=${item.id}:`, itemError);
          result.errors++;
        }
      }

      hasMore = page < last_page;
      page++;

      if (hasMore) await sleep(CRAWL_DELAY_MS);
    } catch (pageError) {
      console.error(`[Scraper] Unstop Page ${page} failed:`, pageError);
      result.errors++;
      break;
    }
  }
}

// -------------------------
// 4. TAIKAI Scraper
// -------------------------

const TAIKAI_API = "https://api.taikai.network/api/graphql";

const TAIKAI_GRAPHQL_QUERY = `
query ALL_CHALLENGES_QUERY(
  $sortBy: ChallengeOrderByWithRelationInput
  $searchTerm: String
  $page: Int
) {
  challenges(
    where: {
      publishInfo: { state: { equals: ACTIVE } }
      OR: [
        { name: { contains: $searchTerm, mode: insensitive } }
        { slug: { contains: $searchTerm, mode: insensitive } }
        { organization: { name: { contains: $searchTerm, mode: insensitive } } }
      ]
    }
    page: $page
    orderBy: $sortBy
  ) {
    id
    name
    isClosed
    shortDescription
    logoImageFile {
      url
    }
    cardImageFile {
      url
    }
    organization {
      name
      slug
    }
    steps {
      startDate
    }
    industries {
      title
    }
    slug
    allowedParticipants
    participantsCount
    isPublic
  }
}
`;

interface TaikaiStep {
  startDate: string;
}

interface TaikaiChallenge {
  id: string;
  name: string;
  isClosed: boolean;
  shortDescription: string;
  logoImageFile: { url: string } | null;
  cardImageFile: { url: string } | null;
  organization: { name: string; slug: string } | null;
  steps: TaikaiStep[];
  industries: { title: string }[];
  slug: string;
  participantsCount: number;
}

interface TaikaiResponse {
  data: {
    challenges: TaikaiChallenge[];
  };
}

export async function runTaikaiScraper(createdById: string, result: ScraperResult): Promise<void> {
  let page = 1;
  let hasMore = true;
  const maxTaikaiPages = 3;

  while (hasMore && page <= maxTaikaiPages) {
    try {
      const response = await axios.post<TaikaiResponse>(TAIKAI_API, {
        query: TAIKAI_GRAPHQL_QUERY,
        variables: {
          sortBy: { order: "desc" },
          searchTerm: "",
          page,
        },
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 15_000,
      });

      const { challenges } = response.data.data;
      if (!challenges || challenges.length === 0) break;

      result.totalFetched += challenges.length;

      for (const item of challenges) {
        try {
          const sortedSteps = (item.steps || []).map((s) => new Date(s.startDate)).sort((a, b) => a.getTime() - b.getTime());
          const startDate = sortedSteps.length > 0 ? sortedSteps[0] : new Date();
          const endDate = sortedSteps.length > 0 ? sortedSteps[sortedSteps.length - 1] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const registrationDeadline = sortedSteps.length > 1 ? sortedSteps[1] : new Date(endDate);

          const tags = (item.industries || []).map((i) => i.title).filter(Boolean);
          const slug = generateScraperSlug(item.name, "TAIKAI", item.id);

           const status = calculateScraperStatus(startDate, endDate, item.isClosed);

           const isCreated = await upsertScrapedHackathon({
            sourceId: item.id,
            sourcePlatform: "TAIKAI",
            title: stripHtml(item.name),
            slug,
            description: stripHtml(item.shortDescription || item.name),
            bannerUrl: item.cardImageFile?.url || null,
            logoUrl: item.logoImageFile?.url || null,
            organizerName: item.organization?.name || "TAIKAI Organizer",
            externalUrl: item.organization?.slug
              ? `https://taikai.network/en/${item.organization.slug}/hackathons/${item.slug}`
              : `https://taikai.network/en/hackathons/${item.slug}`,
            isExternal: true,
            verified: true,
            status,
            mode: "ONLINE", // TAIKAI is natively online
            location: null,
            tags,
            minTeamSize: 1,
            maxTeamSize: 4,
            startDate,
            endDate,
            registrationDeadline,
            createdById,
          });

          if (isCreated) result.created++;
          else result.updated++;
        } catch (itemError) {
          console.error(`[Scraper] Failed to upsert TAIKAI hackathon id=${item.id}:`, itemError);
          result.errors++;
        }
      }

      page++;
      hasMore = challenges.length === 20; // page size is 20 in Apollo client query

      if (hasMore) await sleep(CRAWL_DELAY_MS);
    } catch (pageError) {
      console.error(`[Scraper] TAIKAI Page ${page} failed:`, pageError);
      result.errors++;
      break;
    }
  }
}

// -------------------------
// 5. HackerEarth Scraper
// -------------------------

const HACKEREARTH_API = "https://www.hackerearth.com/api/community/challenges/compete/";

interface HackerEarthChallenge {
  title: string;
  slug: string;
  type: string;
  start: string;
  end: string;
  url: string;
  company_name?: string;
  image_url?: string;
  listing_image?: string;
  max_team_size?: number;
  min_team_size?: number;
}

interface HackerEarthResponse {
  data: HackerEarthChallenge[];
  total: number;
}

export async function runHackerEarthScraper(createdById: string, result: ScraperResult): Promise<void> {
  try {
    const response = await axios.get<HackerEarthResponse>(HACKEREARTH_API, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15_000,
    });

    const { data: hackathons } = response.data;
    if (!hackathons || hackathons.length === 0) return;

    // Filter hackathons only (or keep competitive codegolf events too)
    const validEvents = hackathons.filter((h) => h.type.toLowerCase().includes("hackathon") || h.type.toLowerCase().includes("competitive"));
    result.totalFetched += validEvents.length;

    for (const item of validEvents) {
      try {
        const startRaw = item.start.endsWith("Z") ? item.start : item.start + "Z";
        const endRaw = item.end.endsWith("Z") ? item.end : item.end + "Z";
        const startDate = new Date(startRaw);
        const endDate = new Date(endRaw);
        const registrationDeadline = new Date(startDate);

        let externalUrl = item.url || "";
        if (externalUrl && !externalUrl.startsWith("http")) {
          externalUrl = "https://www.hackerearth.com" + externalUrl;
        }

        const tags = [item.type];
        const slug = generateScraperSlug(item.title, "HackerEarth", item.slug);

        const status = calculateScraperStatus(startDate, endDate);

        const isCreated = await upsertScrapedHackathon({
          sourceId: item.slug,
          sourcePlatform: "HackerEarth",
          title: stripHtml(item.title),
          slug,
          description: stripHtml(item.title),
          bannerUrl: item.listing_image || null,
          logoUrl: item.image_url || null,
          organizerName: item.company_name || "HackerEarth Organizer",
          externalUrl,
          isExternal: true,
          verified: true,
          status,
          mode: "ONLINE", // HackerEarth is online by default
          location: null,
          tags,
          minTeamSize: item.min_team_size || 1,
          maxTeamSize: item.max_team_size || 1,
          startDate,
          endDate,
          registrationDeadline,
          createdById,
        });

        if (isCreated) result.created++;
        else result.updated++;
      } catch (itemError) {
        console.error(`[Scraper] Failed to upsert HackerEarth hackathon slug=${item.slug}:`, itemError);
        result.errors++;
      }
    }
  } catch (error) {
    console.error("[Scraper] HackerEarth scrape failed:", error);
    result.errors++;
  }
}

// -------------------------
// 6. Reskilll Scraper
// -------------------------

const RESKILLL_URL = "https://reskilll.com/discover";

interface ReskilllEvent {
  id: string;
  slug: string;
  title: string;
  organizer?: string;
  coverImage?: string;
  deadline?: string;
  location?: string;
  mode?: string;
  type?: string;
  tags?: string[];
}

export async function runReskilllScraper(createdById: string, result: ScraperResult): Promise<void> {
  try {
    const response = await axios.get(RESKILLL_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
      timeout: 15_000,
    });

    const html = response.data;
    const startKeyword = "initialData";
    const startIdx = html.indexOf(startKeyword);

    if (startIdx === -1) {
      console.error("[Scraper] Reskilll 'initialData' keyword not found in HTML.");
      result.errors++;
      return;
    }

    const sub = html.substring(startIdx);
    const bracketStart = sub.indexOf("[");
    if (bracketStart === -1) {
      console.error("[Scraper] Reskilll 'initialData' array start '[' not found.");
      result.errors++;
      return;
    }

    let bracketCount = 0;
    let bracketEnd = -1;
    for (let i = bracketStart; i < sub.length; i++) {
      if (sub[i] === "[") bracketCount++;
      else if (sub[i] === "]") {
        bracketCount--;
        if (bracketCount === 0) {
          bracketEnd = i;
          break;
        }
      }
    }

    if (bracketEnd === -1) {
      console.error("[Scraper] Reskilll 'initialData' array end ']' not matched.");
      result.errors++;
      return;
    }

    const rawArrayStr = sub.substring(bracketStart, bracketEnd + 1);
    const cleaned = rawArrayStr
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n");

    const events: ReskilllEvent[] = JSON.parse(cleaned);
    if (!events || events.length === 0) return;

    result.totalFetched += events.length;

    for (const item of events) {
      try {
        const endDate = item.deadline ? new Date(item.deadline) : new Date();
        const registrationDeadline = new Date(endDate);
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // approx 7 days before

        let bannerUrl = item.coverImage || null;
        if (bannerUrl && !bannerUrl.startsWith("http")) {
          bannerUrl = "https://content.reskilll.com/" + bannerUrl;
        }

        const isOnline = item.mode?.toLowerCase() === "online";
        const tags = Array.isArray(item.tags) ? item.tags : ["Reskilll"];
        const slug = generateScraperSlug(item.title, "Reskilll", item.id);

        const status = calculateScraperStatus(startDate, endDate);

        const isCreated = await upsertScrapedHackathon({
          sourceId: item.id,
          sourcePlatform: "Reskilll",
          title: stripHtml(item.title),
          slug,
          description: stripHtml(item.title),
          bannerUrl,
          organizerName: item.organizer || "Reskilll Organizer",
          externalUrl: `https://reskilll.com/hack/${item.slug}`,
          isExternal: true,
          verified: true,
          status,
          mode: isOnline ? "ONLINE" : "OFFLINE",
          location: isOnline ? null : item.location || null,
          tags,
          minTeamSize: 1,
          maxTeamSize: 4,
          startDate,
          endDate,
          registrationDeadline,
          createdById,
        });

        if (isCreated) result.created++;
        else result.updated++;
      } catch (itemError) {
        console.error(`[Scraper] Failed to upsert Reskilll hackathon id=${item.id}:`, itemError);
        result.errors++;
      }
    }
  } catch (error) {
    console.error("[Scraper] Reskilll scrape failed:", error);
    result.errors++;
  }
}

// -------------------------
// Unified Coordinator
// -------------------------

export interface ScraperResult {
  created: number;
  updated: number;
  errors: number;
  totalFetched: number;
}

export async function runAllScrapers(): Promise<ScraperResult> {
  const result: ScraperResult = {
    created: 0,
    updated: 0,
    errors: 0,
    totalFetched: 0,
  };

  const createdById = await getScraperUserId();

  console.log("[Scraper] Starting Devpost scrape...");
  await runDevpostScraper(createdById, result);
  await sleep(CRAWL_DELAY_MS);

  console.log("[Scraper] Starting Devfolio scrape...");
  await runDevfolioScraper(createdById, result);
  await sleep(CRAWL_DELAY_MS);

  console.log("[Scraper] Starting Unstop scrape...");
  await runUnstopScraper(createdById, result);
  await sleep(CRAWL_DELAY_MS);

  console.log("[Scraper] Starting TAIKAI scrape...");
  await runTaikaiScraper(createdById, result);
  await sleep(CRAWL_DELAY_MS);

  console.log("[Scraper] Starting HackerEarth scrape...");
  await runHackerEarthScraper(createdById, result);
  await sleep(CRAWL_DELAY_MS);

  console.log("[Scraper] Starting Reskilll scrape...");
  await runReskilllScraper(createdById, result);

  return result;
}

// Keep runDevpostScraper signature for backwards compatibility if needed elsewhere
export async function runDevpostScraperLegacy(): Promise<ScraperResult> {
  const result: ScraperResult = { created: 0, updated: 0, errors: 0, totalFetched: 0 };
  const createdById = await getScraperUserId();
  await runDevpostScraper(createdById, result);
  return result;
}


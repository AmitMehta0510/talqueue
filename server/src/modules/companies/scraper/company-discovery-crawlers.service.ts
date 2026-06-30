import puppeteer, { Browser } from "puppeteer";
import path from "path";
import fs from "fs";
import slugify from "slugify";
import winston from "winston";
import prisma from "shared/database/prisma";
import { generateRandomAlphanumeric } from "shared/utils/random";
import { processCompany, CompanyRow } from "./job-scraper.service";
import { syncJobsToElasticBulk } from "services/elasticSync";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [AutoCrawler] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/** Maximum companies to process per crawler run (avoids runaway Puppeteer usage). */
const MAX_CRAWL_PER_RUN = 50;

/** Delay in ms between Puppeteer page loads to avoid hammering servers. */
const CRAWL_DELAY_MS = 1500;

/** Puppeteer page timeout in milliseconds. */
const PAGE_TIMEOUT_MS = 20000;

/** Career page URL path suffixes to try in order. */
const CAREER_PAGE_PATHS = [
  "/careers",
  "/jobs",
  "/about/careers",
  "/company/jobs",
  "/work-with-us",
  "/join-us",
  "/en/careers",
];

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

/** Entry from top-companies.json */
interface TopCompanyEntry {
  name: string;
  websiteUrl: string;
  logoUrl?: string;
  tagline?: string;
  description?: string;
  headquarters?: string;
  country?: string;
  industry?: string;
  type?: string;
  size?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  careersPageUrl?: string;
}

/** Detected ATS board from a career page scan. */
export interface DetectedAts {
  atsSource: "greenhouse" | "lever" | "ashby" | "workday" | "bamboohr" | "icims" | "paylocity";
  atsToken: string;
}

/** Parsed JSON-LD job posting from a career page. */
export interface StandardJobPayload {
  title: string;
  description: string;
  location?: string;
  applyUrl?: string;
  postedAt?: Date;
  company?: string;
}

/** Summary result of one crawler run. */
export interface CrawlerRunResult {
  crawled: number;
  discovered: number;
  skipped: number;
  errors: number;
  jobsQueued: number;
}

// ---------------------------------------------------------------------------
// ATS SIGNATURE DETECTORS
// Pure functions — accept raw HTML string, return token or null.
// These are exported so unit tests can call them directly.
// ---------------------------------------------------------------------------

/** Regex patterns per ATS for extracting board tokens from page HTML/hrefs. */
const ATS_PATTERNS = {
  greenhouse: /boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/i,
  lever: /jobs\.lever\.co\/([a-zA-Z0-9_-]+)/i,
  // Ashby has two URL formats: jobs.ashbyhq.com/<token> and ashbyhq.com/embed/<token>
  ashby: /(?:jobs\.ashbyhq\.com|ashbyhq\.com\/embed)\/([a-zA-Z0-9_-]+)/i,
  // Workday: <company>.wd1.myworkdayjobs.com, wd2, wd3, wd5 etc.
  workday: /([a-zA-Z0-9-]+)\.wd\d+\.myworkdayjobs\.com/i,
  bamboohr: /([a-zA-Z0-9-]+)\.bamboohr\.com/i,
  icims: /(?:careers-)?([a-zA-Z0-9-]+)\.icims\.com/i,
  paylocity: /(?:recruiting\.paylocity\.com\/recruiting\/jobs\/All\/|orgGuid=)([a-zA-Z0-9-]+)/i,
} as const;

/**
 * Attempt to extract a Greenhouse board token from raw HTML content.
 * Returns the token string or null if not found.
 */
export function extractGreenhouseToken(html: string): string | null {
  const match = ATS_PATTERNS.greenhouse.exec(html);
  return match ? match[1] : null;
}

/**
 * Attempt to extract a Lever company slug from raw HTML content.
 * Returns the slug string or null if not found.
 */
export function extractLeverToken(html: string): string | null {
  const match = ATS_PATTERNS.lever.exec(html);
  return match ? match[1] : null;
}

/**
 * Attempt to extract an Ashby board token from raw HTML content.
 * Returns the token string or null if not found.
 */
export function extractAshbyToken(html: string): string | null {
  const match = ATS_PATTERNS.ashby.exec(html);
  return match ? match[1] : null;
}

/**
 * Attempt to extract a Workday company identifier from raw HTML content.
 * Returns the company subdomain string or null if not found.
 * Example: "google.wd1.myworkdayjobs.com" → "google"
 */
export function extractWorkdayToken(html: string): string | null {
  const match = ATS_PATTERNS.workday.exec(html);
  return match ? match[1] : null;
}

/**
 * Attempt to extract a BambooHR company subdomain token from raw HTML content.
 * Returns the token string or null if not found.
 */
export function extractBambooHRToken(html: string): string | null {
  const match = ATS_PATTERNS.bamboohr.exec(html);
  return match ? match[1] : null;
}

/**
 * Attempt to extract an iCIMS company token from raw HTML content.
 * Returns the token string or null if not found.
 */
export function extractIcimsToken(html: string): string | null {
  const match = ATS_PATTERNS.icims.exec(html);
  return match ? match[1] : null;
}

/**
 * Attempt to extract a Paylocity organization GUID/ID from raw HTML content.
 * Returns the token string or null if not found.
 */
export function extractPaylocityToken(html: string): string | null {
  const match = ATS_PATTERNS.paylocity.exec(html);
  return match ? match[1] : null;
}

/**
 * Run all ATS signature detectors against the given HTML string.
 * Returns the first match found (priority: Greenhouse → Lever → Ashby → Workday → BambooHR → iCIMS → Paylocity).
 */
export function detectAtsFromHtml(html: string): DetectedAts | null {
  const gh = extractGreenhouseToken(html);
  if (gh) return { atsSource: "greenhouse", atsToken: gh };

  const lv = extractLeverToken(html);
  if (lv) return { atsSource: "lever", atsToken: lv };

  const ab = extractAshbyToken(html);
  if (ab) return { atsSource: "ashby", atsToken: ab };

  const wd = extractWorkdayToken(html);
  if (wd) return { atsSource: "workday", atsToken: wd };

  const bb = extractBambooHRToken(html);
  if (bb) return { atsSource: "bamboohr", atsToken: bb };

  const ic = extractIcimsToken(html);
  if (ic) return { atsSource: "icims", atsToken: ic };

  const pl = extractPaylocityToken(html);
  if (pl) return { atsSource: "paylocity", atsToken: pl };

  return null;
}

// ---------------------------------------------------------------------------
// JSON-LD PARSER
// Parses <script type="application/ld+json"> blocks for JobPosting schemas.
// ---------------------------------------------------------------------------

/**
 * Parses all JSON-LD `<script type="application/ld+json">` blocks from raw HTML
 * and extracts any `@type: "JobPosting"` entries.
 *
 * This acts as a generic ATS-agnostic job extractor for enterprise career pages
 * that don't use Greenhouse/Lever/Ashby but do embed structured data.
 *
 * @returns Array of standardized job payloads (may be empty if none found).
 */
export function parseJsonLdJobs(html: string): StandardJobPayload[] {
  const results: StandardJobPayload[] = [];

  // Match all <script type="application/ld+json">...</script> blocks
  const scriptTagPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptTagPattern.exec(html)) !== null) {
    const jsonText = scriptMatch[1].trim();
    if (!jsonText) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Malformed JSON-LD block — skip silently
      continue;
    }

    // Handle both single schema objects and @graph arrays
    const schemas: unknown[] = Array.isArray(parsed)
      ? parsed
      : (parsed as any)?.["@graph"]
        ? (parsed as any)["@graph"]
        : [parsed];

    for (const schema of schemas) {
      if (!schema || typeof schema !== "object") continue;
      const s = schema as Record<string, any>;

      // Filter for JobPosting type
      if (s["@type"] !== "JobPosting") continue;

      const title = typeof s["title"] === "string" ? s["title"].trim() : "";
      if (!title) continue;

      // Extract plain-text description (strip HTML tags if present)
      let description = typeof s["description"] === "string" ? s["description"] : "";
      description = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      // Location from jobLocation.address.addressLocality / addressRegion
      let location: string | undefined;
      const jobLocation = s["jobLocation"];
      if (jobLocation && typeof jobLocation === "object") {
        const addr = (jobLocation as any)["address"];
        if (addr && typeof addr === "object") {
          const parts = [addr["addressLocality"], addr["addressRegion"], addr["addressCountry"]]
            .filter(Boolean)
            .join(", ");
          if (parts) location = parts;
        }
      }

      // Apply URL
      const applyUrl =
        typeof s["url"] === "string"
          ? s["url"]
          : typeof s["applicationContact"]?.url === "string"
            ? s["applicationContact"].url
            : undefined;

      // Posted date
      let postedAt: Date | undefined;
      if (typeof s["datePosted"] === "string") {
        const parsed = new Date(s["datePosted"]);
        if (!isNaN(parsed.getTime())) postedAt = parsed;
      }

      // Hiring organization name
      const company =
        typeof s["hiringOrganization"]?.name === "string"
          ? s["hiringOrganization"].name
          : undefined;

      results.push({ title, description: description || title, location, applyUrl, postedAt, company });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// PUPPETEER HELPERS
// ---------------------------------------------------------------------------

/** Sleep utility. */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Visits a company's career page using Puppeteer and returns the full page HTML.
 * Tries multiple path suffixes if the primary careersPageUrl fails.
 *
 * @param browser   - Active Puppeteer Browser instance.
 * @param baseUrl   - Company website base URL (e.g. "https://notion.so").
 * @param primaryCareerUrl - Optional direct careers page URL from top-companies.json.
 * @returns HTML string of the career page, or null if all attempts fail.
 */
async function fetchCareerPageHtml(
  browser: Browser,
  baseUrl: string,
  primaryCareerUrl?: string
): Promise<string | null> {
  const urlsToTry: string[] = [];

  // Prefer the explicit careers page URL if provided
  if (primaryCareerUrl) urlsToTry.push(primaryCareerUrl);

  // Build fallback URLs from base domain + known suffixes
  try {
    const parsedBase = new URL(baseUrl);
    const origin = parsedBase.origin;
    for (const suffix of CAREER_PAGE_PATHS) {
      const candidate = `${origin}${suffix}`;
      if (!urlsToTry.includes(candidate)) urlsToTry.push(candidate);
    }
  } catch {
    // Invalid base URL — nothing we can do
    return null;
  }

  const page = await browser.newPage();
  try {
    // Reduce resource load: block images, stylesheets, fonts
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      "Mozilla/5.0 (compatible; EngineersPlatformBot/1.0; +https://engineers.dev/bot)"
    );

    for (const url of urlsToTry) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS });
        const html = await page.content();
        if (html && html.length > 500) {
          return html;
        }
      } catch {
        // This URL failed — try the next one
      }
    }

    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// DB HELPERS
// ---------------------------------------------------------------------------

/** Loads top-companies.json from the data/ directory. */
function loadTopCompanies(): TopCompanyEntry[] {
  const filePath = path.join(__dirname, "data", "top-companies.json");
  if (!fs.existsSync(filePath)) {
    logger.warn("top-companies.json not found at " + filePath);
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as TopCompanyEntry[];
  } catch (err: any) {
    logger.error("Failed to parse top-companies.json: " + err.message);
    return [];
  }
}

/**
 * Resolves a company in the DB before any write operations.
 *
 * 1. ATS token already present → skip (processed before).
 * 2. Company exists by name but no token → link & scrape.
 * 3. Not in DB → create & scrape.
 */
type CrawlerAtsSource = "greenhouse" | "lever" | "ashby" | "workday" | "bamboohr" | "icims" | "paylocity";

/**
 * Resolves a company in the DB before any write operations.
 *
 * 1. ATS token already present → skip (processed before).
 * 2. Company exists by name but no token → link & scrape.
 * 3. Not in DB → create & scrape.
 */
async function resolveCompany(
  atsToken: string,
  atsSource: CrawlerAtsSource,
  name: string
): Promise<
  | { action: "skip" }
  | { action: "link"; id: string; slug: string; name: string }
  | { action: "create" }
> {
  // 1. Token-exact match → already indexed
  const byToken = await prisma.company.findFirst({
    where: { atsToken, atsSource },
    select: { id: true },
  });
  if (byToken) return { action: "skip" };

  // 2. Name match → link token to existing company
  const byName = await prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, slug: true, name: true },
  });
  if (byName) return { action: "link", id: byName.id, slug: byName.slug, name: byName.name };

  return { action: "create" };
}

/** Auto-creates a new company discovered by the autonomous crawler. */
async function autoCreateDiscoveredCompany(params: {
  entry: TopCompanyEntry;
  atsToken: string;
  atsSource: CrawlerAtsSource;
}): Promise<{ id: string; slug: string }> {
  const { entry, atsToken, atsSource } = params;
  const baseDomain = (() => {
    try { return new URL(entry.websiteUrl).hostname.replace(/^www\./, ""); } catch { return ""; }
  })();

  const baseSlug =
    slugify(entry.name, { lower: true, strict: true, trim: true }) || `company-${Date.now()}`;
  const slug = `${baseSlug}-${generateRandomAlphanumeric(5)}`;

  const company = await prisma.company.create({
    data: {
      name: entry.name,
      slug,
      logoUrl: entry.logoUrl || (baseDomain ? `https://logo.clearbit.com/${baseDomain}` : undefined),
      websiteUrl: entry.websiteUrl,
      tagline: entry.tagline,
      description: entry.description,
      headquarters: entry.headquarters,
      country: entry.country,
      industry: entry.industry,
      type: (entry.type as any) ?? undefined,
      size: (entry.size as any) ?? undefined,
      linkedinUrl: entry.linkedinUrl,
      githubUrl: entry.githubUrl,
      careersPageUrl: entry.careersPageUrl,
      verified: false,
      discoveredVia: "auto-crawler",
      hiringEnabled: true,
      referralEnabled: false,
      atsToken,
      atsSource,
    },
    select: { id: true, slug: true },
  });

  return { id: company.id, slug: company.slug };
}

/** Links an ATS token to an existing company record. */
async function linkToken(
  companyId: string,
  atsToken: string,
  atsSource: CrawlerAtsSource
): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: { atsToken, atsSource, discoveredVia: "auto-crawler" },
  });
}

// ---------------------------------------------------------------------------
// MAIN CRAWLER
// ---------------------------------------------------------------------------

/**
 * Autonomous Company Discovery Crawler.
 *
 * For each company in `top-companies.json` that hasn't been indexed yet:
 *  1. Launch Puppeteer → visit career page.
 *  2. Scan HTML for ATS signature patterns (Greenhouse / Lever / Ashby / Workday).
 *  3. Also parse JSON-LD `<script type="application/ld+json">` blocks for JobPosting schemas.
 *  4. On ATS match: upsert company with atsToken/atsSource and queue job scraping.
 *  5. Log every step via Winston.
 *
 * **Workday** companies are detected and indexed (atsToken = company subdomain),
 * but job scraping for Workday is queued only when a dedicated Workday scraper is available.
 *
 * @returns Summary of the crawl run.
 */
export async function runAutonomousCrawler(): Promise<CrawlerRunResult> {
  const result: CrawlerRunResult = {
    crawled: 0,
    discovered: 0,
    skipped: 0,
    errors: 0,
    jobsQueued: 0,
  };

  const companies = loadTopCompanies();
  if (companies.length === 0) {
    logger.warn("No companies found in top-companies.json — aborting crawler.");
    return result;
  }

  logger.info(`Starting autonomous crawler. ${companies.length} companies in source list. Budget: ${MAX_CRAWL_PER_RUN}.`);

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });

    for (const entry of companies) {
      if (result.crawled >= MAX_CRAWL_PER_RUN) {
        logger.info(`Crawl budget (${MAX_CRAWL_PER_RUN}) reached — stopping.`);
        break;
      }

      // Quick pre-check: skip if already indexed with a known ATS token
      const existingByName = await prisma.company.findFirst({
        where: { name: { equals: entry.name, mode: "insensitive" } },
        select: { id: true, atsToken: true },
      });

      if (existingByName?.atsToken) {
        logger.info(`SKIP "${entry.name}" — already has ATS token.`);
        result.skipped++;
        continue;
      }

      logger.info(`Crawling career page for "${entry.name}" (${entry.websiteUrl})...`);
      result.crawled++;

      let html: string | null = null;
      try {
        html = await fetchCareerPageHtml(browser, entry.websiteUrl, entry.careersPageUrl);
      } catch (err: any) {
        logger.error(`Puppeteer error for "${entry.name}": ${err.message}`);
        result.errors++;
        await sleep(CRAWL_DELAY_MS);
        continue;
      }

      if (!html) {
        logger.warn(`No career page HTML found for "${entry.name}" — skipping.`);
        result.skipped++;
        await sleep(CRAWL_DELAY_MS);
        continue;
      }

      // --- ATS Signature Detection ---
      const atsDetection = detectAtsFromHtml(html);

      if (!atsDetection) {
        // Try JSON-LD as fallback — log any jobs found but don't upsert without a source token
        const jsonLdJobs = parseJsonLdJobs(html);
        if (jsonLdJobs.length > 0) {
          logger.info(
            `No ATS signature but found ${jsonLdJobs.length} JSON-LD job(s) for "${entry.name}". ` +
              `Skipping (no atsToken to index against).`
          );
        } else {
          logger.info(`No ATS signature or JSON-LD jobs found for "${entry.name}".`);
        }
        result.skipped++;
        await sleep(CRAWL_DELAY_MS);
        continue;
      }

      const { atsSource, atsToken } = atsDetection;
      logger.info(`Detected ${atsSource.toUpperCase()} board "${atsToken}" for "${entry.name}".`);

      // --- Resolve / upsert company ---
      const resolution = await resolveCompany(atsToken, atsSource, entry.name);

      if (resolution.action === "skip") {
        logger.info(`SKIP "${entry.name}" — atsToken already in DB.`);
        result.skipped++;
        await sleep(CRAWL_DELAY_MS);
        continue;
      }

      let companyId: string;
      let companySlug: string;
      let companyName: string;

      if (resolution.action === "link") {
        logger.info(`LINK "${resolution.name}" → ${atsSource}:${atsToken}`);
        await linkToken(resolution.id, atsToken, atsSource);
        companyId = resolution.id;
        companySlug = resolution.slug;
        companyName = resolution.name;
      } else {
        logger.info(`CREATE "${entry.name}" → ${atsSource}:${atsToken}`);
        const created = await autoCreateDiscoveredCompany({ entry, atsToken, atsSource });
        companyId = created.id;
        companySlug = created.slug;
        companyName = entry.name;
      }

      result.discovered++;

      // --- Queue job scraping for all supported ATS sources ---
      if (
        atsSource === "greenhouse" ||
        atsSource === "lever" ||
        atsSource === "ashby" ||
        atsSource === "workday" ||
        atsSource === "bamboohr" ||
        atsSource === "icims" ||
        atsSource === "paylocity"
      ) {
        const baseDomain = (() => {
          try { return new URL(entry.websiteUrl).hostname.replace(/^www\./, ""); } catch { return ""; }
        })();

        const companyRow: CompanyRow = {
          id: companyId,
          name: companyName,
          slug: companySlug,
          headquarters: entry.headquarters ?? null,
          country: entry.country ?? null,
          websiteUrl: entry.websiteUrl,
          atsToken,
          atsSource,
        };

        try {
          const processResult = await processCompany(companyRow);
          if (processResult.processedJobIds.length > 0) {
            await syncJobsToElasticBulk(processResult.processedJobIds);
            result.jobsQueued += processResult.processedJobIds.length;
            logger.info(
              `Jobs scraped for "${companyName}": ${processResult.created} created, ${processResult.updated} updated.`
            );
          } else {
            logger.info(`No new jobs found for "${companyName}".`);
          }
        } catch (err: any) {
          logger.error(`Job scraping failed for "${companyName}": ${err.message}`);
          result.errors++;
        }
      } else {
        logger.info(
          `"${companyName}" uses ${(atsSource as string).toUpperCase()} — job scraper is pending implementation. Company indexed.`
        );
      }

      await sleep(CRAWL_DELAY_MS);
    }
  } catch (err: any) {
    logger.error("Fatal crawler error: " + err.message);
    result.errors++;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  logger.info(
    `Crawler complete. Crawled: ${result.crawled}, Discovered: ${result.discovered}, ` +
      `Skipped: ${result.skipped}, Errors: ${result.errors}, Jobs Queued: ${result.jobsQueued}.`
  );

  return result;
}

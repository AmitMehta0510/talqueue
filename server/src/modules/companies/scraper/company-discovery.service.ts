import fs from "fs";
import path from "path";
import axios from "axios";
import slugify from "slugify";
import prisma from "shared/database/prisma";
import { generateRandomAlphanumeric } from "shared/utils/random";
import { processCompany, CompanyRow } from "./job-scraper.service";
import { syncJobsToElasticBulk } from "services/elasticSync";
import { enrichCompanyMeta } from "infra/enrichment/company-enrichment.service";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/**
 * Maximum number of NEW companies to auto-create per discovery run.
 * Tune this to control DB growth rate and API load.
 */
const MAX_DISCOVERED_COMPANIES = 150;

/** Delay in ms between individual ATS API requests to avoid rate-limiting. */
const REQUEST_DELAY_MS = 250;

// ---------------------------------------------------------------------------
// BOT DETECTION SURVIVAL — UA pool, jitter, exponential backoff
// ---------------------------------------------------------------------------

/**
 * Rotating User-Agent pool — mimics real browser sessions across 2K+ requests.
 * Prevents fingerprinting from a static UA string that Cloudflare/Lever detect.
 */
const UA_POOL: string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.207 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.122 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

/** Returns a pseudo-random User-Agent string from the pool. */
function pickRandomUA(): string {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

/**
 * Sleeps for `baseMs` ± half of `windowMs` milliseconds.
 * Replaces all static `sleep(REQUEST_DELAY_MS)` calls in discovery loops.
 * Minimum enforced delay: 80ms (prevents accidental sub-100ms burst).
 *
 * @param baseMs   Centre of the delay window (ms).
 * @param windowMs Total width of the jitter window (ms). Default 400.
 */
function jitteredDelay(baseMs: number, windowMs = 400): Promise<void> {
  const jitter = Math.floor(Math.random() * windowMs) - windowMs / 2;
  const delay = Math.max(80, baseMs + jitter);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Resilient HTTP GET with:
 *  - Randomised User-Agent header on every request (from UA_POOL)
 *  - Browser-like Accept/Accept-Language/Cache-Control headers
 *  - Exponential backoff on HTTP 429 (rate-limited) and 503 (service unavailable)
 *  - Hard-throw on non-retriable errors (other 4xx, network errors)
 *
 * @param url     Full URL to GET.
 * @param retries Max retry attempts on 429/503. Default: 3.
 * @returns       Axios response object.
 * @throws        On max retries exceeded or non-retriable error.
 */
async function resilientGet(url: string, retries = 3): Promise<any> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await axios.get(url, {
        timeout: 8000,
        headers: {
          "User-Agent":      pickRandomUA(),
          "Accept":          "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection":      "keep-alive",
          "Cache-Control":   "no-cache",
        },
      });
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;

      if ((status === 429 || status === 503) && attempt < retries) {
        // Exponential backoff: 1 s → 2 s → 4 s + random jitter
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(
          `[Discovery] resilientGet: HTTP ${status} on ${url} — ` +
          `retry ${attempt + 1}/${retries} after ${Math.round(backoff)}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
        attempt++;
        continue;
      }

      // Non-retriable: propagate immediately
      throw err;
    }
  }

  throw new Error(`[Discovery] resilientGet: max retries (${retries}) exceeded for ${url}`);
}

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface GreenhouseBoardEntry {
  token: string;
  name: string;
  domain: string;
  industry: string;
}

interface LeverCompanyEntry {
  slug: string;
  name: string;
  domain: string;
  industry: string;
}

interface DiscoveryResult {
  discovered: number;
  skipped: number;
  jobsCreated: number;
  jobsUpdated: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Loads a JSON seed file from the data/ directory.
 */
function loadSeedFile<T>(filename: string): T[] {
  const filePath = path.join(__dirname, "data", filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[Discovery] Seed file not found: ${filePath}`);
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[];
  } catch (err) {
    console.error(`[Discovery] Failed to parse seed file ${filename}:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// HYBRID LOOKUP HELPERS
// ---------------------------------------------------------------------------

/**
 * Hybrid 3-way lookup for company discovery:
 *
 * 1. Token match  - company already linked to this ATS board (processed before). Skip.
 * 2. Name match   - company exists in DB but not yet linked to this token. Link and scrape.
 * 3. No match     - brand-new company. Auto-create, link, and scrape.
 */
async function resolveCompanyByAtsToken(
  atsToken: string,
  atsSource: "greenhouse" | "lever" | "ashby",
  name: string
): Promise<
  | { action: "skip" }
  | { action: "link"; id: string; slug: string; name: string }
  | { action: "create" }
> {
  // 1. Token-first lookup - was this board already linked in a prior run?
  const byToken = await prisma.company.findFirst({
    where: { atsToken, atsSource },
    select: { id: true, slug: true, name: true },
  });
  if (byToken) {
    return { action: "skip" };
  }

  // 2. Name match - company exists but has not been linked to this ATS token yet
  const byName = await prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, slug: true, name: true },
  });
  if (byName) {
    return { action: "link", id: byName.id, slug: byName.slug, name: byName.name };
  }

  // 3. Neither - brand new board
  return { action: "create" };
}

/**
 * Links an ATS board token to an existing company record.
 */
async function linkAtsTokenToCompany(
  companyId: string,
  atsToken: string,
  atsSource: "greenhouse" | "lever" | "ashby"
): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: { atsToken, atsSource },
  });
}

/**
 * Auto-creates a new company discovered from an ATS aggregate scan.
 * Marks it verified=false and stamps discoveredVia, atsToken, atsSource.
 */
async function autoCreateCompany(params: {
  name: string;
  domain: string;
  industry: string;
  discoveredVia: string;
  atsToken: string;
  atsSource: "greenhouse" | "lever" | "ashby";
}): Promise<{ id: string; slug: string }> {
  const { name, domain, industry, discoveredVia, atsToken, atsSource } = params;
  const baseSlug = slugify(name, { lower: true, strict: true, trim: true }) || `company-${Date.now()}`;
  const slug = `${baseSlug}-${generateRandomAlphanumeric(5)}`;

  // --- 3-stage metadata enrichment (fail-soft; never throws) ---
  const meta = await enrichCompanyMeta(domain);

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      logoUrl: meta.logoUrl ?? `https://logo.clearbit.com/${domain}`,
      coverImageUrl: `https://picsum.photos/seed/${domain}/1200/400`,
      websiteUrl: `https://${domain}`,
      careersPageUrl: `https://${domain}/careers`,
      // Enriched fields — only set if the pipeline returned them
      description: meta.description ?? null,
      tagline: meta.tagline ?? null,
      type: meta.type ?? undefined,
      size: meta.size ?? undefined,
      totalEmployees: meta.totalEmployees ?? undefined,
      // Industry: prefer enriched value, fall back to the seed file's classification
      industry: meta.industry ?? industry,
      verified: false,
      discoveredVia,
      hiringEnabled: true,
      referralEnabled: false,
      atsToken,
      atsSource,
    },
    select: { id: true, slug: true },
  });

  return { id: company.id, slug: company.slug };
}

// ---------------------------------------------------------------------------
// GREENHOUSE DISCOVERY
// ---------------------------------------------------------------------------

/**
 * Scans the curated greenhouse-boards.json list and discovers companies.
 *
 * Uses a hybrid 3-way upsert pipeline:
 * - Already linked by token -> skip (processed in prior run)
 * - Exists by name but no token -> link atsToken + scrape fresh jobs
 * - New board entirely -> auto-create company + link + scrape
 */
async function discoverGreenhouseCompanies(
  budget: number,
  result: DiscoveryResult
): Promise<void> {
  const boards = loadSeedFile<GreenhouseBoardEntry>("greenhouse-boards.json");
  if (boards.length === 0) return;

  console.log(`[Discovery] Greenhouse: checking ${boards.length} boards against DB...`);

  for (const board of boards) {
    if (result.discovered >= budget) {
      console.log(`[Discovery] Greenhouse: discovery budget (${budget}) reached, stopping.`);
      break;
    }

    try {
      const resolution = await resolveCompanyByAtsToken(board.token, "greenhouse", board.name);

      // Already linked in a prior run
      if (resolution.action === "skip") {
        result.skipped++;
        continue;
      }

      // Verify the board token actually has jobs before doing any work
      let hasJobs = false;
      try {
        const res = await resilientGet(
          `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs`
        );
        hasJobs = (res.data?.jobs?.length ?? 0) > 0;
      } catch {
        hasJobs = false;
      }

      let companyId: string;
      let companySlug: string;
      let companyName: string;

      if (resolution.action === "link") {
        // Existing company, link the token and scrape jobs
        console.log(
          `[Discovery] Greenhouse: linking existing company "${resolution.name}" to token "${board.token}"`
        );
        await linkAtsTokenToCompany(resolution.id, board.token, "greenhouse");
        companyId = resolution.id;
        companySlug = resolution.slug;
        companyName = resolution.name;
      } else {
        // Brand-new company - auto-create
        console.log(
          `[Discovery] Greenhouse: creating new company "${board.name}" (token: ${board.token})`
        );
        const created = await autoCreateCompany({
          name: board.name,
          domain: board.domain,
          industry: board.industry,
          discoveredVia: "greenhouse-aggregate",
          atsToken: board.token,
          atsSource: "greenhouse",
        });
        companyId = created.id;
        companySlug = created.slug;
        companyName = board.name;
      }

      // Scrape jobs for this company
      let processResult = { processedJobIds: [] as string[], created: 0, updated: 0 };
      if (hasJobs) {
        const companyRow: CompanyRow = {
          id: companyId,
          name: companyName,
          slug: companySlug,
          headquarters: null,
          country: null,
          websiteUrl: `https://${board.domain}`,
          atsToken: board.token,
          atsSource: "greenhouse",
        };

        processResult = await processCompany(companyRow);

        if (processResult.processedJobIds.length > 0) {
          await syncJobsToElasticBulk(processResult.processedJobIds);
        }
      }

      result.discovered++;
      result.jobsCreated += processResult.created;
      result.jobsUpdated += processResult.updated;

      console.log(
        `[Discovery] Greenhouse: ok "${companyName}" - jobs: ${processResult.created} created, ${processResult.updated} updated`
      );

      await jitteredDelay(REQUEST_DELAY_MS);
    } catch (err: any) {
      console.error(`[Discovery] Greenhouse: error processing "${board.name}":`, err?.message || err);
      result.errors++;
      await jitteredDelay(REQUEST_DELAY_MS);
    }
  }
}

// ---------------------------------------------------------------------------
// LEVER DISCOVERY
// ---------------------------------------------------------------------------

/**
 * Scans the curated lever-companies.json list and discovers companies.
 * Uses the same hybrid 3-way upsert pipeline as Greenhouse.
 */
async function discoverLeverCompanies(
  budget: number,
  result: DiscoveryResult
): Promise<void> {
  const companies = loadSeedFile<LeverCompanyEntry>("lever-companies.json");
  if (companies.length === 0) return;

  console.log(`[Discovery] Lever: checking ${companies.length} companies against DB...`);

  for (const entry of companies) {
    if (result.discovered >= budget) {
      console.log(`[Discovery] Lever: discovery budget (${budget}) reached, stopping.`);
      break;
    }

    try {
      const resolution = await resolveCompanyByAtsToken(entry.slug, "lever", entry.name);

      // Already linked in a prior run
      if (resolution.action === "skip") {
        result.skipped++;
        continue;
      }

      // Verify the Lever slug has active postings
      let hasJobs = false;
      try {
        const res = await resilientGet(
          `https://api.lever.co/v0/postings/${entry.slug}?mode=json&limit=1`
        );
        hasJobs = Array.isArray(res.data) && res.data.length > 0;
      } catch {
        hasJobs = false;
      }

      let companyId: string;
      let companySlug: string;
      let companyName: string;

      if (resolution.action === "link") {
        // Existing company, link the token and scrape jobs
        console.log(
          `[Discovery] Lever: linking existing company "${resolution.name}" to slug "${entry.slug}"`
        );
        await linkAtsTokenToCompany(resolution.id, entry.slug, "lever");
        companyId = resolution.id;
        companySlug = resolution.slug;
        companyName = resolution.name;
      } else {
        // Brand-new company - auto-create
        console.log(
          `[Discovery] Lever: creating new company "${entry.name}" (slug: ${entry.slug})`
        );
        const created = await autoCreateCompany({
          name: entry.name,
          domain: entry.domain,
          industry: entry.industry,
          discoveredVia: "lever-aggregate",
          atsToken: entry.slug,
          atsSource: "lever",
        });
        companyId = created.id;
        companySlug = created.slug;
        companyName = entry.name;
      }

      // Scrape jobs for this company
      let processResult = { processedJobIds: [] as string[], created: 0, updated: 0 };
      if (hasJobs) {
        const companyRow: CompanyRow = {
          id: companyId,
          name: companyName,
          slug: companySlug,
          headquarters: null,
          country: null,
          websiteUrl: `https://${entry.domain}`,
          atsToken: entry.slug,
          atsSource: "lever",
        };

        processResult = await processCompany(companyRow);

        if (processResult.processedJobIds.length > 0) {
          await syncJobsToElasticBulk(processResult.processedJobIds);
        }
      }

      result.discovered++;
      result.jobsCreated += processResult.created;
      result.jobsUpdated += processResult.updated;

      console.log(
        `[Discovery] Lever: ok "${companyName}" - jobs: ${processResult.created} created, ${processResult.updated} updated`
      );

      await jitteredDelay(REQUEST_DELAY_MS);
    } catch (err: any) {
      console.error(`[Discovery] Lever: error processing "${entry.name}":`, err?.message || err);
      result.errors++;
      await jitteredDelay(REQUEST_DELAY_MS);
    }
  }
}

// ---------------------------------------------------------------------------
// MAIN ENTRY POINT
// ---------------------------------------------------------------------------

/**
 * Runs the nightly company discovery pipeline.
 *
 * Hybrid 3-way upsert logic per board:
 *  a. Token already linked in DB -> skip (board was processed in a prior run)
 *  b. Name matches an existing DB company -> link atsToken + scrape fresh jobs
 *  c. Completely new -> auto-create company + link atsToken + scrape jobs
 *
 * This fixes the "Discovered: 0, Skipped: 178" regression where the old
 * name-only check caused all pre-seeded companies (Airtable, Gusto, etc.)
 * to be unconditionally skipped, preventing any job scraping.
 */
export async function runCompanyDiscovery(): Promise<DiscoveryResult> {
  console.log("[Discovery] Starting nightly company discovery scan...");
  console.log(`[Discovery] Budget: up to ${MAX_DISCOVERED_COMPANIES} new companies per run.`);

  const result: DiscoveryResult = {
    discovered: 0,
    skipped: 0,
    jobsCreated: 0,
    jobsUpdated: 0,
    errors: 0,
  };

  // Phase A: Greenhouse (~55% of budget)
  const greenhouseBudget = Math.ceil(MAX_DISCOVERED_COMPANIES * 0.55);
  await discoverGreenhouseCompanies(greenhouseBudget, result);

  // Phase B: Lever (remaining budget)
  const leverBudget = MAX_DISCOVERED_COMPANIES - result.discovered;
  if (leverBudget > 0) {
    await discoverLeverCompanies(leverBudget, result);
  }

  console.log(
    `[Discovery] Completed. Discovered: ${result.discovered}, Skipped: ${result.skipped}, ` +
    `Jobs Created: ${result.jobsCreated}, Jobs Updated: ${result.jobsUpdated}, Errors: ${result.errors}`
  );

  return result;
}

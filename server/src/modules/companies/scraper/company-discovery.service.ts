import fs from "fs";
import path from "path";
import slugify from "slugify";
import prisma from "shared/database/prisma";
import { generateRandomAlphanumeric } from "shared/utils/random";
import { processCompany, CompanyRow } from "./job-scraper.service";
import { syncJobsToElasticBulk } from "services/elasticSync";
import { enrichCompanyMeta } from "infra/enrichment/company-enrichment.service";
import { resilientGet, resilientPost, jitteredDelay } from "shared/services/network/resilientHttp";

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
type AllowedAtsSource = "greenhouse" | "lever" | "ashby" | "bamboohr" | "icims" | "paylocity";

async function resolveCompanyByAtsToken(
  atsToken: string,
  atsSource: AllowedAtsSource,
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
  atsSource: AllowedAtsSource
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
  atsSource: AllowedAtsSource;
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
// ATS DISCOVERY PIPELINE
// ---------------------------------------------------------------------------

interface AtsBoardEntry {
  token?: string;
  slug?: string;
  name: string;
  domain: string;
  industry: string;
}

/**
 * Generalized ATS company discovery process.
 * Handles duplicate checks, job verification, database upserts, and job scraping.
 */
async function discoverAtsCompanies(
  atsSource: AllowedAtsSource,
  seedFilename: string,
  verifyJobsFn: (token: string) => Promise<boolean>,
  budget: number,
  result: DiscoveryResult
): Promise<void> {
  const entries = loadSeedFile<AtsBoardEntry>(seedFilename);
  if (entries.length === 0) return;

  const platformName = atsSource.toUpperCase();
  console.log(`[Discovery] ${platformName}: checking ${entries.length} entries against DB...`);

  for (const entry of entries) {
    if (result.discovered >= budget) {
      console.log(`[Discovery] ${platformName}: discovery budget (${budget}) reached, stopping.`);
      break;
    }

    const token = entry.token || entry.slug;
    if (!token) continue;

    try {
      const resolution = await resolveCompanyByAtsToken(token, atsSource, entry.name);

      if (resolution.action === "skip") {
        result.skipped++;
        continue;
      }

      // Verify the board actually has jobs before linking or creating
      const hasJobs = await verifyJobsFn(token);

      let companyId: string;
      let companySlug: string;
      let companyName: string;

      if (resolution.action === "link") {
        console.log(
          `[Discovery] ${platformName}: linking existing company "${resolution.name}" to token "${token}"`
        );
        await linkAtsTokenToCompany(resolution.id, token, atsSource);
        companyId = resolution.id;
        companySlug = resolution.slug;
        companyName = resolution.name;
      } else {
        console.log(
          `[Discovery] ${platformName}: creating new company "${entry.name}" (token: ${token})`
        );
        const created = await autoCreateCompany({
          name: entry.name,
          domain: entry.domain,
          industry: entry.industry,
          discoveredVia: `${atsSource}-aggregate`,
          atsToken: token,
          atsSource,
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
          atsToken: token,
          atsSource,
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
        `[Discovery] ${platformName}: ok "${companyName}" - jobs: ${processResult.created} created, ${processResult.updated} updated`
      );

      await jitteredDelay(REQUEST_DELAY_MS);
    } catch (err: any) {
      console.error(`[Discovery] ${platformName}: error processing "${entry.name}":`, err?.message || err);
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

  // Phase A: Greenhouse (40% of budget)
  const greenhouseBudget = Math.ceil(MAX_DISCOVERED_COMPANIES * 0.40);
  await discoverAtsCompanies(
    "greenhouse",
    "greenhouse-boards.json",
    async (token) => {
      try {
        const res = await resilientGet(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
        return (res.data?.jobs?.length ?? 0) > 0;
      } catch {
        return false;
      }
    },
    greenhouseBudget,
    result
  );

  // Phase B: Lever (20% of budget)
  const leverBudget = Math.ceil(MAX_DISCOVERED_COMPANIES * 0.20);
  if (result.discovered < MAX_DISCOVERED_COMPANIES) {
    await discoverAtsCompanies(
      "lever",
      "lever-companies.json",
      async (token) => {
        try {
          const res = await resilientGet(`https://api.lever.co/v0/postings/${token}?mode=json&limit=1`);
          return Array.isArray(res.data) && res.data.length > 0;
        } catch {
          return false;
        }
      },
      leverBudget,
      result
    );
  }

  // Phase C: Ashby (10% of budget)
  const ashbyBudget = Math.ceil(MAX_DISCOVERED_COMPANIES * 0.10);
  if (result.discovered < MAX_DISCOVERED_COMPANIES) {
    await discoverAtsCompanies(
      "ashby",
      "ashby-companies.json",
      async (token) => {
        try {
          const res = await resilientPost(`https://api.ashbyhq.com/posting-api/job-board/${token}`, {});
          return (res.data?.jobs?.length ?? 0) > 0;
        } catch {
          return false;
        }
      },
      ashbyBudget,
      result
    );
  }

  // Phase D: BambooHR (10% of budget)
  const bamboohrBudget = Math.ceil(MAX_DISCOVERED_COMPANIES * 0.10);
  if (result.discovered < MAX_DISCOVERED_COMPANIES) {
    await discoverAtsCompanies(
      "bamboohr",
      "bamboohr-companies.json",
      async (token) => {
        try {
          const res = await resilientGet(`https://${token}.bamboohr.com/careers/list`);
          const raw = res.data?.result ?? res.data ?? [];
          return Array.isArray(raw) && raw.length > 0;
        } catch {
          return false;
        }
      },
      bamboohrBudget,
      result
    );
  }

  // Phase E: iCIMS (10% of budget)
  const icimsBudget = Math.ceil(MAX_DISCOVERED_COMPANIES * 0.10);
  if (result.discovered < MAX_DISCOVERED_COMPANIES) {
    await discoverAtsCompanies(
      "icims",
      "icims-companies.json",
      async (token) => {
        try {
          const res = await resilientGet(`https://careers-${token}.icims.com/sitemap.xml`);
          return typeof res.data === "string" && res.data.includes("<url>");
        } catch {
          return false;
        }
      },
      icimsBudget,
      result
    );
  }

  // Phase F: Paylocity (remaining budget)
  const paylocityBudget = MAX_DISCOVERED_COMPANIES - result.discovered;
  if (paylocityBudget > 0 && result.discovered < MAX_DISCOVERED_COMPANIES) {
    await discoverAtsCompanies(
      "paylocity",
      "paylocity-companies.json",
      async (token) => {
        try {
          const res = await resilientGet(`https://recruiting.paylocity.com/recruiting/jobs/All/${token}/`);
          return typeof res.data === "string" && res.data.includes("window.pageData");
        } catch {
          return false;
        }
      },
      paylocityBudget,
      result
    );
  }

  console.log(
    `[Discovery] Completed. Discovered: ${result.discovered}, Skipped: ${result.skipped}, ` +
    `Jobs Created: ${result.jobsCreated}, Jobs Updated: ${result.jobsUpdated}, Errors: ${result.errors}`
  );

  return result;
}

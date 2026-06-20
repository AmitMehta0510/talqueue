import fs from "fs";
import path from "path";
import axios from "axios";
import slugify from "slugify";
import prisma from "shared/database/prisma";
import { generateRandomAlphanumeric } from "shared/utils/random";
import { processCompany, CompanyRow } from "./job-scraper.service";
import { syncJobsToElasticBulk } from "services/elasticSync";

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

/**
 * Checks if a company already exists in the DB by name (case-insensitive).
 * Returns the existing company ID if found, or null if new.
 */
async function findExistingCompany(name: string): Promise<string | null> {
  const existing = await prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  return existing?.id ?? null;
}

/**
 * Auto-creates a new company discovered from an ATS aggregate scan.
 * Marks it verified=false and stamps discoveredVia so admins can review.
 */
async function autoCreateCompany(params: {
  name: string;
  domain: string;
  industry: string;
  discoveredVia: string;
}): Promise<string> {
  const { name, domain, industry, discoveredVia } = params;
  const baseSlug = slugify(name, { lower: true, strict: true, trim: true }) || `company-${Date.now()}`;
  const slug = `${baseSlug}-${generateRandomAlphanumeric(5)}`;

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      logoUrl: `https://logo.clearbit.com/${domain}`,
      websiteUrl: `https://${domain}`,
      careersPageUrl: `https://${domain}/careers`,
      industry,
      verified: false,
      discoveredVia,
      hiringEnabled: true,
      referralEnabled: false,
    },
    select: { id: true },
  });

  return company.id;
}

// ---------------------------------------------------------------------------
// GREENHOUSE DISCOVERY
// ---------------------------------------------------------------------------

/**
 * Scans the curated greenhouse-boards.json list and discovers companies
 * not yet in the DB. Auto-creates them and immediately scrapes their jobs.
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
      // Check if already in DB
      const existingId = await findExistingCompany(board.name);
      if (existingId) {
        result.skipped++;
        continue;
      }

      // Verify the board token actually has jobs before creating the company
      let hasJobs = false;
      try {
        const res = await axios.get(
          `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs`,
          { timeout: 8000 }
        );
        hasJobs = (res.data?.jobs?.length ?? 0) > 0;
      } catch {
        // Board doesn't exist or is private — skip silently
        result.skipped++;
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      if (!hasJobs) {
        result.skipped++;
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      // Auto-create the company
      console.log(`[Discovery] Greenhouse: creating new company "${board.name}" (token: ${board.token})`);
      const companyId = await autoCreateCompany({
        name: board.name,
        domain: board.domain,
        industry: board.industry,
        discoveredVia: "greenhouse-aggregate",
      });

      // Run a targeted job scrape for this new company
      const companyRow: CompanyRow = {
        id: companyId,
        name: board.name,
        slug: `${slugify(board.name, { lower: true, strict: true })}-*`, // will be resolved from DB
        headquarters: null,
        country: null,
        websiteUrl: `https://${board.domain}`,
      };

      // Fetch the actual slug from DB (needed for GREENHOUSE_TOKENS lookup)
      const saved = await prisma.company.findUnique({
        where: { id: companyId },
        select: { slug: true },
      });
      if (saved) companyRow.slug = saved.slug;

      // Override slug for token matching: use the board token directly
      // The processCompany function looks up GREENHOUSE_TOKENS[company.slug],
      // so we temporarily patch the slug to the board token for this call.
      const patchedRow: CompanyRow = { ...companyRow, slug: board.token };

      const processResult = await processCompany(patchedRow);

      // Fix slug back to actual DB slug for ES sync
      if (processResult.processedJobIds.length > 0) {
        await syncJobsToElasticBulk(processResult.processedJobIds);
      }

      result.discovered++;
      result.jobsCreated += processResult.created;
      result.jobsUpdated += processResult.updated;

      console.log(
        `[Discovery] Greenhouse: ✓ "${board.name}" — jobs: ${processResult.created} created, ${processResult.updated} updated`
      );

      await sleep(REQUEST_DELAY_MS);
    } catch (err: any) {
      console.error(`[Discovery] Greenhouse: error processing "${board.name}":`, err?.message || err);
      result.errors++;
      await sleep(REQUEST_DELAY_MS);
    }
  }
}

// ---------------------------------------------------------------------------
// LEVER DISCOVERY
// ---------------------------------------------------------------------------

/**
 * Scans the curated lever-companies.json list and discovers companies
 * not yet in the DB. Auto-creates them and immediately scrapes their jobs.
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
      // Check if already in DB
      const existingId = await findExistingCompany(entry.name);
      if (existingId) {
        result.skipped++;
        continue;
      }

      // Verify the Lever slug has active postings
      let hasJobs = false;
      try {
        const res = await axios.get(
          `https://api.lever.co/v0/postings/${entry.slug}?mode=json&limit=1`,
          { timeout: 8000 }
        );
        hasJobs = Array.isArray(res.data) && res.data.length > 0;
      } catch {
        result.skipped++;
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      if (!hasJobs) {
        result.skipped++;
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      // Auto-create the company
      console.log(`[Discovery] Lever: creating new company "${entry.name}" (slug: ${entry.slug})`);
      const companyId = await autoCreateCompany({
        name: entry.name,
        domain: entry.domain,
        industry: entry.industry,
        discoveredVia: "lever-aggregate",
      });

      // Build a company row where the slug matches the LEVER_TOKENS key
      // We patch the slug to the Lever slug so processCompany() can look it up.
      const companyRow: CompanyRow = {
        id: companyId,
        name: entry.name,
        slug: entry.slug, // patched to match LEVER_TOKENS key
        headquarters: null,
        country: null,
        websiteUrl: `https://${entry.domain}`,
      };

      const processResult = await processCompany(companyRow);

      if (processResult.processedJobIds.length > 0) {
        await syncJobsToElasticBulk(processResult.processedJobIds);
      }

      result.discovered++;
      result.jobsCreated += processResult.created;
      result.jobsUpdated += processResult.updated;

      console.log(
        `[Discovery] Lever: ✓ "${entry.name}" — jobs: ${processResult.created} created, ${processResult.updated} updated`
      );

      await sleep(REQUEST_DELAY_MS);
    } catch (err: any) {
      console.error(`[Discovery] Lever: error processing "${entry.name}":`, err?.message || err);
      result.errors++;
      await sleep(REQUEST_DELAY_MS);
    }
  }
}

// ---------------------------------------------------------------------------
// MAIN ENTRY POINT
// ---------------------------------------------------------------------------

/**
 * Runs the nightly company discovery pipeline.
 *
 * 1. Loads curated Greenhouse and Lever board lists.
 * 2. Cross-references against existing DB companies.
 * 3. For each new company found (up to MAX_DISCOVERED_COMPANIES):
 *    a. Verifies the ATS board has active job postings.
 *    b. Auto-creates the company with verified=false, discoveredVia=<source>.
 *    c. Immediately scrapes and stores the company's tech jobs.
 *    d. Syncs the jobs to Elasticsearch.
 * 4. Returns a summary report.
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

  // Phase A: Greenhouse
  const greenhouseBudget = Math.ceil(MAX_DISCOVERED_COMPANIES * 0.55); // ~55% from Greenhouse
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

import axios from "axios";
import slugify from "slugify";
import prisma from "shared/database/prisma";
import { JobType, WorkMode, JobStatus } from "@prisma/client";
import { syncJobsToElasticBulk } from "services/elasticSync";

// ---------------------------------------------------------------------------
// CONCURRENCY UTILITIES
// ---------------------------------------------------------------------------

/** Yields control back to the Node.js macrotask queue between batch iterations
 *  so that pending I/O callbacks, timers, and other event-loop work can run. */
const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

/** Splits an array into fixed-size chunks. */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/** Number of companies processed concurrently within each batch. */
const BATCH_SIZE = 10;

// Mapping of seeded companies to their public Greenhouse board tokens
const GREENHOUSE_TOKENS: Record<string, string> = {
  "stripe": "stripe",
  "airbnb": "airbnb",
  "figma": "figma",
  "uber": "uber",
  "lyft": "lyft",
  "coinbase": "coinbase",
  "robinhood": "robinhood",
  "supabase": "supabase",
  "sentry": "sentry",
  "openai": "openai",
  "anthropic": "anthropic",
  "hugging-face": "huggingface",
  "scale-ai": "scaleai",
  "clerk": "clerk",
  "docker": "docker",
  "vercel": "vercel",
  "retool": "retool",
  "razorpay": "razorpay",
  "inmobi": "inmobi",
  "onetrust-india": "onetrust",
  // Additional companies added via Phase 1 expansion
  "palantir": "palantir",
  "snowflake": "snowflake",
  "datadog": "datadoghq",
  "cloudflare": "cloudflare",
  "okta": "okta",
  "hashicorp": "hashicorp",
  "pagerduty": "pagerduty",
  "mongodb": "mongodb",
  "cockroach-labs": "cockroachlabs",
  "postman": "postman",
};

// Mapping of seeded companies to their public Ashby board tokens
const ASHBY_TOKENS: Record<string, string> = {
  "linear": "linear",
};

// Mapping of seeded companies to their public Lever job board slugs
const LEVER_TOKENS: Record<string, string> = {
  "shopify": "shopify",
  "spotify": "spotify",
  "canva": "canva",
  "atlassian": "atlassian",
  "dropbox": "dropbox",
  "twilio": "twilio",
  "gitlab": "gitlab",
  "github": "github",
  "notion": "notion",
  "netlify": "netlify",
  "digital-ocean": "digitalocean",
  "new-relic": "newrelic",
  "elastic": "elastic",
  "fastly": "fastly",
  "bytedance": "bytedance",
  "databricks": "databricks",
  "zoom": "zoom",
  "slack": "slack",
  "adobe": "adobe",
};

// Tech role keywords to filter out non-technical roles
const TECH_ROLE_KEYWORDS = [
  "engineer", "developer", "software", "backend", "frontend", "fullstack",
  "product manager", "designer", "data scientist", "data analyst", "devops",
  "sre", "architect", "machine learning", "ui/ux", "product design", "qa",
  "test engineer", "technical", "engineering", "programmer", "ml", "ai", "cloud",
  "infrastructure", "platform", "security", "research", "analytics", "database",
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Strips HTML tags from a string and collapses whitespace.
 * Used to convert rich-text job descriptions from ATSes into plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Returns true if the job title is a tech/engineering role OR an internship/co-op.
 * Internships are always included regardless of tech keywords — they are highly
 * relevant to this platform's engineering student audience.
 */
function isTechOrInternRole(title: string): boolean {
  const t = title.toLowerCase();
  // Always include internships / co-ops
  if (t.includes("intern") || t.includes("co-op") || t.includes("coop")) return true;
  return TECH_ROLE_KEYWORDS.some(keyword => t.includes(keyword));
}

/** @deprecated Use isTechOrInternRole instead */
function isTechRole(title: string): boolean {
  return isTechOrInternRole(title);
}

// Helper to parse job type from title
function parseJobType(title: string): JobType {
  const t = title.toLowerCase();
  // Internship / Co-op patterns
  if (t.includes("intern") || t.includes("co-op") || t.includes("coop")) return "INTERNSHIP";
  // Entry-level / Fresher / New Grad / Campus patterns
  if (
    t.includes("fresher") ||
    t.includes("new grad") ||
    t.includes("new graduate") ||
    t.includes("graduate trainee") ||
    t.includes("campus hire") ||
    t.includes("entry level") ||
    t.includes("entry-level") ||
    t.includes("associate engineer") ||
    t.includes("junior engineer")
  ) return "ENTRY_LEVEL";
  if (t.includes("contract") || t.includes("contractor")) return "CONTRACT";
  if (t.includes("part-time") || t.includes("part time")) return "PART_TIME";
  if (t.includes("freelance")) return "FREELANCE";
  return "FULL_TIME";
}

// Helper to parse work mode from location.
// Allow-list approach: only explicit 'remote'/'hybrid' keywords get those modes.
// Any city name, office address, or unrecognised string defaults to ONSITE.
function parseWorkMode(location: string): WorkMode {
  const l = location.toLowerCase();
  if (l.includes("remote") || l.includes("anywhere") || l.includes("distributed")) return "REMOTE";
  if (l.includes("hybrid")) return "HYBRID";
  // City names, office addresses, and anything else → ONSITE
  return "ONSITE";
}

// Helper to extract skills from title and description
const SKILL_KEYWORDS = {
  "React": ["react", "frontend", "ui"],
  "TypeScript": ["typescript", "ts"],
  "Node.js": ["node.js", "nodejs", "node", "backend"],
  "Python": ["python", "django", "flask", "ml", "data science"],
  "Go": ["golang", " go "],
  "Rust": ["rust"],
  "PostgreSQL": ["postgres", "postgresql", "sql", "database"],
  "Docker": ["docker", "container", "devops"],
  "Kubernetes": ["kubernetes", "k8s"],
  "AWS": ["aws", "amazon web services", "cloud"],
  "GCP": ["gcp", "google cloud"],
  "Next.js": ["nextjs", "next.js"],
  "TailwindCSS": ["tailwind"],
  "GraphQL": ["graphql"],
  "Java": ["java", "spring", "jvm"],
  "Scala": ["scala"],
  "Ruby": ["ruby", "rails"],
  "C++": ["c++", "cpp"],
};

function extractSkills(title: string, desc: string): string[] {
  const text = `${title} ${desc}`.toLowerCase();
  const skills: string[] = [];
  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      skills.push(skill);
    }
  }
  if (skills.length === 0) {
    skills.push("TypeScript", "Node.js");
  }
  return skills;
}

// Helper to generate realistic tech descriptions (used as fallback for mock companies only)
function getJobDescription(title: string, companyName: string): { description: string, requirements: string, responsibilities: string } {
  const isLead = title.toLowerCase().includes("senior") || title.toLowerCase().includes("lead") || title.toLowerCase().includes("staff");
  
  const responsibilities = [
    `Design, build, and maintain efficient, reusable, and reliable code at ${companyName}.`,
    `Collaborate with product managers, designers, and fellow engineers to ship high-impact features.`,
    isLead 
      ? "Mentor junior team members and guide overall technical architecture decisions." 
      : "Participate actively in code reviews and team design discussions.",
    "Identify bottlenecks and bugs, and devise solutions to mitigate these issues."
  ].join("\n");

  const requirements = [
    `Strong background in computer science or equivalent engineering experience.`,
    `Experience working in modern software development teams and version control systems.`,
    isLead 
      ? "5+ years of software engineering experience in similar high-scale environments."
      : "2+ years of software engineering experience.",
    "Familiarity with containerization, cloud systems, and database management."
  ].join("\n");

  const description = `We are looking for a talented ${title} to join our engineering division at ${companyName}. You will play a crucial role in building the next generation of our platforms, designing scalable backend systems or intuitive frontend interfaces, and driving overall product excellence.`;

  return {
    description,
    requirements,
    responsibilities
  };
}

// Local mock templates for non-ATS companies
const MOCK_JOBS_TEMPLATES = [
  { title: "Software Engineer II, Product", type: "FULL_TIME", workMode: "HYBRID" },
  { title: "Senior Software Engineer, Core Systems", type: "FULL_TIME", workMode: "HYBRID" },
  { title: "Staff DevOps Engineer, Infrastructure", type: "FULL_TIME", workMode: "REMOTE" },
  { title: "Product Manager, Developer Experience", type: "FULL_TIME", workMode: "HYBRID" },
  { title: "Frontend Engineer, Design Systems", type: "FULL_TIME", workMode: "HYBRID" },
  { title: "Software Engineering Intern", type: "INTERNSHIP", workMode: "HYBRID" }
];

// ---------------------------------------------------------------------------
// PER-COMPANY PROCESSOR
// ---------------------------------------------------------------------------

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  headquarters: string | null;
  country: string | null;
  websiteUrl: string | null;
  careersPageUrl?: string | null;
}

interface ProcessResult {
  created: number;
  updated: number;
  staleArchived: number;
  processedJobIds: string[];
}

/**
 * Processes all jobs for a single company (Greenhouse / Lever / Ashby / mock fallback).
 * Returns counts and the IDs of every upserted job for downstream Elastic sync.
 *
 * Inner try/catch absorbs network and Prisma errors so a single company failure
 * never breaks the surrounding batch.
 */
export async function processCompany(company: CompanyRow): Promise<ProcessResult> {
  const result: ProcessResult = { created: 0, updated: 0, staleArchived: 0, processedJobIds: [] };
  const activeSlugs: string[] = [];
  const lookupKey = company.slug.replace(/-[a-z0-9]{5}$/i, "");
  const greenhouseToken = GREENHOUSE_TOKENS[lookupKey];
  const ashbyToken = ASHBY_TOKENS[lookupKey];
  const leverToken = LEVER_TOKENS[lookupKey];

  try {
    if (greenhouseToken) {
      // ------------------------------------------------------------------
      // Greenhouse ATS
      // ------------------------------------------------------------------
      const response = await axios.get(
        `https://boards-api.greenhouse.io/v1/boards/${greenhouseToken}/jobs`,
        { timeout: 10000 }
      );
      const rawJobs = response.data.jobs || [];
      const techJobs = rawJobs.filter((job: any) => isTechOrInternRole(job.title)).slice(0, 12);

      for (const job of techJobs) {
        const jobTitle = job.title;
        const externalId = `greenhouse-${job.id}`;
        const slug = slugify(`${company.slug}-${jobTitle}-${job.id}`, { lower: true, strict: true }) || `job-${job.id}`;
        activeSlugs.push(slug);

        // Use real description from Greenhouse if available; fall back to generated
        let rawDescription = "";
        if (job.content) {
          rawDescription = stripHtml(job.content);
        }
        const { description: generatedDesc, requirements, responsibilities } = getJobDescription(jobTitle, company.name);
        const description = rawDescription.length > 50 ? rawDescription : generatedDesc;

        const type = parseJobType(jobTitle);
        const locationName = job.location?.name || company.headquarters || "Remote";
        const workMode = parseWorkMode(locationName);
        const skillsRequired = extractSkills(jobTitle, description);

        const upserted = await prisma.job.upsert({
          where: { slug },
          create: {
            companyId: company.id,
            title: jobTitle,
            slug,
            description,
            requirements,
            responsibilities,
            location: locationName,
            type,
            workMode,
            applyUrl: job.absolute_url || `https://boards.greenhouse.io/${greenhouseToken}/jobs/${job.id}`,
            skillsRequired,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "greenhouse",
            postedAt: job.updated_at ? new Date(job.updated_at) : null,
          },
          update: {
            title: jobTitle,
            description,
            requirements,
            responsibilities,
            location: locationName,
            type,
            workMode,
            applyUrl: job.absolute_url || `https://boards.greenhouse.io/${greenhouseToken}/jobs/${job.id}`,
            skillsRequired,
            status: "OPEN",
            atsSource: "greenhouse",
            postedAt: job.updated_at ? new Date(job.updated_at) : null,
          }
        });

        result.processedJobIds.push(upserted.id);
        if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
          result.created++;
        } else {
          result.updated++;
        }
      }

    } else if (leverToken) {
      // ------------------------------------------------------------------
      // Lever ATS
      // ------------------------------------------------------------------
      const response = await axios.get(
        `https://api.lever.co/v0/postings/${leverToken}?mode=json`,
        { timeout: 10000 }
      );
      const rawJobs: any[] = Array.isArray(response.data) ? response.data : [];
      const techJobs = rawJobs.filter((job: any) => isTechOrInternRole(job.text)).slice(0, 12);

      for (const job of techJobs) {
        const jobTitle = job.text;
        const externalId = `lever-${job.id}`;
        const slug = slugify(`${company.slug}-${jobTitle}-${job.id}`, { lower: true, strict: true }) || `job-${job.id}`;
        activeSlugs.push(slug);

        // Lever provides structured description in job.descriptionPlain or job.description (HTML)
        let rawDescription = "";
        if (job.descriptionPlain) {
          rawDescription = job.descriptionPlain.trim();
        } else if (job.description) {
          rawDescription = stripHtml(job.description);
        }

        // Extract requirements and responsibilities from Lever's 'lists' array
        let requirements = "";
        let responsibilities = "";
        if (Array.isArray(job.lists)) {
          for (const section of job.lists) {
            const heading = (section.text || "").toLowerCase();
            const content = stripHtml(section.content || "");
            if (heading.includes("requirement") || heading.includes("qualif")) {
              requirements = content;
            } else if (heading.includes("responsib") || heading.includes("what you") || heading.includes("role")) {
              responsibilities = content;
            }
          }
        }

        const { description: generatedDesc, requirements: generatedReq, responsibilities: generatedResp } = getJobDescription(jobTitle, company.name);
        const description = rawDescription.length > 50 ? rawDescription : generatedDesc;
        const finalRequirements = requirements || generatedReq;
        const finalResponsibilities = responsibilities || generatedResp;

        const type = parseJobType(jobTitle);
        // Lever location is in job.categories.location
        const locationName = job.categories?.location || job.workplaceType || company.headquarters || "Remote";
        const workMode = parseWorkMode(locationName);
        const skillsRequired = extractSkills(jobTitle, description);
        const applyUrl = job.hostedUrl || `https://jobs.lever.co/${leverToken}/${job.id}`;

        const upserted = await prisma.job.upsert({
          where: { slug },
          create: {
            companyId: company.id,
            title: jobTitle,
            slug,
            description,
            requirements: finalRequirements || null,
            responsibilities: finalResponsibilities || null,
            location: locationName,
            type,
            workMode,
            applyUrl,
            skillsRequired,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "lever",
            postedAt: job.createdAt ? new Date(job.createdAt) : null,
          },
          update: {
            title: jobTitle,
            description,
            requirements: finalRequirements || null,
            responsibilities: finalResponsibilities || null,
            location: locationName,
            type,
            workMode,
            applyUrl,
            skillsRequired,
            status: "OPEN",
            atsSource: "lever",
            postedAt: job.createdAt ? new Date(job.createdAt) : null,
          }
        });

        result.processedJobIds.push(upserted.id);
        if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
          result.created++;
        } else {
          result.updated++;
        }
      }

    } else if (ashbyToken) {
      // ------------------------------------------------------------------
      // Ashby ATS
      // ------------------------------------------------------------------
      const response = await axios.post(
        `https://api.ashbyhq.com/posting-api/job-board/${ashbyToken}`,
        {},
        { timeout: 10000 }
      );
      const rawJobs = response.data.jobs || [];
      const techJobs = rawJobs.filter((job: any) => isTechOrInternRole(job.title)).slice(0, 12);

      for (const job of techJobs) {
        const jobTitle = job.title;
        const externalId = `ashby-${job.id}`;
        const slug = slugify(`${company.slug}-${jobTitle}-${job.id}`, { lower: true, strict: true }) || `job-${job.id}`;
        activeSlugs.push(slug);

        const descPlain = job.descriptionPlain || "";
        const requirements = job.requirementsPlain || "";
        const responsibilities = job.responsibilitiesPlain || "";
        const type = parseJobType(jobTitle);
        const locationName = job.location || company.headquarters || "Remote";
        const workMode = parseWorkMode(locationName);
        const skillsRequired = extractSkills(jobTitle, `${descPlain} ${jobTitle}`);

        const upserted = await prisma.job.upsert({
          where: { slug },
          create: {
            companyId: company.id,
            title: jobTitle,
            slug,
            description: descPlain || jobTitle,
            requirements: requirements || null,
            responsibilities: responsibilities || null,
            location: locationName,
            type,
            workMode,
            applyUrl: job.jobUrl || `https://jobs.ashbyhq.com/${ashbyToken}/${job.id}`,
            skillsRequired,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "ashby",
          },
          update: {
            title: jobTitle,
            description: descPlain || jobTitle,
            requirements: requirements || null,
            responsibilities: responsibilities || null,
            location: locationName,
            type,
            workMode,
            applyUrl: job.jobUrl || `https://jobs.ashbyhq.com/${ashbyToken}/${job.id}`,
            skillsRequired,
            status: "OPEN",
            atsSource: "ashby",
          }
        });

        result.processedJobIds.push(upserted.id);
        if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
          result.created++;
        } else {
          result.updated++;
        }
      }

    } else {
      // ------------------------------------------------------------------
      // Fallback: template mock jobs
      // ------------------------------------------------------------------
      const numJobs = 3 + (company.name.length % 3); // 3 to 5 jobs
      for (let i = 0; i < numJobs; i++) {
        const template = MOCK_JOBS_TEMPLATES[i % MOCK_JOBS_TEMPLATES.length];
        const jobTitle = template.title;
        const externalId = `mock-${company.slug}-${i}`;
        const slug = slugify(`${company.slug}-${jobTitle}-${i}`, { lower: true, strict: true });
        activeSlugs.push(slug);

        const { description, requirements, responsibilities } = getJobDescription(jobTitle, company.name);
        const locationName = company.headquarters || "Remote";
        const skillsRequired = extractSkills(jobTitle, description);
        // Use the company's dedicated careers page URL if available; fall back to
        // websiteUrl + /careers; null if neither is set (frontend shows generic CTA).
        const mockApplyUrl = company.careersPageUrl || (company.websiteUrl ? `${company.websiteUrl}/careers` : null);

        const upserted = await prisma.job.upsert({
          where: { slug },
          create: {
            companyId: company.id,
            title: jobTitle,
            slug,
            description,
            requirements,
            responsibilities,
            location: locationName,
            type: template.type as JobType,
            workMode: template.workMode as WorkMode,
            applyUrl: mockApplyUrl,
            skillsRequired,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "mock",
          },
          update: {
            title: jobTitle,
            description,
            requirements,
            responsibilities,
            location: locationName,
            type: template.type as JobType,
            workMode: template.workMode as WorkMode,
            applyUrl: mockApplyUrl,
            skillsRequired,
            status: "OPEN",
            atsSource: "mock",
          }
        });

        result.processedJobIds.push(upserted.id);
        if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
          result.created++;
        } else {
          result.updated++;
        }
      }
    }

    // Cleanup stale jobs for this company (only scraped/external ones)
    const deletedResult = await prisma.job.deleteMany({
      where: {
        companyId: company.id,
        slug: { notIn: activeSlugs },
        // Only delete external/scraped jobs, don't delete manually added jobs by users
        externalJobId: { not: null }
      }
    });
    result.staleArchived = deletedResult.count;

  } catch (err) {
    // Inner catch: absorbs all network / Prisma / ATS API errors per company.
    console.error(`[Job Scraper] Failed to process jobs for company ${company.name}:`, err);
  }

  return result;
}

// ---------------------------------------------------------------------------
// MAIN ENTRY POINT
// ---------------------------------------------------------------------------

/**
 * Runs the job scraping and seeding process using a Chunked Concurrent Batch
 * Processing Framework:
 *
 *  • Companies are split into chunks of BATCH_SIZE (10) items.
 *  • Each chunk is executed concurrently via Promise.allSettled so that one
 *    company failure never cancels sibling work within the same batch.
 *  • Unexpected rejections that bypass the inner try/catch are caught and
 *    logged at the batch level.
 *  • After each batch, processed job IDs are synced to Elasticsearch in
 *    smaller increments rather than a single end-of-run call.
 *  • setImmediate yields control back to the event loop between batches so
 *    that pending I/O and timer callbacks are not starved.
 */
export async function runJobScrape() {
  console.log("[Job Scraper] Starting job scraping and seeding...");

  // Fetch all companies from database
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true, headquarters: true, country: true, websiteUrl: true, careersPageUrl: true }
  });

  let created = 0;
  let updated = 0;
  let staleArchived = 0;
  let totalProcessed = 0;
  const allProcessedJobIds: string[] = [];

  const batches = chunkArray(companies, BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`[Job Scraper] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} companies)...`);

    // Run all companies in this batch concurrently; settle individually so
    // that one failure does not abort sibling work.
    const settlements = await Promise.allSettled(batch.map(processCompany));

    const batchJobIds: string[] = [];

    for (let i = 0; i < settlements.length; i++) {
      const settlement = settlements[i];

      if (settlement.status === "fulfilled") {
        const r = settlement.value;
        created += r.created;
        updated += r.updated;
        staleArchived += r.staleArchived;
        batchJobIds.push(...r.processedJobIds);
        allProcessedJobIds.push(...r.processedJobIds);
        totalProcessed++;
      } else {
        // Outer catch: unexpected rejection that bypassed the inner try/catch.
        console.error(
          `[Job Scraper] Unexpected batch rejection for company "${batch[i].name}":`,
          settlement.reason
        );
      }
    }

    // Sync this batch's jobs to Elasticsearch in incremental steps.
    if (batchJobIds.length > 0) {
      await syncJobsToElasticBulk(batchJobIds);
    }

    // Yield to the event loop before starting the next batch so that pending
    // I/O callbacks (DB connections, timers, etc.) are not starved.
    await yieldToEventLoop();
  }

  console.log(
    `[Job Scraper] Seeding complete. Processed: ${totalProcessed} companies. ` +
    `Created: ${created}, Updated: ${updated}, Stale Cleaned: ${staleArchived}`
  );

  return {
    totalProcessed,
    created,
    updated,
    staleArchived
  };
}

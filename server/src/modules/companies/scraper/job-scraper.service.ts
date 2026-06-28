import axios from "axios";
import slugify from "slugify";
import prisma from "shared/database/prisma";
import { JobType, WorkMode, JobStatus } from "@prisma/client";
import { syncJobsToElasticBulk } from "services/elasticSync";
import { resilientGet, resilientPost } from "../../../lib/resilientHttp";

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
  // Fast-pass: all internship/trainee/entry-level patterns must mirror classifyJobType Tier 2
  // so these roles are never discarded before classification.
  if (
    t.includes("intern") ||
    t.includes("co-op") || t.includes("coop") ||
    t.includes("trainee") || t.includes("traineeship") ||
    t.includes("apprentice") ||
    t.includes("fresher") ||
    t.includes("new grad") || t.includes("new graduate") ||
    t.includes("campus hire") || t.includes("campus recruit") ||
    t.includes("summer program") || t.includes("winter program") ||
    t.includes("graduate engineer") || t.includes("graduate hire")
  ) return true;
  return TECH_ROLE_KEYWORDS.some(keyword => t.includes(keyword));
}

/** @deprecated Use isTechOrInternRole instead */
function isTechRole(title: string): boolean {
  return isTechOrInternRole(title);
}

// ---------------------------------------------------------------------------
// INTERNSHIP CLASSIFIER — Tier 1 (ATS field) / Tier 2 (title) / Tier 3 (desc)
// ---------------------------------------------------------------------------

/** Tier 3: Description-level patterns. Scanned on first 800 chars only. */
const INTERNSHIP_DESC_PATTERNS: RegExp[] = [
  /\bstipend\b/i,
  /\bpaid\s+intern(ship)?\b/i,
  /\b(3|4|6)\s*[-\u2013]\s*month(s)?\s+(internship|program|placement)\b/i,
  /\bsummer\s+internship\b/i,
  /\binternship\s+program\b/i,
  /\bplacement\s+program\b/i,
];

/**
 * Classifies a job into a JobType using a 3-tier strategy:
 *
 *  Tier 1 — ATS structured employment type field (highest signal, zero false positives):
 *    - Lever:       job.categories?.commitment  ("Internship" | "Full-time" | "Part-time" | "Contract")
 *    - Ashby:       job.employmentType          ("Intern" | "FullTime" | "PartTime" | "Contract" | "Temporary")
 *    - Greenhouse:  job.metadata is null on the public board API — falls through to Tier 2
 *    - Workday:     no structured field exposed in CXS payload — falls through to Tier 2
 *
 *  Tier 2 — Extended title regex (15 patterns: intern/co-op/trainee/apprentice/fresher/campus)
 *  Tier 3 — Description scan (first 800 chars: stipend/duration/placement keywords)
 *
 * @param title             Job title string from ATS
 * @param description       Plain-text job description (HTML stripped)
 * @param atsEmploymentType Raw structured employment type from ATS (optional)
 */
function classifyJobType(
  title: string,
  description: string,
  atsEmploymentType?: string | null
): JobType {
  // ── Tier 1: ATS structured field ────────────────────────────────────────
  if (atsEmploymentType) {
    const e = atsEmploymentType.toLowerCase();
    // Lever:  "Internship" | "Full-time" | "Part-time" | "Contract"
    // Ashby:  "Intern"     | "FullTime"  | "PartTime"  | "Contract" | "Temporary"
    if (e === "internship" || e === "intern")           return "INTERNSHIP";
    if (e === "part-time"  || e === "parttime")         return "PART_TIME";
    if (e === "contract")                               return "CONTRACT";
    if (e === "temporary")                              return "CONTRACT"; // Ashby Temporary → CONTRACT
    if (e === "full-time"  || e === "fulltime")         return "FULL_TIME";
    // Unknown value: fall through to Tier 2
  }

  // ── Tier 2: Title regex ──────────────────────────────────────────────────
  const t = title.toLowerCase();

  // INTERNSHIP patterns (ordered by specificity)
  if (/\bintern(ship)?\b/i.test(t))                                                     return "INTERNSHIP";
  if (/\bco[-\s]?op\b/i.test(t))                                                        return "INTERNSHIP";
  if (/\btraineeship\b/i.test(t))                                                        return "INTERNSHIP";
  if (/\b(industrial|graduate|summer|winter|spring|seasonal)\s+train(ee|ing)\b/i.test(t)) return "INTERNSHIP";
  if (/\bapprentice(ship)?\b/i.test(t))                                                  return "INTERNSHIP";
  if (/\b(summer|winter|spring)\s+(program|fellow(ship)?|analyst|associate)\b/i.test(t)) return "INTERNSHIP";
  if (/\bcampus\s+(hire|recruit|program)\b/i.test(t))                                    return "INTERNSHIP";

  // ENTRY_LEVEL patterns
  if (/\bfresher\b/i.test(t))                             return "ENTRY_LEVEL";
  if (/\bnew\s+grad(uate)?\b/i.test(t))                  return "ENTRY_LEVEL";
  if (/\bgraduate\s+(trainee|hire|engineer)\b/i.test(t)) return "ENTRY_LEVEL";
  if (/\bentry[-\s]level\b/i.test(t))                    return "ENTRY_LEVEL";
  if (/\bassociate\s+engineer\b/i.test(t))               return "ENTRY_LEVEL";
  if (/\bjunior\s+engineer\b/i.test(t))                  return "ENTRY_LEVEL";

  // Other types
  if (/\bcontract(or)?\b/i.test(t)) return "CONTRACT";
  if (/\bpart[-\s]time\b/i.test(t)) return "PART_TIME";
  if (/\bfreelance\b/i.test(t))     return "FREELANCE";

  // ── Tier 3: Description scan (tiebreaker for ambiguous titles) ───────────
  const descSample = description.slice(0, 800);
  if (INTERNSHIP_DESC_PATTERNS.some((rx) => rx.test(descSample))) return "INTERNSHIP";

  return "FULL_TIME";
}

/**
 * @deprecated Use classifyJobType(title, description, atsEmploymentType?) instead.
 * Preserved as a shim so any missed call sites degrade gracefully (title-only, no crash).
 */
function parseJobType(title: string): JobType {
  return classifyJobType(title, "");
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
/**
 * Ordered by specificity. Each skill maps to a token array — any substring
 * hit in (title + description).toLowerCase() registers that skill.
 */
const SKILL_KEYWORDS: Record<string, string[]> = {
  // Frontend
  "React":        ["react", "frontend", "ui component", "single page"],
  "Next.js":      ["nextjs", "next.js", "next js"],
  "Vue.js":       ["vue.js", "vuejs", "vue "],
  "Angular":      ["angular"],
  "TailwindCSS":  ["tailwind"],
  "TypeScript":   ["typescript", " ts ", "tsx"],
  "JavaScript":   ["javascript", " js ", "jsx", "es6", "ecmascript"],
  // Backend
  "Node.js":      ["node.js", "nodejs", "node ", "backend", "express", "nestjs"],
  "Python":       ["python", "django", "flask", "fastapi", "data science", "ml"],
  "Go":           ["golang", " go ", "go lang"],
  "Rust":         ["rust"],
  "Java":         ["java ", "spring", "jvm", "springboot"],
  "Kotlin":       ["kotlin"],
  "Scala":        ["scala"],
  "Ruby":         ["ruby", "rails"],
  "PHP":          ["php", "laravel"],
  "C++":          ["c++", "cpp"],
  "C#":           ["c#", ".net", "dotnet", "asp.net"],
  "Swift":        ["swift", "ios", "swiftui"],
  // Data & ML
  "SQL":          ["sql", "relational db", "mysql", "mariadb"],
  "PostgreSQL":   ["postgres", "postgresql"],
  "MongoDB":      ["mongodb", "mongo ", "nosql"],
  "Redis":        ["redis", "cache", "in-memory"],
  "Elasticsearch":["elasticsearch", "opensearch", "search engine"],
  "Kafka":        ["kafka", "event streaming", "message queue"],
  "Spark":        ["apache spark", "pyspark"],
  "Pandas":       ["pandas", "dataframe", "numpy"],
  "TensorFlow":   ["tensorflow", "tf.keras"],
  "PyTorch":      ["pytorch", "torch"],
  // Cloud & Infra
  "AWS":          ["aws", "amazon web services", "s3", "lambda", "ec2", "dynamodb"],
  "GCP":          ["gcp", "google cloud", "bigquery", "cloud run"],
  "Azure":        ["azure", "microsoft azure", "aks"],
  "Docker":       ["docker", "container", "dockerfile"],
  "Kubernetes":   ["kubernetes", "k8s", "kubectl", "helm"],
  "Terraform":    ["terraform", "infrastructure as code", "iac"],
  "CI/CD":        ["ci/cd", "github actions", "jenkins", "gitlab ci", "circleci"],
  // APIs
  "GraphQL":      ["graphql", "apollo"],
  "REST API":     ["rest api", "restful", "openapi", "swagger"],
  "gRPC":         ["grpc", "protobuf"],
  // Internship-common
  "Git":          ["git", "github", "version control"],
  "Linux":        ["linux", "unix", "bash", "shell scripting"],
  "Algorithms":   ["algorithms", "data structures", "leetcode", "dsa"],
};

/**
 * Extracts matched skills from the combined title + description corpus via
 * token matching against SKILL_KEYWORDS.
 *
 * INTEGRITY RULE: If the keyword scan returns zero matches, return [] (empty
 * array). Do NOT inject synthetic defaults — skill data must reflect actual
 * scraped content. A stored empty array signals the frontend to omit the
 * skills section rather than display fabricated technology stacks.
 *
 * @param title   Job title string from ATS
 * @param desc    Plain-text job description
 * @param jobType Classified JobType (unused for matching; kept for callers)
 */
function extractSkills(title: string, desc: string, jobType?: string): string[] {
  const text = `${title} ${desc}`.toLowerCase();
  const matched: string[] = [];

  for (const [skill, tokens] of Object.entries(SKILL_KEYWORDS)) {
    if (tokens.some((kw) => text.includes(kw))) {
      matched.push(skill);
    }
  }

  // Strict: return matched tokens only — never inject hardcoded fallback arrays
  return matched.slice(0, 10);
}

/**
 * Generates realistic mock job descriptions, requirements, and responsibilities.
 * Used ONLY as a fallback when an ATS provides no structured description.
 *
 * Experience string rules (strict):
 *  INTERNSHIP / ENTRY_LEVEL  → "0-1 years / Freshers welcome"
 *  FULL_TIME (non-senior)    → "2+ years"
 *  SENIOR/LEAD/STAFF/SSE     → "5+ years"
 *
 * @param title    Job title string from ATS
 * @param company  Company name for personalisation
 * @param jobType  Classified JobType — drives experience string selection
 */
function getJobDescription(
  title: string,
  companyName: string,
  jobType?: string
): { description: string; requirements: string; responsibilities: string } {

  const t = title.toLowerCase();

  // Seniority: explicit tokens only — "2+ years" is NOT a catch-all for everything non-intern
  const isSenior = /\b(senior|lead|staff|sse|principal|architect|director)\b/i.test(t);
  const isIntern  = jobType === "INTERNSHIP" || jobType === "ENTRY_LEVEL";

  // 3-way experience branch
  const experienceRequirement = isIntern
    ? "0-1 years of experience; freshers and recent graduates are strongly encouraged to apply."
    : isSenior
    ? "5+ years of software engineering experience in high-scale production environments."
    : "2+ years of software engineering experience in a professional team setting.";

  const responsibilities = [
    `Design, build, and maintain efficient, reusable, and reliable code at ${companyName}.`,
    `Collaborate with product managers, designers, and fellow engineers to ship high-impact features.`,
    isIntern
      ? "Learn production engineering practices through mentorship, code reviews, and pairing sessions."
      : isSenior
      ? "Mentor junior team members and guide overall technical architecture decisions."
      : "Participate actively in code reviews and team design discussions.",
    isIntern
      ? "Complete a structured 10–12 week project with defined milestones and a final presentation."
      : "Identify bottlenecks and bugs, and devise solutions to mitigate these issues.",
  ].join("\n");

  const requirements = [
    `Strong background in computer science fundamentals or equivalent practical experience.`,
    `Experience with modern software development workflows and version control (Git).`,
    experienceRequirement,
    isIntern
      ? "Proficiency in at least one programming language (Python, Java, JavaScript, or C++)."
      : "Familiarity with containerization, cloud systems, and database management.",
  ].join("\n");

  const description = isIntern
    ? `${companyName} is looking for a motivated Software Engineering Intern to join our engineering team. ` +
      `This is a paid internship where you will work alongside experienced engineers on real production systems. ` +
      `No prior industry experience required — we value curiosity, strong fundamentals, and a passion for building.`
    : `We are looking for a talented ${title} to join our engineering division at ${companyName}. ` +
      `You will play a crucial role in building the next generation of our platforms, designing scalable backend ` +
      `systems or intuitive frontend interfaces, and driving overall product excellence.`;

  return { description, requirements, responsibilities };
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
  /** ATS board token — when provided, used directly instead of the static slug-map lookup. */
  atsToken?: string | null;
  /** ATS source discriminator: 'greenhouse' | 'lever' | 'ashby' | 'workday' */
  atsSource?: string | null;
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

  // Resolve ATS tokens: explicit atsToken/atsSource fields take priority over
  // the static slug-map lookup (used for discovered companies with DB-stored tokens).
  const lookupKey = company.slug.replace(/-[a-z0-9]{5}$/i, "");
  const greenhouseToken =
    (company.atsSource === "greenhouse" && company.atsToken) ? company.atsToken
    : GREENHOUSE_TOKENS[lookupKey];
  const ashbyToken =
    (company.atsSource === "ashby" && company.atsToken) ? company.atsToken
    : ASHBY_TOKENS[lookupKey];
  const leverToken =
    (company.atsSource === "lever" && company.atsToken) ? company.atsToken
    : LEVER_TOKENS[lookupKey];
  const workdayToken =
    (company.atsSource === "workday" && company.atsToken) ? company.atsToken
    : null; // Workday tokens come exclusively from autonomous crawler discovery

  try {
    if (greenhouseToken) {
      // ------------------------------------------------------------------
      // Greenhouse ATS
      // ------------------------------------------------------------------
      // Greenhouse: resilientGet with UA rotation + 429/503 backoff
      const response = await resilientGet(
        `https://boards-api.greenhouse.io/v1/boards/${greenhouseToken}/jobs`
      );
      const rawJobs: any[] = response.data?.jobs ?? [];
      const techJobs = rawJobs.filter((job: any) => isTechOrInternRole(job.title)).slice(0, 30);

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
        // Resolve description first (needed for Tier-3 classifier scan)
        // then classify, then call getJobDescription with the classified type
        const preDesc = rawDescription.length > 50 ? rawDescription : "";
        // Greenhouse public board API: job.metadata is null — Tier 2+3 only
        const type = classifyJobType(jobTitle, preDesc);
        const { description: generatedDesc, requirements, responsibilities } = getJobDescription(jobTitle, company.name, type);
        const description = rawDescription.length > 50 ? rawDescription : generatedDesc;

        const locationName = job.location?.name || company.headquarters || "Remote";
        const workMode = parseWorkMode(locationName);
        const skillsRequired = extractSkills(jobTitle, description, type);

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
      // Lever: resilientGet with UA rotation + 429/503 backoff
      const response = await resilientGet(
        `https://api.lever.co/v0/postings/${leverToken}?mode=json`
      );
      const rawJobs: any[] = Array.isArray(response.data) ? response.data : [];
      const techJobs = rawJobs.filter((job: any) => isTechOrInternRole(job.text)).slice(0, 20);

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

        // Lever: classify type BEFORE getJobDescription so jobType arg is available.
        // Tier-1 uses job.categories?.commitment (structured field) so we don't need
        // description text yet — commitment alone resolves INTERNSHIP/FULL_TIME/etc.
        const preType = classifyJobType(jobTitle, "", job.categories?.commitment);
        const { description: generatedDesc, requirements: generatedReq, responsibilities: generatedResp } = getJobDescription(jobTitle, company.name, preType);
        const description = rawDescription.length > 50 ? rawDescription : generatedDesc;
        const finalRequirements = requirements || generatedReq;
        const finalResponsibilities = responsibilities || generatedResp;

        // Re-classify with full description for Tier-3 scan accuracy
        const type = classifyJobType(jobTitle, description, job.categories?.commitment);
        // Lever location is in job.categories.location
        const locationName = job.categories?.location || job.workplaceType || company.headquarters || "Remote";
        const workMode = parseWorkMode(locationName);
        const skillsRequired = extractSkills(jobTitle, description, type);
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
      // Ashby: resilientPost with UA rotation + 429/503 backoff
      const response = await resilientPost(
        `https://api.ashbyhq.com/posting-api/job-board/${ashbyToken}`,
        {}
      );
      const rawJobs: any[] = response.data?.jobs ?? [];
      const techJobs = rawJobs.filter((job: any) => isTechOrInternRole(job.title)).slice(0, 20);

      for (const job of techJobs) {
        const jobTitle = job.title;
        const externalId = `ashby-${job.id}`;
        const slug = slugify(`${company.slug}-${jobTitle}-${job.id}`, { lower: true, strict: true }) || `job-${job.id}`;
        activeSlugs.push(slug);

        const descPlain = job.descriptionPlain || "";
        const requirements = job.requirementsPlain || "";
        const responsibilities = job.responsibilitiesPlain || "";
        // Ashby: job.employmentType is the Tier-1 structured field
        // e.g. "Intern" | "FullTime" | "PartTime" | "Contract" | "Temporary"
        const type = classifyJobType(jobTitle, descPlain, job.employmentType);
        const locationName = job.location || company.headquarters || "Remote";
        const workMode = parseWorkMode(locationName);
        const skillsRequired = extractSkills(jobTitle, `${descPlain} ${jobTitle}`, type);

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

    } else if (workdayToken) {
      // ------------------------------------------------------------------
      // Workday ATS
      // ------------------------------------------------------------------
      const workdayResult = await scrapeWorkdayJobs(workdayToken, company);
      result.created += workdayResult.created;
      result.updated += workdayResult.updated;
      result.processedJobIds.push(...workdayResult.processedJobIds);
      activeSlugs.push(
        ...workdayResult.processedJobIds.map(() => "") // stale cleanup relies on slug list
      );

    } else {
      // ------------------------------------------------------------------
      // Fallback: template mock jobs
      // ------------------------------------------------------------------
      // numJobs is 3-5 so cycle NEVER reaches MOCK_JOBS_TEMPLATES[5] (INTERNSHIP).
      // Instead: generate 3-5 non-intern templates, then always inject 1 INTERNSHIP
      // explicitly so every mock company contributes to the internship pool.
      const numJobs = 3 + (company.name.length % 3); // 3 to 5 full-time/senior jobs
      const mockApplyUrl = company.careersPageUrl || (company.websiteUrl ? `${company.websiteUrl}/careers` : null);

      // — Non-internship cycle (templates 0-4) ———————————————————————————
      for (let i = 0; i < numJobs; i++) {
        const template = MOCK_JOBS_TEMPLATES[i % (MOCK_JOBS_TEMPLATES.length - 1)]; // exclude index 5
        const jobTitle = template.title;
        const externalId = `mock-${company.slug}-${i}`;
        const slug = slugify(`${company.slug}-${jobTitle}-${i}`, { lower: true, strict: true });
        activeSlugs.push(slug);

        const { description, requirements, responsibilities } = getJobDescription(jobTitle, company.name, template.type);
        const locationName = company.headquarters || "Remote";
        const skillsRequired = extractSkills(jobTitle, description, template.type);

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
        if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) result.created++;
        else result.updated++;
      }

      // — Guaranteed INTERNSHIP job for every mock company ———————————————
      // This ensures the internship filter always returns results regardless
      // of which ATS boards are active or how many real intern postings exist.
      {
        const internTemplate = MOCK_JOBS_TEMPLATES[MOCK_JOBS_TEMPLATES.length - 1]; // "Software Engineering Intern"
        const internTitle = internTemplate.title;
        const internExternalId = `mock-${company.slug}-intern`;
        const internSlug = slugify(`${company.slug}-${internTitle}-intern`, { lower: true, strict: true });
        activeSlugs.push(internSlug);

        const { description: iDesc, requirements: iReq, responsibilities: iResp } = getJobDescription(internTitle, company.name, "INTERNSHIP");
        const iLocation = company.headquarters || "Remote";
        const iSkills = extractSkills(internTitle, iDesc, "INTERNSHIP");

        const internUpserted = await prisma.job.upsert({
          where: { slug: internSlug },
          create: {
            companyId: company.id,
            title: internTitle,
            slug: internSlug,
            description: iDesc,
            requirements: iReq,
            responsibilities: iResp,
            location: iLocation,
            type: "INTERNSHIP",
            workMode: internTemplate.workMode as WorkMode,
            applyUrl: mockApplyUrl,
            skillsRequired: iSkills,
            status: "OPEN",
            externalJobId: internExternalId,
            atsSource: "mock",
          },
          update: {
            title: internTitle,
            description: iDesc,
            requirements: iReq,
            responsibilities: iResp,
            location: iLocation,
            type: "INTERNSHIP",
            workMode: internTemplate.workMode as WorkMode,
            applyUrl: mockApplyUrl,
            skillsRequired: iSkills,
            status: "OPEN",
            atsSource: "mock",
          }
        });

        result.processedJobIds.push(internUpserted.id);
        if (internUpserted.createdAt.getTime() === internUpserted.updatedAt.getTime()) result.created++;
        else result.updated++;
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
// WORKDAY SCRAPER
// ---------------------------------------------------------------------------

/**
 * Workday subdomain variants to try in order.
 * Workday assigns each company a subdomain on one of these CDN tiers.
 * We probe wd1 → wd5 until we get a 200 OK.
 */
const WORKDAY_TIERS = ["wd1", "wd2", "wd3", "wd4", "wd5"] as const;

/** Max jobs to ingest per Workday company run (pagination cap). */
const WORKDAY_MAX_JOBS = 50;
const WORKDAY_PAGE_SIZE = 20;

/**
 * Scrapes jobs from a Workday career site.
 *
 * Strategy:
 *  1. Iterate wd1 → wd5 until a variant responds with HTTP 200.
 *  2. POST to the public Workday CXS search endpoint:
 *     `POST https://<token>.<tier>.myworkdayjobs.com/wday/cxs/<token>/External_Career_Site/jobs`
 *  3. Paginate via `offset` + `limit` fields in the request body.
 *  4. Cap at WORKDAY_MAX_JOBS (50) total jobs per run.
 *  5. Map job fields with full optional chaining — Workday payloads vary across
 *     implementations and any field may be missing or null.
 *  6. If all tiers fail, returns an empty ProcessResult (caller falls through to mock).
 *
 * @param token   - Workday company subdomain token (e.g. "amazon").
 * @param company - Company row from the DB.
 * @returns ProcessResult with created/updated counts and processed job IDs.
 */
export async function scrapeWorkdayJobs(
  token: string,
  company: CompanyRow
): Promise<ProcessResult> {
  const result: ProcessResult = { created: 0, updated: 0, staleArchived: 0, processedJobIds: [] };

  // ── Tier discovery — try wd1 through wd5 ─────────────────────────────────
  let workingTier: string | null = null;

  for (const tier of WORKDAY_TIERS) {
    const probeUrl = `https://${token}.${tier}.myworkdayjobs.com/wday/cxs/${token}/External_Career_Site/jobs`;
    try {
      const probe = await axios.post(
        probeUrl,
        { limit: 1, offset: 0, searchText: "", appliedFacets: {} },
        { timeout: 8000, validateStatus: (s) => s < 500 }
      );
      if (probe.status === 200) {
        workingTier = tier;
        break;
      }
    } catch {
      // This tier unreachable — continue to next
    }
  }

  if (!workingTier) {
    console.warn(
      `[Job Scraper] Workday: no working tier found for token "${token}" (wd1–wd5). Skipping.`
    );
    return result;
  }

  const baseUrl = `https://${token}.${workingTier}.myworkdayjobs.com/wday/cxs/${token}/External_Career_Site/jobs`;

  // ── Paginated fetch ───────────────────────────────────────────────────────
  let offset = 0;
  let totalFetched = 0;

  while (totalFetched < WORKDAY_MAX_JOBS) {
    const remaining = WORKDAY_MAX_JOBS - totalFetched;
    const pageSize = Math.min(WORKDAY_PAGE_SIZE, remaining);

    let rawJobs: any[] = [];

    try {
      const response = await axios.post(
        baseUrl,
        { limit: pageSize, offset, searchText: "", appliedFacets: {} },
        { timeout: 12000 }
      );

      // Workday wraps results in jobPostings (undocumented — varies by tenant)
      const body = response.data ?? {};
      rawJobs = body.jobPostings ?? body.jobPosting ?? body.jobs ?? [];

      if (!Array.isArray(rawJobs) || rawJobs.length === 0) break;
    } catch (err: any) {
      console.warn(
        `[Job Scraper] Workday page fetch failed for "${token}" at offset ${offset}: ${err.message}`
      );
      break;
    }

    // ── Filter and map each job ───────────────────────────────────────────
    const techJobs = rawJobs
      .filter((j: any) => isTechOrInternRole(j?.title ?? j?.jobPosting?.title ?? ""))
      .slice(0, remaining);

    for (const rawJob of techJobs) {
      // Safe extraction — all Workday fields are accessed with optional chaining
      const jobTitle: string =
        rawJob?.title ??
        rawJob?.jobPosting?.title ??
        rawJob?.externalJobCode ??
        "Engineering Role";

      // Workday uses `externalPath` or `bulletFields[0]` as a unique identifier segment
      const externalPath: string =
        rawJob?.externalPath ??
        rawJob?.jobPosting?.externalPath ??
        rawJob?.id ??
        `${token}-${offset}-${totalFetched}`;

      const externalId = `workday-${token}-${externalPath.replace(/\//g, "-")}`;
      const slug =
        slugify(`${company.slug}-${jobTitle}-wd-${externalPath.slice(-8)}`, {
          lower: true,
          strict: true,
        }) || `job-wd-${Date.now()}`;

      // Location: Workday uses locationsText (string) or a nested locations array
      const locationName: string =
        rawJob?.locationsText ??
        (Array.isArray(rawJob?.jobLocation) ? rawJob.jobLocation[0]?.descriptor : null) ??
        company.headquarters ??
        "Remote";

      const workMode = parseWorkMode(locationName);
      const { description, requirements, responsibilities } = getJobDescription(
        jobTitle,
        company.name
      );
      // Workday CXS payload exposes no employment type field — Tier 2+3 only
      const type = classifyJobType(jobTitle, description);
      const skillsRequired = extractSkills(jobTitle, description, type);

      // Apply URL — Workday public job links use externalPath as the slug segment
      const applyUrl =
        rawJob?.externalPath
          ? `https://${token}.${workingTier}.myworkdayjobs.com${rawJob.externalPath}`
          : `https://${token}.${workingTier}.myworkdayjobs.com/en-US/External_Career_Site`;

      try {
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
            applyUrl,
            skillsRequired,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "workday",
          },
          update: {
            title: jobTitle,
            description,
            requirements,
            responsibilities,
            location: locationName,
            type,
            workMode,
            applyUrl,
            skillsRequired,
            status: "OPEN",
            atsSource: "workday",
          },
        });

        result.processedJobIds.push(upserted.id);
        if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
          result.created++;
        } else {
          result.updated++;
        }
      } catch (upsertErr: any) {
        console.warn(
          `[Job Scraper] Workday upsert failed for "${jobTitle}" at ${company.name}: ${upsertErr.message}`
        );
      }

      totalFetched++;
    }

    // If this page returned fewer results than the page size, we've exhausted all jobs
    if (rawJobs.length < pageSize) break;

    offset += pageSize;
  }

  console.log(
    `[Job Scraper] Workday "${token}": ${result.created} created, ${result.updated} updated.`
  );

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

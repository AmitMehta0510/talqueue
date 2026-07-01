import axios from "axios";
import slugify from "slugify";
import prisma from "shared/database/prisma";
import { JobType, WorkMode, JobStatus } from "@prisma/client";
import { syncJobsToElasticBulk } from "services/elasticSync";
import { resilientGet, resilientPost } from "shared/services/network/resilientHttp";

// ── Pipeline v2 — shadow mode integration ────────────────────────────────────
// When PIPELINE_V2_SHADOW_MODE=true, the new extraction pipeline runs in
// parallel with the existing scraper. It writes ONLY to the new nullable
// v2 fields (rawHtml, techStackJson, locationCity, etc.) and does NOT
// modify any v1 fields. This allows progressive validation before cutover.
//
// Set PIPELINE_V2_SHADOW_MODE=true in .env to enable.
// Set PIPELINE_V2_SHADOW_MODE=false (default) to keep existing behavior.
import { getJobPipeline, JobPipeline } from "../../../pipeline/JobPipeline";
import { JobPersister } from "../../../pipeline/persistence/JobPersister";

const PIPELINE_V2_SHADOW_MODE = process.env.PIPELINE_V2_SHADOW_MODE === "true";
let _shadowPipeline: JobPipeline | null = null;
let _shadowPersister: JobPersister | null = null;

function getShadowPipeline(): { pipeline: JobPipeline; persister: JobPersister } {
  if (!_shadowPipeline) _shadowPipeline = getJobPipeline({ enableLLM: false });
  if (!_shadowPersister) _shadowPersister = new JobPersister();
  return { pipeline: _shadowPipeline, persister: _shadowPersister };
}

/**
 * Run the v2 pipeline on a raw job input in shadow mode.
 * Errors are caught and logged — never propagated to the caller.
 */
async function runShadowPipeline(
  rawInput: { title: string; rawHtml: string; externalId: string; atsSource: string; applyUrl: string; location: string | null; postedAt: Date | null },
  companySlug: string,
  companyId: string,
): Promise<void> {
  if (!PIPELINE_V2_SHADOW_MODE) return;
  try {
    const { pipeline, persister } = getShadowPipeline();
    const parsedJob = await pipeline.process({
      externalId: rawInput.externalId,
      title: rawInput.title,
      rawHtml: rawInput.rawHtml,
      atsLocation: rawInput.location,
      atsPublishedAt: rawInput.postedAt,
      // Inject atsSource for the persister
      _atsSource: rawInput.atsSource,
      _applyUrl: rawInput.applyUrl,
    } as any);
    const slug = slugify(`${companySlug}-${rawInput.title}-${rawInput.externalId.slice(-8)}`, { lower: true, strict: true });
    // Only write v2 fields — existing v1 upsert already handled the core fields
    await prisma.job.updateMany({
      where: { externalJobId: rawInput.externalId },
      data: {
        rawHtml: parsedJob.rawHtml?.slice(0, 200_000) || "",
        normalizedText: parsedJob.normalizedText?.slice(0, 50_000) || "",
        parsedSectionsJson: parsedJob.parsedSections ? Object.fromEntries(parsedJob.parsedSections) as any : null,
        techStackJson: parsedJob.techStack as any,
        preferredSkills: parsedJob.preferredSkills?.value?.map((s) => s.name) ?? [],
        experienceMinYears: parsedJob.experience?.value?.minYears ?? null,
        experienceMaxYears: parsedJob.experience?.value?.maxYears ?? null,
        locationCity: parsedJob.location?.value?.city ?? null,
        locationState: parsedJob.location?.value?.state ?? null,
        locationCountry: parsedJob.location?.value?.country ?? null,
        locationCountryCode: parsedJob.location?.value?.countryCode ?? null,
        visaSponsorship: parsedJob.location?.value?.visaSponsorship ?? null,
        relocationAssistance: parsedJob.location?.value?.relocationAssistance ?? null,
        educationDegree: parsedJob.education?.value?.degree ?? null,
        educationRequired: parsedJob.education?.value?.isRequired ?? null,
        currency: parsedJob.salary?.value?.currency ?? null,
        salaryPeriod: parsedJob.salary?.value?.period ?? "annual",
        parserConfidence: parsedJob.overallConfidence,
        needsLLMReview: parsedJob.needsLLMReview,
        pipelineVersion: parsedJob.pipelineVersion,
        lastParsedAt: new Date(),
      },
    });
  } catch (err: any) {
    console.warn(`[Pipeline v2 Shadow] Failed for ${rawInput.externalId}: ${err?.message ?? err}`);
  }
}

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

/**
 * Returns a concise one-liner string for well-known scraper errors so that
 * routine HTTP failures (404 board gone, 429 rate-limit, etc.) don't flood
 * the terminal with multi-hundred-line Axios stack traces.
 *
 * Unknown or truly unexpected errors return only the .message string (still
 * no stack) so logs stay readable while nothing is silently swallowed.
 */
function formatScraperError(err: unknown): string {
  if (err && typeof err === "object" && (err as any).isAxiosError === true) {
    const ax      = err as any;
    const status  = ax.response?.status ?? ax.status;
    const url     = ax.config?.url ?? "(unknown URL)";
    const code    = ax.code ?? "";

    if (status === 401) return `HTTP 401 Unauthorized — ${url}`;
    if (status === 403) return `HTTP 403 Forbidden — ${url}`;
    if (status === 404) return `HTTP 404 Not Found — ${url}`;
    if (status === 429) return `HTTP 429 Rate Limited — ${url}`;
    if (status === 502) return `HTTP 502 Bad Gateway — ${url}`;
    if (status === 503) return `HTTP 503 Service Unavailable — ${url}`;
    if (status === 500) return `HTTP 500 Internal Server Error — ${url}`;
    if (status)         return `HTTP ${status} — ${url}`;
    if (code === "ECONNABORTED" || code === "ETIMEDOUT") return `Timeout — ${url}`;
    if (code === "ENOTFOUND"   || code === "EAI_AGAIN")  return `DNS resolution failed — ${url}`;
    if (code === "ECONNREFUSED")                         return `Connection refused — ${url}`;
  }
  // Fallback: any Error-like object — message only, no stack
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Returns true for expected/transient scraper errors that warrant only a
 *  warn-level log rather than an error-level one. */
function isExpectedScraperError(summary: string): boolean {
  return (
    summary.startsWith("HTTP 4")   || // 401, 403, 404, 429
    summary.startsWith("HTTP 502") ||
    summary.startsWith("HTTP 503") ||
    summary.startsWith("Timeout")  ||
    summary.startsWith("DNS")      ||
    summary.startsWith("Connection refused")
  );
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/** Number of companies processed concurrently within each batch. */
const BATCH_SIZE = 10;

// Mapping of seeded companies to their public Greenhouse board tokens
const GREENHOUSE_TOKENS: Record<string, string> = {
  // ── Global tech companies ───────────────────────────────────────────────
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
  // docker removed — board returns 404
  "vercel": "vercel",
  "retool": "retool",
  "inmobi": "inmobi",
  "onetrust-india": "onetrust",
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
  // ── Additional global boards ────────────────────────────────────────────
  "pinterest": "pinterest",
  "reddit": "reddit",
  "twitch": "twitch",
  "zendesk": "zendesk",
  "intercom": "intercom",
  "brex": "brex",
  "plaid": "plaid",
  "chime": "chime",
  "nerdwallet": "nerdwallet",
  "sofi": "sofi",
  "amplitude": "amplitude",
  "mixpanel": "mixpanel",
  "segment": "segment",
  "heap": "heap",
  "fullstory": "fullstory",
  "contentsquare": "contentsquare",
  "hotjar": "hotjar",
  "loom": "loom",
  "miro": "miro",
  "airtable": "airtable",
  "coda": "coda",
  "linear": "linear",
  "clickup": "clickup",
  "asana": "asana",
  "monday": "monday",
  // ── Indian companies on Greenhouse ─────────────────────────────────────
  "razorpay": "razorpay",
  "freshworks": "freshworks",
  "browserstack": "browserstack",
  "chargebee": "chargebee",
  "hasura": "hasura",
  "darwinbox": "darwinbox",
  "innovaccer": "innovaccer",
  "leadsquared": "leadsquared",
  "springworks": "springworks",
  "sigmoid": "sigmoid",
  "capillarytech": "capillarytech",
  "unacademy": "unacademy",
  "moengage": "moengage",
  "licious": "licious",
  "vedantu": "vedantu",
  "clevertap": "clevertap",
  "netcore": "netcore",
  "apisero": "apisero",
  "yellowmessenger": "yellowmessenger",
  "sprinklr": "sprinklr",
  "deloitte": "deloitte",
  "accenture": "accenture",
  "publicissapient": "publicissapient",
  "thoughtworks": "thoughtworks",
  "nagarro": "nagarro",
  "mphasis": "mphasis",
  "persistent": "persistent",
  "sonata-software": "sonatasoftware",
  "happyfox": "happyfox",
  "agoda": "agoda",
  "grab": "grab",
  "gojek": "gojek",
};

// Mapping of seeded companies to their public Ashby board tokens
// NOTE: linear removed — requires authentication (401)
const ASHBY_TOKENS: Record<string, string> = {
  "ramp": "ramp",
  "mercury": "mercury",
  "rippling": "rippling",
  "gusto": "gusto",
  "lattice": "lattice",
  "deel": "deel",
  "remote": "remote",
  "leapsome": "leapsome",
  "pave": "pave",
  "gem": "gem",
};

// Mapping of seeded companies to their public Lever job board slugs
const LEVER_TOKENS: Record<string, string> = {
  // ── Global companies on Lever ───────────────────────────────────────────
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
  "stripe": "stripe",
  "figma": "figma",
  "vercel": "vercel",
  "cloudflare": "cloudflare",
  "sentry-oss": "sentry-oss",
  "retool": "retool",
  "posthog": "posthog",
  "dbt-labs": "dbt-labs",
  "cockroachdb": "cockroachdb",
  "supabase": "supabase",
  "pagerduty": "pagerduty",
  "chainguard": "chainguard",
  "planetscale": "planetscale",
  "cal": "cal",
  "infisical": "infisical",
  "lattice": "lattice",
  "rippling": "rippling",
  "gusto": "gusto",
  "navan": "navan",
  "brex": "brex",
  "ramp": "ramp",
  "mercury": "mercury",
  "deel": "deel",
  "remote": "remote",
  "carta": "carta",
  "watershed": "watershed",
  "sourcegraph": "sourcegraph",
  "deno": "deno",
  "fly": "fly",
  "neon": "neon",
  // ── Indian companies on Lever ───────────────────────────────────────────
  "razorpay": "razorpay",
  "swiggy": "swiggy",
  "meesho": "meesho",
  "phonepe": "phonepe",
  "groww": "groww",
  "sharechat": "sharechat",
  "truecaller": "truecaller",
  "slice": "slice",
  "cred": "cred",
  "zepto": "zepto",
  "blinkit": "blinkit",
  "zomato": "zomato",
  "lenskart": "lenskart",
  "cars24": "cars24",
  "spinny": "spinny",
  "mfine": "mfine",
  "pristyncare": "pristyncare",
  "healthifyme": "healthifyme",
  "nykaa": "nykaa",
  "purplle": "purplle",
  "mamaearth": "mamaearth",
  "ola": "ola",
  "rapido": "rapido",
  "drivezy": "drivezy",
  "stashfin": "stashfin",
  "kreditbee": "kreditbee",
  "moneytap": "moneytap",
  "jupiter": "jupiter",
  "fi": "fi",
  "niyo": "niyo",
  "m2p": "m2p",
  "cashfree": "cashfree",
  "payu": "payu",
  "juspay": "juspay",
  "setu": "setu",
  "open": "open",
  "smallcase": "smallcase",
  "zerodha": "zerodha",
  "upstox": "upstox",
  "angelone": "angelone",
  "dhan": "dhan",
  "fyers": "fyers",
  "tickertape": "tickertape",
  "sensibull": "sensibull",
  "cleartax": "cleartax",
  "quicko": "quicko",
  "taxbuddy": "taxbuddy",
  "zoho": "zoho",
  "freshworks": "freshworks",
  "kissflow": "kissflow",
  "chargebee": "chargebee",
  "leadsquared": "leadsquared",
  "exotel": "exotel",
  "kaleyra": "kaleyra",
  "gupshup": "gupshup",
  "yellowai": "yellowai",
  "haptik": "haptik",
  "observe-ai": "observe-ai",
  "unifyapps": "unifyapps",
  "sprinklr": "sprinklr",
  "darwinbox": "darwinbox",
  "keka": "keka",
  "greythr": "greythr",
  "hrmthread": "hrmthread",
  "zimyo": "zimyo",
  "kredily": "kredily",
  "pagarbook": "pagarbook",
  "sumhr": "sumhr",
  "synergita": "synergita",
  "edcast": "edcast",
  "byju": "byjus",
  "vedantu": "vedantu",
  "unacademy": "unacademy",
  "testbook": "testbook",
  "toppr": "toppr",
  "physicswallah": "physicswallah",
  "great-learning": "greatlearning",
  "upgrad": "upgrad",
  "scaler": "scaler",
  "masai": "masai",
  "newton-school": "newtonschool",
  "almabetter": "almabetter",
  "internshala": "internshala",
  "letsgrowmore": "letsgrowmore",
  "naukri": "naukri",
  "apna": "apna",
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
 * Parses an ATS HTML job description into structured sections.
 * Scans H1–H4 headings to split the raw HTML into description (intro),
 * requirements, responsibilities, and perks. Falls back gracefully to the
 * full stripped text if no recognisable section headings are found.
 *
 * Works with Greenhouse, BambooHR, iCIMS, and most generic ATS HTML layouts.
 */
function parseJobDescriptionSections(html: string): {
  description: string;
  requirements: string;
  responsibilities: string;
  perks: string;
} {
  const empty = { description: "", requirements: "", responsibilities: "", perks: "" };
  if (!html?.trim()) return empty;

  const REQS_PATTERNS = [
    "requirement", "qualif", "what we look", "what you bring", "must have",
    "who you are", "your background", "you'll need", "you should have",
    "skills required", "minimum qualif", "basic qualif", "preferred qualif",
  ];
  const RESP_PATTERNS = [
    "responsib", "what you'll do", "what you will do", "your role",
    "in this role", "what you do", "your day", "about the role",
    "key tasks", "the role", "you will be", "what you'll be doing",
    "key responsib", "day-to-day", "expectations", "what we expect",
  ];
  const PERKS_PATTERNS = [
    "benefit", "perk", "compensation", "what we offer", "why join",
    "we offer", "package", "salary & benefit", "total rewards", "perks &",
  ];

  // Intro: content before the first heading
  let description = "";
  const firstH = html.search(/<h[1-4]/i);
  if (firstH > 0) {
    description = stripHtml(html.slice(0, firstH)).trim();
  } else if (firstH === -1) {
    // No headings at all — whole content is the description
    return { ...empty, description: stripHtml(html).trim() };
  }

  let requirements = "";
  let responsibilities = "";
  let perks = "";

  // Walk each section: <hN>heading</hN> body ... next-<hN>
  const sectionRe = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>([\s\S]*?)(?=<h[1-4]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(html)) !== null) {
    const heading = stripHtml(m[1]).toLowerCase().trim();
    const body = stripHtml(m[2]).trim();
    if (!body || body.length < 10) continue;

    if (REQS_PATTERNS.some(p => heading.includes(p))) {
      requirements = requirements ? `${requirements}\n${body}` : body;
    } else if (RESP_PATTERNS.some(p => heading.includes(p))) {
      responsibilities = responsibilities ? `${responsibilities}\n${body}` : body;
    } else if (PERKS_PATTERNS.some(p => heading.includes(p))) {
      perks = perks ? `${perks}\n${body}` : body;
    } else if (
      !description &&
      (heading.includes("overview") || heading.includes("about this") ||
       heading.includes("the job") || heading.includes("job description") ||
       heading.includes("about the position"))
    ) {
      description = body;
    }
  }

  // Last-resort description: first 800 chars of stripped full HTML
  if (!description) {
    description = stripHtml(html).trim().slice(0, 800);
  }

  return { description, requirements, responsibilities, perks };
}

/**
 * Infers a human-readable experience level from a job title and description.
 * Uses a priority-ordered set of title-level signals first (highest precision),
 * then falls back to year-range patterns in the description text.
 *
 * Returns null when there is not enough signal to make a reliable determination.
 */
function extractExperienceLevel(title: string, description: string): string | null {
  const t = title.toLowerCase();
  const d = description.slice(0, 600).toLowerCase();

  // Tier 1: explicit title tokens (zero ambiguity)
  if (/\b(intern|co[-\s]?op|coop|trainee|apprentice|fresher)\b/.test(t))                    return "Internship";
  if (/\b(new\s+grad|entry[-\s]level|junior\b|associate\s+engineer|graduate\s+(engineer|hire))\b/.test(t)) return "Entry Level";
  if (/\b(principal\s+engineer|staff\s+engineer|distinguished\s+engineer)\b/.test(t))        return "Staff / Principal";
  if (/\b(director|vp\s+of|head\s+of|chief\s+\w+\s+officer)\b/.test(t))                     return "Director+";
  if (/\b(senior\b|lead\s+engineer|lead\s+developer|sse\b|tech\s+lead|sr\.?\s+engineer)\b/.test(t)) return "Senior";
  if (/\b(engineer\s+(ii|iii|iv|2|3)|software\s+engineer\s+[234])\b/.test(t))               return "Mid Level";

  // Tier 2: year-range signals in description
  if (/\b(0[-–]?1|1[-–]?2)\s*\+?\s*years?\s+(of\s+)?(experience|exp)/i.test(d))            return "Entry Level";
  if (/\bno\s+(prior\s+)?(work\s+)?experience\s+required/i.test(d))                         return "Entry Level";
  if (/\b(2[-–]?4|3[-–]?5)\s*\+?\s*years?\s+(of\s+)?(experience|exp)/i.test(d))            return "Mid Level";
  if (/\b([5-9]|10)\s*\+\s*years?\s+(of\s+)?(experience|exp)/i.test(d))                    return "Senior";

  return null;
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

function isLocationInIndia(location: string | null | undefined): boolean {
  if (!location) return false;
  const locLower = location.toLowerCase();
  const indianCitiesAndWords = [
    "india",
    "bengaluru",
    "bangalore",
    "hyderabad",
    "pune",
    "mumbai",
    "chennai",
    "noida",
    "gurgaon",
    "gurugram",
    "delhi",
    "kolkata",
    "kochi",
    "coimbatore",
    "trivandrum",
    "ahmedabad",
    "jaipur",
  ];
  
  if (indianCitiesAndWords.some(word => locLower.includes(word))) {
    return true;
  }
  
  const words = locLower.split(/[\s,.-]+/);
  return words.includes("in");
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

  // Resolve ATS tokens: explicit atsSource/atsToken fields take priority.
  // Static lists serve as a fallback ONLY if the company doesn't have an explicit source in the DB.
  let greenhouseToken: string | null = null;
  let ashbyToken: string | null = null;
  let leverToken: string | null = null;
  const workdayToken = company.atsSource === "workday" ? company.atsToken : null;
  const bamboohrToken = company.atsSource === "bamboohr" ? company.atsToken : null;
  const icimsToken = company.atsSource === "icims" ? company.atsToken : null;
  const paylocityToken = company.atsSource === "paylocity" ? company.atsToken : null;

  if (company.atsSource) {
    if (company.atsSource === "greenhouse") {
      greenhouseToken = company.atsToken || GREENHOUSE_TOKENS[lookupKey] || null;
    } else if (company.atsSource === "ashby") {
      ashbyToken = company.atsToken || ASHBY_TOKENS[lookupKey] || null;
    } else if (company.atsSource === "lever") {
      leverToken = company.atsToken || LEVER_TOKENS[lookupKey] || null;
    }
  } else {
    // Fall back to static maps if atsSource is null/undefined in DB
    greenhouseToken = GREENHOUSE_TOKENS[lookupKey] || null;
    ashbyToken = ASHBY_TOKENS[lookupKey] || null;
    leverToken = LEVER_TOKENS[lookupKey] || null;
  }

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
        // Parse real description sections from Greenhouse HTML content field
        let description = "";
        let requirements = "";
        let responsibilities = "";
        let perks: string | null = null;

        if (job.content && job.content.length > 80) {
          const sections = parseJobDescriptionSections(job.content);
          description = sections.description;
          requirements = sections.requirements;
          responsibilities = sections.responsibilities;
          perks = sections.perks || null;
        }

        // Classify type using real content for Tier-3 accuracy
        const type = classifyJobType(jobTitle, description);

        // Fall back to templates only for fields that weren't extracted from real content
        const generated = getJobDescription(jobTitle, company.name, type);
        if (!description)       description       = generated.description;
        if (!requirements)      requirements      = generated.requirements;
        if (!responsibilities)  responsibilities  = generated.responsibilities;

        const locationName = job.location?.name || company.headquarters || "Remote";
        const workMode = parseWorkMode(locationName);
        // Extend skills corpus to include requirements text for better coverage
        const skillsRequired = extractSkills(jobTitle, `${description} ${requirements}`, type);
        const experienceLevel = extractExperienceLevel(jobTitle, `${description} ${requirements}`);

        const upserted = await prisma.job.upsert({
          where: { slug },
          create: {
            companyId: company.id,
            title: jobTitle,
            slug,
            description,
            requirements,
            responsibilities,
            perks,
            location: locationName,
            type,
            workMode,
            applyUrl: job.absolute_url || `https://boards.greenhouse.io/${greenhouseToken}/jobs/${job.id}`,
            skillsRequired,
            experienceLevel,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "greenhouse",
            postedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
          },
          update: {
            title: jobTitle,
            description,
            requirements,
            responsibilities,
            perks,
            location: locationName,
            type,
            workMode,
            applyUrl: job.absolute_url || `https://boards.greenhouse.io/${greenhouseToken}/jobs/${job.id}`,
            skillsRequired,
            experienceLevel,
            status: "OPEN",
            openings: null, // clear legacy openings=0 that triggers erroneous auto-close
            atsSource: "greenhouse",
            // postedAt intentionally NOT updated — preserve original posting date
          }
        });

        result.processedJobIds.push(upserted.id);
        if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
          result.created++;
        } else {
          result.updated++;
        }

        // Run v2 pipeline in shadow mode
        await runShadowPipeline(
          {
            title: jobTitle,
            rawHtml: job.content || "",
            externalId,
            atsSource: "greenhouse",
            applyUrl: job.absolute_url || `https://boards.greenhouse.io/${greenhouseToken}/jobs/${job.id}`,
            location: locationName,
            postedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
          },
          company.slug,
          company.id,
        );
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
        // Lever location: prefer structured categories.location over the less-reliable workplaceType string
        const locationName = job.categories?.location || company.headquarters || "Remote";
        // Lever provides explicit workplaceType: "remote" | "on-site" | "hybrid"
        const workMode: WorkMode = job.workplaceType?.toLowerCase().includes("remote") ? "REMOTE"
          : job.workplaceType?.toLowerCase().includes("hybrid") ? "HYBRID"
          : parseWorkMode(locationName);
        const skillsRequired = extractSkills(jobTitle, `${description} ${finalRequirements}`, type);
        const experienceLevel = extractExperienceLevel(jobTitle, `${description} ${finalRequirements}`);
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
            experienceLevel,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "lever",
            postedAt: job.createdAt ? new Date(job.createdAt) : new Date(),
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
            experienceLevel,
            status: "OPEN",
            openings: null, // clear legacy openings=0 that triggers erroneous auto-close
            atsSource: "lever",
            // postedAt intentionally NOT updated — preserve original posting date
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
        // Ashby exposes isRemote boolean and workplaceType for accurate work mode
        const ashbyWorkMode: WorkMode = job.isRemote === true ? "REMOTE"
          : job.workplaceType?.toLowerCase().includes("hybrid") ? "HYBRID"
          : parseWorkMode(locationName);
        const skillsRequired = extractSkills(jobTitle, `${descPlain} ${requirements}`, type);
        const experienceLevel = extractExperienceLevel(jobTitle, `${descPlain} ${requirements}`);

        // Ashby provides descriptionPlain/requirementsPlain — fall back to templates only when missing
        const generated = getJobDescription(jobTitle, company.name, type);
        const finalDesc = descPlain || generated.description;
        const finalReq  = requirements || generated.requirements;
        const finalResp = responsibilities || generated.responsibilities;

        const upserted = await prisma.job.upsert({
          where: { slug },
          create: {
            companyId: company.id,
            title: jobTitle,
            slug,
            description: finalDesc,
            requirements: finalReq || null,
            responsibilities: finalResp || null,
            location: locationName,
            type,
            workMode: ashbyWorkMode,
            applyUrl: job.jobUrl || `https://jobs.ashbyhq.com/${ashbyToken}/${job.id}`,
            skillsRequired,
            experienceLevel,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "ashby",
            postedAt: job.publishedAt ? new Date(job.publishedAt) : new Date(),
          },
          update: {
            title: jobTitle,
            description: finalDesc,
            requirements: finalReq || null,
            responsibilities: finalResp || null,
            location: locationName,
            type,
            workMode: ashbyWorkMode,
            applyUrl: job.jobUrl || `https://jobs.ashbyhq.com/${ashbyToken}/${job.id}`,
            skillsRequired,
            experienceLevel,
            status: "OPEN",
            openings: null, // clear legacy openings=0 that triggers erroneous auto-close
            atsSource: "ashby",
            // postedAt intentionally NOT updated — preserve original posting date
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

    } else if (bamboohrToken) {
      // ------------------------------------------------------------------
      // BambooHR ATS
      // ------------------------------------------------------------------
      const bamboohrResult = await scrapeBambooHRJobs(bamboohrToken, company);
      result.created += bamboohrResult.created;
      result.updated += bamboohrResult.updated;
      result.processedJobIds.push(...bamboohrResult.processedJobIds);
      activeSlugs.push(...bamboohrResult.processedJobSlugs);

    } else if (icimsToken) {
      // ------------------------------------------------------------------
      // iCIMS ATS
      // ------------------------------------------------------------------
      const icimsResult = await scrapeIcimsJobs(icimsToken, company);
      result.created += icimsResult.created;
      result.updated += icimsResult.updated;
      result.processedJobIds.push(...icimsResult.processedJobIds);
      activeSlugs.push(...icimsResult.processedJobSlugs);

    } else if (paylocityToken) {
      // ------------------------------------------------------------------
      // Paylocity ATS
      // ------------------------------------------------------------------
      const paylocityResult = await scrapePaylocityJobs(paylocityToken, company);
      result.created += paylocityResult.created;
      result.updated += paylocityResult.updated;
      result.processedJobIds.push(...paylocityResult.processedJobIds);
      activeSlugs.push(...paylocityResult.processedJobSlugs);

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
            openings: null, // clear legacy openings=0 that triggers erroneous auto-close
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
            openings: null, // clear legacy openings=0 that triggers erroneous auto-close
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

    // Recalculate isIndian for the company dynamically based on HQ and active jobs
    const openJobs = await prisma.job.findMany({
      where: {
        companyId: company.id,
        status: "OPEN",
      },
      select: {
        location: true,
      },
    });

    const hasIndiaJobs = openJobs.some((j) => isLocationInIndia(j.location));
    const isCompanyHqIndia =
      company.country?.toLowerCase() === "india" ||
      company.country?.toLowerCase() === "in" ||
      company.headquarters?.toLowerCase().includes("india");

    const isIndian = !!(hasIndiaJobs || isCompanyHqIndia);

    await prisma.company.update({
      where: { id: company.id },
      data: { isIndian },
    });

  } catch (err) {
    const summary = formatScraperError(err);
    if (isExpectedScraperError(summary)) {
      // Known / routine failure — one clean line, no stack trace
      console.warn(`[Job Scraper] Skipping ${company.name}: ${summary}`);
    } else {
      // Truly unexpected — still only message, but at error level
      console.error(`[Job Scraper] Failed to process ${company.name}: ${summary}`);
    }
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
      const experienceLevel = extractExperienceLevel(jobTitle, description);

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
            experienceLevel,
            status: "OPEN",
            externalJobId: externalId,
            atsSource: "workday",
            postedAt: rawJob?.startDate ? new Date(rawJob.startDate) : new Date(),
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
            experienceLevel,
            status: "OPEN",
            atsSource: "workday",
            // postedAt intentionally NOT updated — preserve original posting date
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
// BAMBOOHR SCRAPER
// ---------------------------------------------------------------------------

/**
 * Scrapes jobs from a BambooHR career site list.
 */
export async function scrapeBambooHRJobs(
  token: string,
  company: CompanyRow
): Promise<{ created: number; updated: number; processedJobIds: string[]; processedJobSlugs: string[] }> {
  const result = { created: 0, updated: 0, processedJobIds: [] as string[], processedJobSlugs: [] as string[] };
  const url = `https://${token}.bamboohr.com/careers/list`;

  try {
    const response = await resilientGet(url);
    const rawJobs = response.data?.result ?? response.data ?? [];
    if (!Array.isArray(rawJobs)) return result;

    const techJobs = rawJobs.filter((j: any) => isTechOrInternRole(j?.jobOpeningName ?? ""));

    for (const job of techJobs) {
      const jobTitle = job.jobOpeningName || "Engineering Role";
      const jobId = job.id;
      if (!jobId) continue;

      const externalId = `bamboohr-${token}-${jobId}`;
      const slug = slugify(`${company.slug}-${jobTitle}-${jobId}`, { lower: true, strict: true }) || `job-bamboohr-${jobId}`;

      // Location parsing
      let locationName = "Not specified";
      const loc = job.location;
      if (loc && typeof loc === "object") {
        const city = loc.city || "";
        const state = loc.state || "";
        locationName = [city, state].filter(Boolean).join(", ") || "Not specified";
      } else if (loc && typeof loc === "string") {
        locationName = loc;
      }
      if (locationName.length > 50) {
        locationName = locationName.slice(0, 50);
      }

      const workMode = parseWorkMode(locationName);
      const applyUrl = `https://${token}.bamboohr.com/careers/${jobId}`;

      // Attempt to fetch per-job detail JSON for real description/requirements
      let description = "";
      let requirements = "";
      let responsibilities = "";
      let perks: string | null = null;
      let bambooPostedAt: Date | null = job.datePosted ? new Date(job.datePosted) : null;

      try {
        const detailRes = await resilientGet(`https://${token}.bamboohr.com/careers/${jobId}/detail`);
        const detail = detailRes.data;
        if (detail && typeof detail === "object") {
          // BambooHR detail JSON fields (vary by version)
          const rawHtml = detail.description || detail.jobDescription || "";
          if (rawHtml && rawHtml.length > 80) {
            const sections = parseJobDescriptionSections(rawHtml);
            description = sections.description;
            requirements = sections.requirements || detail.requirements || "";
            responsibilities = sections.responsibilities;
            perks = sections.perks || null;
          }
          if (!bambooPostedAt && detail.datePosted) {
            bambooPostedAt = new Date(detail.datePosted);
          }
        } else if (typeof detailRes.data === "string" && detailRes.data.length > 80) {
          // HTML fallback
          const sections = parseJobDescriptionSections(detailRes.data);
          description = sections.description;
          requirements = sections.requirements;
          responsibilities = sections.responsibilities;
          perks = sections.perks || null;
        }
      } catch {
        // Network / 404 — fall through to templates below
      }

      const type = classifyJobType(jobTitle, description);

      // Fill missing fields with templates
      const generated = getJobDescription(jobTitle, company.name, type);
      if (!description)       description       = generated.description;
      if (!requirements)      requirements      = generated.requirements;
      if (!responsibilities)  responsibilities  = generated.responsibilities;

      const skillsRequired = extractSkills(jobTitle, `${description} ${requirements}`, type);
      const experienceLevel = extractExperienceLevel(jobTitle, `${description} ${requirements}`);

      const upserted = await prisma.job.upsert({
        where: { slug },
        create: {
          companyId: company.id,
          title: jobTitle,
          slug,
          description,
          requirements,
          responsibilities,
          perks,
          location: locationName,
          type,
          workMode,
          applyUrl,
          skillsRequired,
          experienceLevel,
          status: "OPEN",
          externalJobId: externalId,
          atsSource: "bamboohr",
          postedAt: bambooPostedAt ?? new Date(),
        },
        update: {
          title: jobTitle,
          description,
          requirements,
          responsibilities,
          perks,
          location: locationName,
          type,
          workMode,
          applyUrl,
          skillsRequired,
          experienceLevel,
          status: "OPEN",
          atsSource: "bamboohr",
          // postedAt intentionally NOT updated — preserve original posting date
        },
      });

      result.processedJobIds.push(upserted.id);
      result.processedJobSlugs.push(slug);
      if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
        result.created++;
      } else {
        result.updated++;
      }
    }
  } catch (err: any) {
    console.warn(`[Job Scraper] BambooHR scrape failed for "${token}": ${err.message}`);
  }

  console.log(
    `[Job Scraper] BambooHR "${token}": ${result.created} created, ${result.updated} updated.`
  );
  return result;
}

// ---------------------------------------------------------------------------
// ICIMS SITEMAP SCRAPER
// ---------------------------------------------------------------------------

/**
 * Scrapes jobs from an iCIMS sitemap XML.
 */
export async function scrapeIcimsJobs(
  token: string,
  company: CompanyRow
): Promise<{ created: number; updated: number; processedJobIds: string[]; processedJobSlugs: string[] }> {
  const result = { created: 0, updated: 0, processedJobIds: [] as string[], processedJobSlugs: [] as string[] };
  const sitemapUrl = `https://careers-${token}.icims.com/sitemap.xml`;

  try {
    const response = await resilientGet(sitemapUrl);
    const xmlContent = response.data;
    if (typeof xmlContent !== "string") return result;

    // Use Regex to parse XML sitemap
    const urlBlocks = xmlContent.match(/<url>([\s\S]*?)<\/url>/gi) || [];
    const jobsList: { url: string; lastmod?: string }[] = [];

    for (const block of urlBlocks) {
      const locMatch = block.match(/<loc>\s*(.*?)\s*<\/loc>/i);
      if (!locMatch) continue;
      const jobUrl = locMatch[1].trim();

      if (!jobUrl.includes("/jobs/") || jobUrl.endsWith("/jobs/intro")) continue;

      const lastmodMatch = block.match(/<lastmod>\s*(.*?)\s*<\/lastmod>/i);
      const lastmod = lastmodMatch ? lastmodMatch[1].trim() : undefined;
      jobsList.push({ url: jobUrl, lastmod });
    }

    for (const job of jobsList) {
      const jobUrl = job.url;
      const pathParts = jobUrl.split("/jobs/");
      if (pathParts.length < 2) continue;
      const jobPath = pathParts[1];
      const segments = jobPath.split("/");
      if (segments.length < 2) continue;

      const rawTitle = decodeURIComponent(segments[1]);
      const jobTitle = rawTitle.replace(/[-_]+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());
      const jobId = segments[0];
      if (!jobId || !isTechOrInternRole(jobTitle)) continue;

      const externalId = `icims-${token}-${jobId}`;
      const slug = slugify(`${company.slug}-${jobTitle}-${jobId}`, { lower: true, strict: true }) || `job-icims-${jobId}`;

      const locationName = company.headquarters || "Not specified";
      const workMode = parseWorkMode(locationName);
      const { description, requirements, responsibilities } = getJobDescription(jobTitle, company.name, "FULL_TIME");
      const type = classifyJobType(jobTitle, description);
      const skillsRequired = extractSkills(jobTitle, description, type);
      const experienceLevel = extractExperienceLevel(jobTitle, description);
      const postedAt = job.lastmod ? new Date(job.lastmod) : new Date();

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
          applyUrl: jobUrl,
          skillsRequired,
          experienceLevel,
          status: "OPEN",
          externalJobId: externalId,
          atsSource: "icims",
          postedAt,
        },
        update: {
          title: jobTitle,
          description,
          requirements,
          responsibilities,
          location: locationName,
          type,
          workMode,
          applyUrl: jobUrl,
          skillsRequired,
          experienceLevel,
          status: "OPEN",
          atsSource: "icims",
          // postedAt intentionally NOT updated — preserve original posting date
        },
      });

      result.processedJobIds.push(upserted.id);
      result.processedJobSlugs.push(slug);
      if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
        result.created++;
      } else {
        result.updated++;
      }
    }
  } catch (err: any) {
    console.warn(`[Job Scraper] iCIMS scrape failed for "${token}": ${err.message}`);
  }

  console.log(
    `[Job Scraper] iCIMS "${token}": ${result.created} created, ${result.updated} updated.`
  );
  return result;
}

// ---------------------------------------------------------------------------
// PAYLOCITY SCRAPER
// ---------------------------------------------------------------------------

/**
 * Scrapes jobs from a Paylocity career site.
 */
export async function scrapePaylocityJobs(
  token: string,
  company: CompanyRow
): Promise<{ created: number; updated: number; processedJobIds: string[]; processedJobSlugs: string[] }> {
  const result = { created: 0, updated: 0, processedJobIds: [] as string[], processedJobSlugs: [] as string[] };
  const url = `https://recruiting.paylocity.com/recruiting/jobs/All/${token}/`;

  try {
    const response = await resilientGet(url);
    const htmlContent = response.data;
    if (typeof htmlContent !== "string") return result;

    const pageDataMatch = htmlContent.match(/window\.pageData\s*=\s*(\{.*?\});/s);
    if (!pageDataMatch) return result;

    const data = JSON.parse(pageDataMatch[1]);
    const rawJobs = data.Jobs || [];
    if (!Array.isArray(rawJobs)) return result;

    const decodeHtml = (str: string) => {
      if (!str) return "";
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
    };

    const techJobs = rawJobs.filter((j: any) => isTechOrInternRole(decodeHtml(j?.JobTitle ?? "")));

    for (const job of techJobs) {
      const jobTitle = decodeHtml(job.JobTitle) || "Engineering Role";
      const jobId = job.JobId;
      if (!jobId) continue;

      const externalId = `paylocity-${token}-${jobId}`;
      const slug = slugify(`${company.slug}-${jobTitle}-${jobId}`, { lower: true, strict: true }) || `job-paylocity-${jobId}`;

      const loc = job.JobLocation || {};
      const city = loc.City ? decodeHtml(loc.City) : "";
      const state = loc.State ? decodeHtml(loc.State) : "";
      let locationName = [city, state].filter(Boolean).join(", ");
      if (!locationName) {
        locationName = job.LocationName ? decodeHtml(job.LocationName) : "Not specified";
      }
      if (locationName.length > 50) {
        locationName = locationName.slice(0, 50);
      }

      const isRemote = !!job.IsRemote;
      const inferredRemote = parseWorkMode(locationName) === "REMOTE";
      const workMode = (isRemote || inferredRemote) ? "REMOTE" : parseWorkMode(locationName);

      const { description, requirements, responsibilities } = getJobDescription(jobTitle, company.name, "FULL_TIME");
      const type = classifyJobType(jobTitle, description);
      const skillsRequired = extractSkills(jobTitle, description, type);
      const experienceLevel = extractExperienceLevel(jobTitle, description);
      const applyUrl = `https://recruiting.paylocity.com/recruiting/Jobs/Details/${jobId}`;
      const postedAt = job.PublishedDate ? new Date(job.PublishedDate) : new Date();

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
          experienceLevel,
          status: "OPEN",
          externalJobId: externalId,
          atsSource: "paylocity",
          postedAt,
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
          experienceLevel,
          status: "OPEN",
          atsSource: "paylocity",
          // postedAt intentionally NOT updated — preserve original posting date
        },
      });

      result.processedJobIds.push(upserted.id);
      result.processedJobSlugs.push(slug);
      if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
        result.created++;
      } else {
        result.updated++;
      }
    }
  } catch (err: any) {
    console.warn(`[Job Scraper] Paylocity scrape failed for "${token}": ${err.message}`);
  }

  console.log(
    `[Job Scraper] Paylocity "${token}": ${result.created} created, ${result.updated} updated.`
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
    select: {
      id: true,
      name: true,
      slug: true,
      headquarters: true,
      country: true,
      websiteUrl: true,
      careersPageUrl: true,
      atsToken: true,
      atsSource: true,
    }
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
        const summary = formatScraperError(settlement.reason);
        console.error(`[Job Scraper] Unexpected rejection for "${batch[i].name}": ${summary}`);
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

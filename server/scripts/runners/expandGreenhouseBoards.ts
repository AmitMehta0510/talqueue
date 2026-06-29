/**
 * Greenhouse Board Expansion Collector
 * =====================================
 * The Greenhouse canonical board index (`/v1/boards`) is NOT publicly accessible
 * (returns 404 to unauthenticated requests). This script instead uses an
 * expanded curated seed list of known high-signal Greenhouse board tokens and
 * probes each one to verify it's active (≥ MIN_JOBS open roles).
 *
 * Active boards are written to `data/greenhouse-boards.json`, merging with
 * the existing curated entries and deduplicating by token.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register scripts/expandGreenhouseBoards.ts
 *
 * Output:
 *   server/src/modules/companies/scraper/data/greenhouse-boards.json
 */
import axios from "axios";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const MIN_JOBS       = 5;
const CONCURRENCY    = 10;
const BATCH_DELAY_MS = 300;
const TIMEOUT_MS     = 8000;

const OUTPUT_PATH = path.resolve(
  __dirname,
  "../../src/modules/companies/scraper/data/greenhouse-boards.json"
);

const EXISTING_PATH = OUTPUT_PATH;

// ---------------------------------------------------------------------------
// EXPANDED CANDIDATE POOL
// Large tech, scale-up, and growth-stage companies with known GH boards.
// Tokens verified as structurally valid — probing filters dead ones.
// ---------------------------------------------------------------------------
const CANDIDATE_BOARDS: Array<{ token: string; name: string; industry: string }> = [
  // FAANG-adjacent & hyper-growth
  { token: "google",          name: "Google",         industry: "Cloud & AI" },
  { token: "meta",            name: "Meta",            industry: "Social Media & AI" },
  { token: "apple",           name: "Apple",           industry: "Consumer Technology" },
  { token: "netflix",         name: "Netflix",         industry: "Streaming & Entertainment" },
  { token: "microsoft",       name: "Microsoft",       industry: "Cloud & Enterprise Software" },
  { token: "amazon",          name: "Amazon",          industry: "E-Commerce & Cloud" },
  { token: "linkedin",        name: "LinkedIn",        industry: "Professional Network" },
  { token: "salesforce",      name: "Salesforce",      industry: "CRM & Enterprise Cloud" },
  { token: "oracle",          name: "Oracle",          industry: "Database & Cloud" },
  { token: "servicenow",      name: "ServiceNow",      industry: "Enterprise Workflow" },
  { token: "workday",         name: "Workday",         industry: "HR & Finance Cloud" },
  { token: "sap",             name: "SAP",             industry: "Enterprise ERP" },
  { token: "ibm",             name: "IBM",             industry: "Enterprise Technology" },
  { token: "intel",           name: "Intel",           industry: "Semiconductors" },
  // Fintech
  { token: "robinhood",       name: "Robinhood",       industry: "Retail Investing" },
  { token: "coinbase",        name: "Coinbase",        industry: "Crypto Exchange" },
  { token: "klarna",          name: "Klarna",          industry: "Buy Now Pay Later" },
  { token: "payoneer",        name: "Payoneer",        industry: "Cross-Border Payments" },
  { token: "wise",            name: "Wise",            industry: "Money Transfer" },
  { token: "marqeta",         name: "Marqeta",         industry: "Card Issuing" },
  { token: "rapyd",           name: "Rapyd",           industry: "FinTech Infrastructure" },
  { token: "mambu",           name: "Mambu",           industry: "Banking Platform" },
  { token: "galileo",         name: "Galileo",         industry: "Payment Platform" },
  // Developer Tools & Infra
  { token: "hashicorp",       name: "HashiCorp",       industry: "Infrastructure Automation" },
  { token: "redhat",          name: "Red Hat",         industry: "Enterprise Open Source" },
  { token: "suse",            name: "SUSE",            industry: "Enterprise Linux" },
  { token: "cloudera",        name: "Cloudera",        industry: "Data Platform" },
  { token: "puppet",          name: "Puppet",          industry: "IT Automation" },
  { token: "chef",            name: "Chef",            industry: "DevOps Automation" },
  { token: "newrelic",        name: "New Relic",       industry: "Observability" },
  { token: "dynatrace",       name: "Dynatrace",       industry: "APM & Observability" },
  { token: "sumologic",       name: "Sumo Logic",      industry: "Log Analytics" },
  { token: "pagerduty",       name: "PagerDuty",       industry: "Incident Management" },
  { token: "opsramp",         name: "OpsRamp",         industry: "IT Operations" },
  // AI & ML
  { token: "scale",           name: "Scale AI",        industry: "AI Data Labelling" },
  { token: "anthropic",       name: "Anthropic",       industry: "AI Safety Research" },
  { token: "inflection",      name: "Inflection AI",   industry: "Personal AI" },
  { token: "huggingface",     name: "Hugging Face",    industry: "Open-Source AI" },
  { token: "databricks",      name: "Databricks",      industry: "Data Lakehouse & ML" },
  { token: "singlestore",     name: "SingleStore",     industry: "Real-Time Analytics" },
  { token: "qdrant",          name: "Qdrant",          industry: "Vector Database" },
  { token: "pinecone",        name: "Pinecone",        industry: "Vector Database" },
  { token: "weaviate",        name: "Weaviate",        industry: "Vector Database" },
  { token: "mistral",         name: "Mistral AI",      industry: "AI Models" },
  { token: "perplexity",      name: "Perplexity AI",   industry: "AI Search" },
  // Security
  { token: "crowdstrike",     name: "CrowdStrike",     industry: "Endpoint Security" },
  { token: "sentinelone",     name: "SentinelOne",     industry: "Cybersecurity AI" },
  { token: "lacework",        name: "Lacework",        industry: "Cloud Security" },
  { token: "snyk",            name: "Snyk",            industry: "Developer Security" },
  { token: "wiz",             name: "Wiz",             industry: "Cloud Security" },
  { token: "orca",            name: "Orca Security",   industry: "Cloud Security" },
  { token: "armis",           name: "Armis",           industry: "IoT Security" },
  { token: "noname",          name: "Noname Security", industry: "API Security" },
  { token: "1password",       name: "1Password",       industry: "Password Management" },
  { token: "bitwarden",       name: "Bitwarden",       industry: "Open-Source Security" },
  // SaaS Horizontal
  { token: "notion",          name: "Notion",          industry: "Productivity" },
  { token: "figma",           name: "Figma",           industry: "Design Tools" },
  { token: "canva",           name: "Canva",           industry: "Visual Design" },
  { token: "zapier",          name: "Zapier",          industry: "Workflow Automation" },
  { token: "make",            name: "Make",            industry: "Workflow Automation" },
  { token: "clickup",         name: "ClickUp",         industry: "Project Management" },
  { token: "monday",          name: "Monday.com",      industry: "Work OS" },
  { token: "smartsheet",      name: "Smartsheet",      industry: "Collaborative Work" },
  { token: "coda",            name: "Coda",            industry: "Document & Workflow" },
  { token: "airtable",        name: "Airtable",        industry: "Database & Productivity" },
  { token: "quip",            name: "Quip",            industry: "Collaboration" },
  // E-Commerce & Retail
  { token: "shopify",         name: "Shopify",         industry: "E-Commerce Infrastructure" },
  { token: "bigcommerce",     name: "BigCommerce",     industry: "E-Commerce Platform" },
  { token: "gorgias",         name: "Gorgias",         industry: "E-Commerce Support" },
  { token: "klaviyo",         name: "Klaviyo",         industry: "E-Commerce Marketing" },
  { token: "attentive",       name: "Attentive",       industry: "Mobile Marketing" },
  { token: "yotpo",           name: "Yotpo",           industry: "E-Commerce Marketing" },
  // Healthcare Tech
  { token: "tempus",          name: "Tempus AI",       industry: "Precision Medicine" },
  { token: "veracyte",        name: "Veracyte",        industry: "Genomic Diagnostics" },
  { token: "doximity",        name: "Doximity",        industry: "Digital Health" },
  { token: "modernhealth",    name: "Modern Health",   industry: "Mental Health" },
  { token: "hinge-health",    name: "Hinge Health",    industry: "Digital Physical Therapy" },
  { token: "noom",            name: "Noom",            industry: "Behavior Health" },
  { token: "temphealth",      name: "Temp Health",     industry: "Healthcare Staffing" },
  // Travel & Logistics
  { token: "airbnb",          name: "Airbnb",          industry: "Short-Term Rentals" },
  { token: "lyft",            name: "Lyft",            industry: "Ride Sharing" },
  { token: "grab",            name: "Grab",            industry: "Super App" },
  { token: "gett",            name: "Gett",            industry: "B2B Mobility" },
  { token: "flexport",        name: "Flexport",        industry: "Freight Logistics" },
  { token: "project44",       name: "project44",       industry: "Supply Chain Visibility" },
  { token: "stord",           name: "Stord",           industry: "Cloud Supply Chain" },
  // EdTech
  { token: "duolingo",        name: "Duolingo",        industry: "Language Learning" },
  { token: "chegg",           name: "Chegg",           industry: "Student Services" },
  { token: "coursera",        name: "Coursera",        industry: "Online Education" },
  { token: "udemy",           name: "Udemy",           industry: "Online Learning" },
  { token: "kahoot",          name: "Kahoot",          industry: "EdTech Engagement" },
  { token: "memorang",        name: "Memorang",        industry: "Adaptive Learning" },
  // Media & Content
  { token: "spotify",         name: "Spotify",         industry: "Music Streaming" },
  { token: "soundcloud",      name: "SoundCloud",      industry: "Audio Platform" },
  { token: "buzzfeed",        name: "BuzzFeed",        industry: "Digital Media" },
  { token: "vox",             name: "Vox Media",       industry: "Digital Publishing" },
  // Prop-Tech & Real Estate
  { token: "opendoor",        name: "Opendoor",        industry: "Real Estate Technology" },
  { token: "compass",         name: "Compass",         industry: "Real Estate Brokerage" },
  { token: "lemonhome",       name: "Lemon.io",        industry: "Developer Marketplace" },
  // Climate & Sustainability
  { token: "arcadia",         name: "Arcadia",         industry: "Clean Energy" },
  { token: "watershed",       name: "Watershed",       industry: "Carbon Accounting" },
  { token: "pachama",         name: "Pachama",         industry: "Forest Carbon" },
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

async function probeBoard(token: string): Promise<number> {
  try {
    const res = await axios.get(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`,
      {
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
          "Accept":     "application/json",
        },
      }
    );
    return (res.data?.jobs ?? []).length as number;
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  // Load existing curated boards
  let existing: any[] = [];
  try {
    existing = JSON.parse(fs.readFileSync(EXISTING_PATH, "utf-8"));
  } catch {
    console.warn("[GH Expand] No existing greenhouse-boards.json found — starting fresh.");
  }
  const existingTokens = new Set(existing.map((e: any) => e.token));

  // Merge candidates with existing, dedup by token
  const allCandidates = [
    ...CANDIDATE_BOARDS.filter((c) => !existingTokens.has(c.token)),
    ...CANDIDATE_BOARDS.filter((c) => existingTokens.has(c.token)),
  ];

  // Only probe NEW tokens — skip re-probing existing ones
  const newCandidates = CANDIDATE_BOARDS.filter((c) => !existingTokens.has(c.token));

  console.log(`\n[GH Expand] Existing boards: ${existing.length}`);
  console.log(`[GH Expand] New candidates to probe: ${newCandidates.length}\n`);

  const newActive: any[] = [];
  let scanned = 0;

  // Process in batches
  for (let i = 0; i < newCandidates.length; i += CONCURRENCY) {
    const batch = newCandidates.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (candidate) => {
        const count = await probeBoard(candidate.token);
        scanned++;
        if (count >= MIN_JOBS) {
          newActive.push({ token: candidate.token, name: candidate.name, domain: "", industry: candidate.industry });
          console.log(`  [PASS] ${candidate.token.padEnd(30)} ${count} jobs  (${candidate.name})`);
        } else {
          console.log(`  [SKIP] ${candidate.token.padEnd(30)} ${count === -1 ? "error/404" : count + " jobs (below threshold)"}`);
        }
      })
    );
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  // Merge: existing + newly confirmed active, sort by token
  const merged = [...existing, ...newActive];
  merged.sort((a, b) => a.token.localeCompare(b.token));

  // Dedup by token (keep first occurrence)
  const seen = new Set<string>();
  const final = merged.filter((e) => {
    if (seen.has(e.token)) return false;
    seen.add(e.token);
    return true;
  });

  console.log(`\n[GH Expand] Probed: ${scanned} new candidates`);
  console.log(`[GH Expand] Newly active: ${newActive.length}`);
  console.log(`[GH Expand] Total in output: ${final.length}`);
  console.log(`[GH Expand] Writing to: ${OUTPUT_PATH}\n`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(final, null, 2) + "\n");
  console.log("[GH Expand] greenhouse-boards.json updated successfully.");
}

main().catch((e) => {
  console.error("[GH Expand] Unhandled error:", e);
  process.exit(1);
});

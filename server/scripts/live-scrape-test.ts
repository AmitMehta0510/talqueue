/**
 * live-scrape-test.ts
 *
 * Live end-to-end verification of the v2 job scraping pipeline.
 *
 * Runs: Greenhouse → Lever → Ashby → Workday (one company each)
 * through the full stack:
 *   ATS Adapter → JobPipeline → structured ParsedJob
 *
 * Does NOT write to DB. Prints a rich comparison table showing
 * exactly what data came from the source vs. what the pipeline extracted.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/live-scrape-test.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import { GreenhouseAdapter }  from "../src/pipeline/adapters/GreenhouseAdapter";
import { LeverAdapter }       from "../src/pipeline/adapters/LeverAdapter";
import { AshbyAdapter }       from "../src/pipeline/adapters/AshbyAdapter";
import { WorkdayAdapter }     from "../src/pipeline/adapters/WorkdayAdapter";
import { getJobPipeline }     from "../src/pipeline/JobPipeline";
import type { RawJobInput, CompanyRow } from "../src/pipeline/interfaces/ATSAdapter";

// ── Colour helpers (ANSI) ─────────────────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  gray:   "\x1b[90m",
  blue:   "\x1b[34m",
  magenta:"\x1b[35m",
};

const bold  = (s: string) => `${C.bold}${s}${C.reset}`;
const cyan  = (s: string) => `${C.cyan}${s}${C.reset}`;
const green = (s: string) => `${C.green}${s}${C.reset}`;
const yellow= (s: string) => `${C.yellow}${s}${C.reset}`;
const gray  = (s: string) => `${C.gray}${s}${C.reset}`;
const red   = (s: string) => `${C.red}${s}${C.reset}`;
const blue  = (s: string) => `${C.blue}${s}${C.reset}`;
const mag   = (s: string) => `${C.magenta}${s}${C.reset}`;

// ── Test companies ─────────────────────────────────────────────────────────────

interface TestTarget {
  label: string;
  atsName: string;
  token: string;
  company: CompanyRow;
}

const TARGETS: TestTarget[] = [
  {
    label:   "🟢 GREENHOUSE → Stripe",
    atsName: "greenhouse",
    token:   "stripe",
    company: { id: "test-1", name: "Stripe", slug: "stripe", headquarters: "San Francisco, CA", country: "US", websiteUrl: "https://stripe.com", careersPageUrl: null, atsToken: "stripe", atsSource: "greenhouse" },
  },
  {
    label:   "🟡 LEVER → Shopify",
    atsName: "lever",
    token:   "shopify",
    company: { id: "test-2", name: "Shopify", slug: "shopify", headquarters: "Ottawa, Canada", country: "CA", websiteUrl: "https://shopify.com", careersPageUrl: null, atsToken: "shopify", atsSource: "lever" },
  },
  {
    label:   "🔵 ASHBY → 1Password",
    atsName: "ashby",
    token:   "1password",
    company: { id: "test-3", name: "1Password", slug: "1password", headquarters: "Toronto, Canada", country: "CA", websiteUrl: "https://1password.com", careersPageUrl: null, atsToken: "1password", atsSource: "ashby" },
  },
  {
    label:   "🔴 WORKDAY → Nvidia",
    atsName: "workday",
    token:   "nvidia",
    company: { id: "test-4", name: "Nvidia", slug: "nvidia", headquarters: "Santa Clara, CA", country: "US", websiteUrl: "https://nvidia.com", careersPageUrl: null, atsToken: "nvidia", atsSource: "workday" },
  },
];

// ── Adapter factory ─────────────────────────────────────────────────────────────

function getAdapter(name: string) {
  switch (name) {
    case "greenhouse": return new GreenhouseAdapter();
    case "lever":      return new LeverAdapter();
    case "ashby":      return new AshbyAdapter();
    case "workday":    return new WorkdayAdapter();
    default: throw new Error(`Unknown adapter: ${name}`);
  }
}

// ── Pretty print helpers ────────────────────────────────────────────────────────

function hr(char = "─", width = 90) { return char.repeat(width); }

function bar(value: number, max = 1.0, width = 20): string {
  const filled = Math.round((value / max) * width);
  const empty  = width - filled;
  const pct    = (value * 100).toFixed(0);
  const color  = value >= 0.85 ? green : value >= 0.6 ? yellow : red;
  return `${color("█".repeat(filled))}${gray("░".repeat(empty))} ${color(pct + "%")}`;
}

function truncate(s: string, n: number): string {
  if (!s) return gray("(empty)");
  return s.length > n ? s.slice(0, n) + gray("…") : s;
}

function printJob(raw: RawJobInput, parsed: any, platform: string, idx: number) {
  const loc  = parsed.location?.value;
  const exp  = parsed.experience?.value;
  const sal  = parsed.salary?.value;
  const req  = parsed.requiredSkills?.value ?? [];
  const pref = parsed.preferredSkills?.value ?? [];
  const ts   = parsed.techStack;
  const respArr: string[] = parsed.responsibilities?.value ?? [];
  const reqArr:  string[] = parsed.requirements?.value ?? [];

  console.log("\n" + hr("═"));
  console.log(bold(cyan(`  JOB #${idx + 1}  [${platform}]`)));
  console.log(hr("═"));

  // ── Core identity ──────────────────────────────────────────────────────────
  console.log(bold("\n  📋 CORE IDENTITY"));
  console.log(hr("─", 60));
  console.log(`  ${bold("Title")}        : ${yellow(parsed.title)}`);
  console.log(`  ${bold("External ID")} : ${gray(parsed.externalId)}`);
  console.log(`  ${bold("ATS Source")}  : ${mag(parsed.atsSource || platform)}`);
  console.log(`  ${bold("Apply URL")}   : ${blue((parsed.applyUrl || (raw as any)._applyUrl || "").slice(0, 80))}`);
  console.log(`  ${bold("Posted At")}   : ${parsed.postedAt ? yellow(parsed.postedAt.toISOString().slice(0,10)) : gray("not provided")}`);

  // ── Job type / work mode ───────────────────────────────────────────────────
  console.log(bold("\n  🏷️  CLASSIFICATION"));
  console.log(hr("─", 60));
  const jtColor = parsed.jobType?.value === "INTERNSHIP" ? mag : parsed.jobType?.value === "CONTRACT" ? yellow : green;
  console.log(`  ${bold("Job Type")}    : ${jtColor(parsed.jobType?.value || "?")}  ${gray("(conf: " + ((parsed.jobType?.confidence ?? 0) * 100).toFixed(0) + "% via " + (parsed.jobType?.source || "?") + ")")}`);
  console.log(`  ${bold("Work Mode")}   : ${cyan(parsed.workMode?.value || "?")}  ${gray("(conf: " + ((parsed.workMode?.confidence ?? 0) * 100).toFixed(0) + "%)")}`);

  // ── Location ───────────────────────────────────────────────────────────────
  console.log(bold("\n  📍 LOCATION"));
  console.log(hr("─", 60));
  console.log(`  ${bold("Raw")}         : ${yellow(loc?.raw || gray("(none)"))}`);
  console.log(`  ${bold("City")}        : ${loc?.city || gray("null")}`);
  console.log(`  ${bold("State")}       : ${loc?.state || gray("null")}`);
  console.log(`  ${bold("Country")}     : ${loc?.country || gray("null")}  ${loc?.countryCode ? gray("[" + loc.countryCode + "]") : ""}`);
  console.log(`  ${bold("Remote")}      : ${loc?.isRemote ? green("YES") : red("NO")}  Hybrid: ${loc?.isHybrid ? yellow("YES") : "NO"}`);
  console.log(`  ${bold("Visa Spon.")}  : ${loc?.visaSponsorship === true ? green("mentioned") : loc?.visaSponsorship === false ? red("not offered") : gray("not mentioned")}`);

  // ── Experience ─────────────────────────────────────────────────────────────
  console.log(bold("\n  👤 EXPERIENCE"));
  console.log(hr("─", 60));
  console.log(`  ${bold("Level")}       : ${yellow(exp?.label || "Unknown")}`);
  console.log(`  ${bold("Years")}       : ${exp?.minYears ?? gray("?")} – ${exp?.maxYears ?? gray("?")} years`);
  if (exp?.signals?.length) {
    console.log(`  ${bold("Signals")}     : ${gray(exp.signals.slice(0, 3).join(" | "))}`);
  }

  // ── Salary ─────────────────────────────────────────────────────────────────
  console.log(bold("\n  💰 SALARY"));
  console.log(hr("─", 60));
  if (sal) {
    console.log(`  ${green(sal.currency + " " + sal.min.toLocaleString())} – ${sal.max ? green(sal.max.toLocaleString()) : gray("open")} / ${sal.period}`);
  } else {
    console.log(`  ${gray("Not mentioned in job description")}`);
  }

  // ── Description ────────────────────────────────────────────────────────────
  console.log(bold("\n  📄 DESCRIPTION PREVIEW"));
  console.log(hr("─", 60));
  const desc = parsed.description || "";
  if (desc.length > 10) {
    console.log("  " + truncate(desc.replace(/\n/g, " "), 280));
  } else {
    console.log("  " + red("⚠  Empty — detail fetch may have failed (expected for some ATS)"));
  }

  // ── Responsibilities ───────────────────────────────────────────────────────
  console.log(bold("\n  📌 RESPONSIBILITIES") + gray(` (${respArr.length} extracted)`));
  console.log(hr("─", 60));
  if (respArr.length === 0) {
    console.log("  " + gray("none extracted"));
  } else {
    respArr.slice(0, 4).forEach((r, i) => console.log(`  ${gray(String(i + 1) + ".")} ${truncate(r, 110)}`));
    if (respArr.length > 4) console.log("  " + gray(`  …and ${respArr.length - 4} more`));
  }

  // ── Requirements ──────────────────────────────────────────────────────────
  console.log(bold("\n  ✅ REQUIREMENTS") + gray(` (${reqArr.length} extracted)`));
  console.log(hr("─", 60));
  if (reqArr.length === 0) {
    console.log("  " + gray("none extracted"));
  } else {
    reqArr.slice(0, 4).forEach((r, i) => console.log(`  ${gray(String(i + 1) + ".")} ${truncate(r, 110)}`));
    if (reqArr.length > 4) console.log("  " + gray(`  …and ${reqArr.length - 4} more`));
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  console.log(bold("\n  🔧 REQUIRED SKILLS") + gray(` (${req.length} total)`));
  console.log(hr("─", 60));
  if (req.length === 0) {
    console.log("  " + gray("none extracted"));
  } else {
    const byCategory: Record<string, string[]> = {};
    for (const s of req) {
      (byCategory[s.category] = byCategory[s.category] || []).push(s.name);
    }
    for (const [cat, names] of Object.entries(byCategory).sort()) {
      console.log(`  ${cyan(cat.padEnd(20))} ${names.join(", ")}`);
    }
  }

  if (pref.length > 0) {
    console.log(bold("\n  ⭐ PREFERRED SKILLS") + gray(` (${pref.length} total)`));
    console.log(hr("─", 60));
    console.log("  " + pref.map((s: any) => s.name).join(", "));
  }

  // ── Tech Stack ─────────────────────────────────────────────────────────────
  if (ts) {
    console.log(bold("\n  🛠️  TECH STACK DECOMPOSITION"));
    console.log(hr("─", 60));
    const stackEntries = [
      ["Languages",   ts.languages],
      ["Frameworks",  ts.frameworks],
      ["Cloud",       ts.cloud],
      ["Databases",   ts.databases],
      ["DevOps",      ts.devops],
      ["AI/ML",       ts.ai_ml],
      ["Testing",     ts.testing],
      ["Other",       ts.other],
    ] as [string, string[]][];
    for (const [key, vals] of stackEntries) {
      if (vals?.length) {
        console.log(`  ${mag(key.padEnd(16))} ${vals.join(", ")}`);
      }
    }
  }

  // ── Raw HTML quality check ─────────────────────────────────────────────────
  console.log(bold("\n  📊 EXTRACTION QUALITY"));
  console.log(hr("─", 60));
  const rawHtmlLen = raw.rawHtml?.length ?? 0;
  const descLen    = desc.length;
  console.log(`  ${bold("Raw HTML size")} : ${rawHtmlLen > 0 ? green(rawHtmlLen.toLocaleString() + " bytes") : red("0 bytes ← detail fetch failed")}`);
  console.log(`  ${bold("Plain text")}    : ${parsed.plainText?.length ? green(parsed.plainText.length.toLocaleString() + " chars") : gray("0")}`);
  console.log(`  ${bold("Sections found")}: ${parsed.parsedSections?.size ?? 0}`);
  console.log(`  ${bold("Confidence")}    : ${bar(parsed.overallConfidence ?? 0)} ${gray("(overall pipeline score)")}`);
  console.log(`  ${bold("LLM needed")}    : ${parsed.needsLLMReview ? yellow("yes") : green("no")}`);
  console.log(`  ${bold("Pipeline ver.")} : ${gray(parsed.pipelineVersion)}`);
  console.log(`  ${bold("Time taken")}    : ${yellow(parsed.processingMs + "ms")}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const pipeline = getJobPipeline({ enableLLM: false, version: "2.0.0" });

  console.log("\n" + hr("═"));
  console.log(bold(cyan("  LIVE SCRAPE TEST — v2 Pipeline Verification")));
  console.log(bold(gray("  Testing: Greenhouse | Lever | Ashby | Workday")));
  console.log(bold(gray("  Mode: Real HTTP requests, no DB writes")));
  console.log(hr("═"));

  const results: { platform: string; jobCount: number; successCount: number; avgConf: number }[] = [];

  for (const target of TARGETS) {
    console.log("\n\n" + hr("═", 90));
    console.log(bold(`\n  ${target.label}`));
    console.log(bold(gray(`  Token: ${target.token}  Company: ${target.company.name}`)));
    console.log(hr("═", 90));

    const adapter = getAdapter(target.atsName);
    let rawInputs: RawJobInput[] = [];

    console.log(gray(`\n  ⏳ Fetching jobs from ${target.atsName}...`));
    const fetchStart = Date.now();

    try {
      rawInputs = await adapter.fetchJobs(target.token, target.company);
      const fetchMs = Date.now() - fetchStart;
      console.log(green(`  ✓ Fetched ${rawInputs.length} tech/intern jobs in ${fetchMs}ms`));
    } catch (err: any) {
      console.log(red(`  ✗ Fetch failed: ${err?.message ?? err}`));
      results.push({ platform: target.atsName, jobCount: 0, successCount: 0, avgConf: 0 });
      continue;
    }

    if (rawInputs.length === 0) {
      console.log(yellow(`  ⚠ No tech/intern jobs found for ${target.company.name} on ${target.atsName}`));
      results.push({ platform: target.atsName, jobCount: 0, successCount: 0, avgConf: 0 });
      continue;
    }

    // Process first 2 jobs through the full pipeline
    const sample = rawInputs.slice(0, 2);
    let successCount = 0;
    let totalConf = 0;

    for (let i = 0; i < sample.length; i++) {
      const raw = sample[i];
      // Inject atsSource for pipeline internals
      (raw as any)._atsSource = target.atsName;

      console.log(gray(`\n  ⏳ Running pipeline on: "${raw.title}"`));
      try {
        const parsed = await pipeline.process(raw);
        printJob(raw, parsed, target.atsName.toUpperCase(), i);
        successCount++;
        totalConf += parsed.overallConfidence ?? 0;
      } catch (err: any) {
        console.log(red(`  ✗ Pipeline failed for "${raw.title}": ${err?.message ?? err}`));
      }
    }

    results.push({
      platform: target.atsName,
      jobCount: rawInputs.length,
      successCount,
      avgConf: successCount > 0 ? totalConf / successCount : 0,
    });
  }

  // ── Summary table ──────────────────────────────────────────────────────────
  console.log("\n\n" + hr("═"));
  console.log(bold(cyan("  SUMMARY")));
  console.log(hr("═"));
  console.log(bold(`  ${"Platform".padEnd(14)} ${"Jobs found".padEnd(12)} ${"Processed".padEnd(12)} Avg Confidence`));
  console.log(hr("─", 70));
  for (const r of results) {
    const confBar = bar(r.avgConf);
    const jobCol  = r.jobCount > 0 ? green(String(r.jobCount).padEnd(12)) : red("0".padEnd(12));
    const sucCol  = r.successCount > 0 ? green(String(r.successCount).padEnd(12)) : red("0".padEnd(12));
    console.log(`  ${r.platform.padEnd(14)} ${jobCol} ${sucCol} ${confBar}`);
  }
  console.log(hr("═"));
  console.log(bold(green("\n  ✅ Test complete — all results from LIVE ATS sources\n")));
}

main().catch((err) => {
  console.error(red("\n  FATAL: " + (err?.message ?? err)));
  process.exit(1);
});

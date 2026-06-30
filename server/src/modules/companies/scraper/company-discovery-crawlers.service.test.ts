/**
 * @file company-discovery-crawlers.service.test.ts
 * @module CompanyScraper
 *
 * Unit + integration test suite for the autonomous ATS discovery crawler.
 *
 * Architecture notes:
 *  - Pure-function tests (ATS signature extractors, JSON-LD parser) run
 *    without any mocks — they operate purely on HTML strings.
 *  - Puppeteer is NOT invoked in these tests; the full crawler entry point
 *    (runAutonomousCrawler) is integration-tested with a known ATS token
 *    and requires the DB to be available (skipped in CI by default via
 *    SKIP_INTEGRATION env flag).
 *
 * Coverage map:
 *  ┌──────────────────────────────────────────────────────────────────────────┐
 *  │  Suite 1 │ Greenhouse Extractor  │ direct URL, href in anchor tag        │
 *  │  Suite 2 │ Lever Extractor       │ direct URL, iframe src                │
 *  │  Suite 3 │ Ashby Extractor       │ jobs.ashbyhq.com, embed format        │
 *  │  Suite 4 │ Workday Extractor     │ wd1–wd5 variants, edge cases          │
 *  │  Suite 5 │ detectAtsFromHtml     │ priority order, multi-ATS page        │
 *  │  Suite 6 │ JSON-LD Parser        │ single schema, @graph, HTML strip     │
 *  │  Suite 7 │ JSON-LD Edge Cases    │ malformed JSON, no JobPosting         │
 *  └──────────────────────────────────────────────────────────────────────────┘
 */

import { describe, test, expect } from "vitest";

import {
  extractGreenhouseToken,
  extractLeverToken,
  extractAshbyToken,
  extractWorkdayToken,
  extractBambooHRToken,
  extractIcimsToken,
  extractPaylocityToken,
  detectAtsFromHtml,
  parseJsonLdJobs,
} from "./company-discovery-crawlers.service";

// ---------------------------------------------------------------------------
// Suite 1 — Greenhouse Token Extractor
// ---------------------------------------------------------------------------

describe("extractGreenhouseToken", () => {
  test("extracts token from a boards.greenhouse.io direct URL", () => {
    const html = `<a href="https://boards.greenhouse.io/notion">View jobs at Notion</a>`;
    expect(extractGreenhouseToken(html)).toBe("notion");
  });

  test("extracts token from a Greenhouse API URL embedded in page source", () => {
    const html = `fetch("https://boards.greenhouse.io/stripe/jobs?callback=...")`;
    expect(extractGreenhouseToken(html)).toBe("stripe");
  });

  test("extracts token with underscores and hyphens", () => {
    const html = `https://boards.greenhouse.io/scale_ai`;
    expect(extractGreenhouseToken(html)).toBe("scale_ai");
  });

  test("is case-insensitive (boards.GREENHOUSE.io)", () => {
    const html = `https://boards.GREENHOUSE.io/openai`;
    expect(extractGreenhouseToken(html)).toBe("openai");
  });

  test("returns null when no Greenhouse URL is present", () => {
    const html = `<a href="https://example.com/careers">Careers</a>`;
    expect(extractGreenhouseToken(html)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Lever Token Extractor
// ---------------------------------------------------------------------------

describe("extractLeverToken", () => {
  test("extracts slug from a jobs.lever.co direct link", () => {
    const html = `<iframe src="https://jobs.lever.co/airbnb?embed=true"></iframe>`;
    expect(extractLeverToken(html)).toBe("airbnb");
  });

  test("extracts slug from an anchor href", () => {
    const html = `<a href="https://jobs.lever.co/coinbase">Open Roles</a>`;
    expect(extractLeverToken(html)).toBe("coinbase");
  });

  test("returns null when no Lever URL is present", () => {
    const html = `<p>No Lever here</p>`;
    expect(extractLeverToken(html)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Ashby Token Extractor
// ---------------------------------------------------------------------------

describe("extractAshbyToken", () => {
  test("extracts token from jobs.ashbyhq.com format", () => {
    const html = `<a href="https://jobs.ashbyhq.com/linear">Join us</a>`;
    expect(extractAshbyToken(html)).toBe("linear");
  });

  test("extracts token from ashbyhq.com/embed/ format", () => {
    const html = `<iframe src="https://ashbyhq.com/embed/figma?compact=true"></iframe>`;
    expect(extractAshbyToken(html)).toBe("figma");
  });

  test("returns null when no Ashby URL is present", () => {
    const html = `<p>This company does not use Ashby.</p>`;
    expect(extractAshbyToken(html)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Workday Token Extractor
// ---------------------------------------------------------------------------

describe("extractWorkdayToken", () => {
  test("extracts company subdomain from wd1 variant", () => {
    const html = `<a href="https://amazon.wd1.myworkdayjobs.com/en-US/External">Amazon Careers</a>`;
    expect(extractWorkdayToken(html)).toBe("amazon");
  });

  test("extracts company subdomain from wd5 variant", () => {
    const html = `https://microsoft.wd5.myworkdayjobs.com/careers`;
    expect(extractWorkdayToken(html)).toBe("microsoft");
  });

  test("extracts from wd3 variant", () => {
    const html = `src="https://google.wd3.myworkdayjobs.com/jobs"`;
    expect(extractWorkdayToken(html)).toBe("google");
  });

  test("handles hyphenated company subdomain", () => {
    const html = `https://johnson-controls.wd1.myworkdayjobs.com/JCI`;
    expect(extractWorkdayToken(html)).toBe("johnson-controls");
  });

  test("returns null when no Workday URL is present", () => {
    const html = `<p>No Workday here</p>`;
    expect(extractWorkdayToken(html)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 4.1 — BambooHR Token Extractor
// ---------------------------------------------------------------------------

describe("extractBambooHRToken", () => {
  test("extracts subdomain from bamboohr link", () => {
    const html = `<a href="https://postman.bamboohr.com/careers">Postman Careers</a>`;
    expect(extractBambooHRToken(html)).toBe("postman");
  });

  test("returns null when no BambooHR link is present", () => {
    const html = `<p>No BambooHR here</p>`;
    expect(extractBambooHRToken(html)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 4.2 — iCIMS Token Extractor
// ---------------------------------------------------------------------------

describe("extractIcimsToken", () => {
  test("extracts subdomain from careers- prefixed link", () => {
    const html = `<a href="https://careers-google.icims.com/jobs">Google Jobs</a>`;
    expect(extractIcimsToken(html)).toBe("google");
  });

  test("extracts subdomain from standard icims link", () => {
    const html = `<a href="https://acme.icims.com/jobs">Acme Jobs</a>`;
    expect(extractIcimsToken(html)).toBe("acme");
  });

  test("returns null when no iCIMS link is present", () => {
    const html = `<p>No iCIMS here</p>`;
    expect(extractIcimsToken(html)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 4.3 — Paylocity Token Extractor
// ---------------------------------------------------------------------------

describe("extractPaylocityToken", () => {
  test("extracts token from recruiting link", () => {
    const html = `<a href="https://recruiting.paylocity.com/recruiting/jobs/All/12345/">Jobs</a>`;
    expect(extractPaylocityToken(html)).toBe("12345");
  });

  test("extracts token from details URL with orgGuid query parameter", () => {
    const html = `<a href="https://recruiting.paylocity.com/Recruiting/Jobs/Details/999?orgGuid=12345-abc-678">Details</a>`;
    expect(extractPaylocityToken(html)).toBe("12345-abc-678");
  });

  test("returns null when no Paylocity link is present", () => {
    const html = `<p>No Paylocity here</p>`;
    expect(extractPaylocityToken(html)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — detectAtsFromHtml (priority + multi-ATS)
// ---------------------------------------------------------------------------

describe("detectAtsFromHtml", () => {
  test("returns Greenhouse when only Greenhouse is present", () => {
    const html = `<a href="https://boards.greenhouse.io/vercel">Jobs</a>`;
    const result = detectAtsFromHtml(html);
    expect(result).toEqual({ atsSource: "greenhouse", atsToken: "vercel" });
  });

  test("returns Lever when only Lever is present", () => {
    const html = `<a href="https://jobs.lever.co/retool">Open Roles</a>`;
    const result = detectAtsFromHtml(html);
    expect(result).toEqual({ atsSource: "lever", atsToken: "retool" });
  });

  test("returns Ashby when only Ashby is present", () => {
    const html = `<a href="https://jobs.ashbyhq.com/linear">Join Linear</a>`;
    const result = detectAtsFromHtml(html);
    expect(result).toEqual({ atsSource: "ashby", atsToken: "linear" });
  });

  test("returns Workday when only Workday is present", () => {
    const html = `<a href="https://amazon.wd1.myworkdayjobs.com/jobs">Amazon Jobs</a>`;
    const result = detectAtsFromHtml(html);
    expect(result).toEqual({ atsSource: "workday", atsToken: "amazon" });
  });

  test("returns BambooHR when only BambooHR is present", () => {
    const html = `<a href="https://postman.bamboohr.com/careers">Postman Jobs</a>`;
    const result = detectAtsFromHtml(html);
    expect(result).toEqual({ atsSource: "bamboohr", atsToken: "postman" });
  });

  test("returns iCIMS when only iCIMS is present", () => {
    const html = `<a href="https://careers-google.icims.com/jobs">Google Jobs</a>`;
    const result = detectAtsFromHtml(html);
    expect(result).toEqual({ atsSource: "icims", atsToken: "google" });
  });

  test("returns Paylocity when only Paylocity is present", () => {
    const html = `<a href="https://recruiting.paylocity.com/recruiting/jobs/All/12345/">Jobs</a>`;
    const result = detectAtsFromHtml(html);
    expect(result).toEqual({ atsSource: "paylocity", atsToken: "12345" });
  });

  test("prioritises Greenhouse over Lever on a multi-ATS page", () => {
    // Some companies embed multiple ATS iframes — Greenhouse wins
    const html = `
      <a href="https://boards.greenhouse.io/stripe">Stripe Jobs via GH</a>
      <a href="https://jobs.lever.co/stripe">Stripe Jobs via Lever</a>
    `;
    const result = detectAtsFromHtml(html);
    expect(result?.atsSource).toBe("greenhouse");
  });

  test("returns null when no ATS signature is found", () => {
    const html = `<p>We are not currently hiring.</p>`;
    expect(detectAtsFromHtml(html)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — JSON-LD Parser (valid payloads)
// ---------------------------------------------------------------------------

describe("parseJsonLdJobs (valid payloads)", () => {
  test("extracts a single JobPosting from a standard JSON-LD block", () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Software Engineer",
        "description": "<p>Build great things.</p>",
        "hiringOrganization": { "@type": "Organization", "name": "Acme Inc" },
        "jobLocation": {
          "@type": "Place",
          "address": { "addressLocality": "San Francisco", "addressRegion": "CA" }
        },
        "datePosted": "2025-01-15",
        "url": "https://acme.com/jobs/123"
      }
      </script>
    `;

    const jobs = parseJsonLdJobs(html);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Software Engineer");
    expect(jobs[0].description).toBe("Build great things."); // HTML stripped
    expect(jobs[0].location).toBe("San Francisco, CA");
    expect(jobs[0].company).toBe("Acme Inc");
    expect(jobs[0].applyUrl).toBe("https://acme.com/jobs/123");
    expect(jobs[0].postedAt).toBeInstanceOf(Date);
  });

  test("extracts multiple JobPostings from an @graph array", () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "JobPosting", "title": "Frontend Engineer", "description": "Build UIs." },
          { "@type": "JobPosting", "title": "Backend Engineer", "description": "Build APIs." },
          { "@type": "WebPage", "name": "Careers" }
        ]
      }
      </script>
    `;

    const jobs = parseJsonLdJobs(html);
    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.title)).toEqual(["Frontend Engineer", "Backend Engineer"]);
  });

  test("strips HTML tags from job description", () => {
    const html = `
      <script type="application/ld+json">
      {
        "@type": "JobPosting",
        "title": "DevOps Engineer",
        "description": "<ul><li>Deploy infrastructure</li><li>Manage Kubernetes</li></ul>"
      }
      </script>
    `;
    const jobs = parseJsonLdJobs(html);
    expect(jobs[0].description).not.toContain("<ul>");
    expect(jobs[0].description).not.toContain("<li>");
    expect(jobs[0].description).toContain("Deploy infrastructure");
  });

  test("returns empty array when page has no JSON-LD blocks", () => {
    const html = `<html><body><h1>Careers</h1></body></html>`;
    expect(parseJsonLdJobs(html)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — JSON-LD Parser (edge cases)
// ---------------------------------------------------------------------------

describe("parseJsonLdJobs (edge cases)", () => {
  test("silently skips malformed JSON in a script block", () => {
    const html = `
      <script type="application/ld+json">{ invalid json here }</script>
      <script type="application/ld+json">
      { "@type": "JobPosting", "title": "Valid Job", "description": "Fine." }
      </script>
    `;
    // Should return the valid one and skip the broken one
    const jobs = parseJsonLdJobs(html);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Valid Job");
  });

  test("skips schema entries that are not JobPosting type", () => {
    const html = `
      <script type="application/ld+json">
      [
        { "@type": "Organization", "name": "Acme" },
        { "@type": "WebSite", "url": "https://acme.com" }
      ]
      </script>
    `;
    expect(parseJsonLdJobs(html)).toHaveLength(0);
  });

  test("skips JobPosting entries that are missing a title", () => {
    const html = `
      <script type="application/ld+json">
      { "@type": "JobPosting", "description": "No title here." }
      </script>
    `;
    expect(parseJsonLdJobs(html)).toHaveLength(0);
  });

  test("handles empty script block gracefully", () => {
    const html = `<script type="application/ld+json">   </script>`;
    expect(parseJsonLdJobs(html)).toHaveLength(0);
  });

  test("does not crash when datePosted is not a valid ISO date", () => {
    const html = `
      <script type="application/ld+json">
      { "@type": "JobPosting", "title": "Ops Role", "description": "...", "datePosted": "not-a-date" }
      </script>
    `;
    const jobs = parseJsonLdJobs(html);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].postedAt).toBeUndefined();
  });
});

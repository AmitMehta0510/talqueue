/**
 * @file company-enrichment.service.test.ts
 *
 * Unit tests for the 3-stage metadata enrichment pipeline.
 * All external HTTP calls are mocked — no real network I/O.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CompanyType, CompanySize } from "@prisma/client";

// ---------------------------------------------------------------------------
// MODULE MOCK SETUP
// ---------------------------------------------------------------------------

// We need to mock the global fetch before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Also mock Winston to keep test output clean
vi.mock("winston", () => ({
  default: {
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      printf: vi.fn(),
    },
    transports: { Console: vi.fn() },
  },
}));

import { enrichCompanyMeta } from "./company-enrichment.service";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeReadableStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function mockFetchResponse(
  status: number,
  body: object | string,
  contentType = "application/json"
): Response {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  const stream = makeReadableStream(bodyStr);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": contentType }),
    json: async () => (typeof body === "object" ? body : JSON.parse(body)),
    text: async () => bodyStr,
    body: stream,
  } as unknown as Response;
}

function clearbitSuccessResponse() {
  return {
    logo: "https://logo.clearbit.com/stripe.com",
    description: "Stripe is a technology company that builds economic infrastructure for the internet.",
    tags: ["Fintech", "Payments", "SaaS"],
    category: { industry: "Financial Services" },
    metrics: { employees: 7000, employeesRange: "1001-5000" },
    type: "private",
    geo: { country: "United States" },
  };
}

function geminiSuccessResponse(fields: object) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(fields) }],
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe("enrichCompanyMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no env keys set
    delete process.env.CLEARBIT_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    delete process.env.CLEARBIT_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  // ─── STAGE 1: CLEARBIT ────────────────────────────────────────────────────

  it("returns full metadata when Clearbit API responds successfully", async () => {
    process.env.CLEARBIT_API_KEY = "test-clearbit-key";

    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(200, clearbitSuccessResponse())
    );

    const result = await enrichCompanyMeta("stripe.com");

    expect(result.logoUrl).toBe("https://logo.clearbit.com/stripe.com");
    expect(result.description).toContain("technology company");
    expect(result.tagline).toBe("Fintech");
    expect(result.industry).toBe("Financial Services");
    expect(result.totalEmployees).toBe(7000);
    expect(result.size).toBe(CompanySize.LARGE);
    expect(result.country).toBe("United States");
  });

  it("skips Clearbit entirely when CLEARBIT_API_KEY is not set", async () => {
    // No CLEARBIT_API_KEY, no GEMINI_API_KEY
    // fetchFromMetaTags will be called — mock it to return null
    mockFetch.mockResolvedValueOnce(mockFetchResponse(404, "not found", "text/html"));

    const result = await enrichCompanyMeta("example.com");

    // Should have called fetch once (meta-tags attempt) — not Clearbit
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({});
  });

  it("falls through to meta-tag scraper when Clearbit returns HTTP 422", async () => {
    process.env.CLEARBIT_API_KEY = "test-key";

    // Clearbit 422
    mockFetch.mockResolvedValueOnce(mockFetchResponse(422, { error: "Invalid domain" }));
    // Meta-tag scraper also fails
    mockFetch.mockResolvedValueOnce(mockFetchResponse(404, "not found", "text/html"));

    const result = await enrichCompanyMeta("invalid.com");
    expect(result).toEqual({});
  });

  it("falls through when Clearbit throws a network error", async () => {
    process.env.CLEARBIT_API_KEY = "test-key";

    mockFetch
      .mockRejectedValueOnce(new Error("network error")) // Clearbit
      .mockResolvedValueOnce(mockFetchResponse(404, "not found", "text/html")); // meta-tags

    const result = await enrichCompanyMeta("broken.com");
    expect(result).toEqual({});
  });

  it("maps Clearbit employeesRange to ENTERPRISE for large companies", async () => {
    process.env.CLEARBIT_API_KEY = "test-key";
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(200, {
        ...clearbitSuccessResponse(),
        metrics: { employees: 100000, employeesRange: "10001-50000" },
      })
    );
    const result = await enrichCompanyMeta("google.com");
    expect(result.size).toBe(CompanySize.ENTERPRISE);
  });

  it("maps Clearbit employeesRange to SMALL for small companies", async () => {
    process.env.CLEARBIT_API_KEY = "test-key";
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(200, {
        ...clearbitSuccessResponse(),
        metrics: { employees: 20, employeesRange: "11-50" },
      })
    );
    const result = await enrichCompanyMeta("startup.com");
    expect(result.size).toBe(CompanySize.SMALL);
  });

  // ─── STAGE 2: META-TAG SCRAPER ────────────────────────────────────────────

  it("extracts description and tagline from og:description and og:title meta tags", async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Stripe | Financial Infrastructure for the Internet" />
          <meta property="og:description" content="Millions of companies use Stripe to accept payments." />
        </head>
        <body></body>
      </html>
    `;

    // Clearbit skipped (no key), meta-tags succeeds
    mockFetch.mockResolvedValueOnce(mockFetchResponse(200, html, "text/html"));

    const result = await enrichCompanyMeta("stripe.com");

    expect(result.tagline).toContain("Stripe");
    expect(result.description).toContain("Stripe");
  });

  it("extracts description from name=description meta tag as fallback", async () => {
    const html = `
      <html>
        <head>
          <meta name="description" content="Acme Corp builds widgets." />
        </head>
        <body></body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce(mockFetchResponse(200, html, "text/html"));

    const result = await enrichCompanyMeta("acme.com");
    expect(result.description).toContain("Acme Corp");
  });

  it("returns empty object when meta-tag scraper returns 404 and no other keys set", async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse(404, "", "text/html"));
    const result = await enrichCompanyMeta("not-a-site.com");
    expect(result).toEqual({});
  });

  it("does not throw when meta-tag scraper encounters a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(enrichCompanyMeta("offline.com")).resolves.toEqual({});
  });

  // ─── STAGE 3: GEMINI ─────────────────────────────────────────────────────

  it("calls Gemini when GEMINI_API_KEY is set and description is still missing", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";

    // Meta-tag scraper: HTML with no useful tags
    mockFetch.mockResolvedValueOnce(mockFetchResponse(200, "<html><body></body></html>", "text/html"));

    // Gemini success
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(200, geminiSuccessResponse({
        tagline: "Build for the internet",
        description: "A great SaaS company.",
        companyType: "STARTUP",
        companySize: "SMALL",
        industry: "SaaS",
        country: "India",
      }))
    );

    const result = await enrichCompanyMeta("saas.com");

    expect(result.tagline).toBe("Build for the internet");
    expect(result.description).toBe("A great SaaS company.");
    expect(result.type).toBe(CompanyType.STARTUP);
    expect(result.size).toBe(CompanySize.SMALL);
    expect(result.industry).toBe("SaaS");
    expect(result.country).toBe("India");
  });

  it("returns partial data when Gemini returns a malformed JSON response", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";

    mockFetch.mockResolvedValueOnce(mockFetchResponse(200, "<html><body></body></html>", "text/html"));
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(200, {
        candidates: [{ content: { parts: [{ text: "INVALID JSON {{{" }] } }],
      })
    );

    const result = await enrichCompanyMeta("broken-gemini.com");
    // Should not throw; Gemini stage silently returns null on JSON parse error
    expect(result).toEqual({});
  });

  it("skips Gemini entirely when GEMINI_API_KEY is not set", async () => {
    // No GEMINI_API_KEY; meta-tags returns nothing useful
    mockFetch.mockResolvedValueOnce(mockFetchResponse(200, "<html><body></body></html>", "text/html"));

    const result = await enrichCompanyMeta("no-gemini.com");
    // Only 1 fetch call made (meta-tags) — no Gemini call
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({});
  });

  it("returns empty object when Gemini returns a non-OK response", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce(mockFetchResponse(200, "<html><body></body></html>", "text/html"));
    mockFetch.mockResolvedValueOnce(mockFetchResponse(429, { error: "rate limited" }));

    const result = await enrichCompanyMeta("rate-limited.com");
    expect(result).toEqual({});
  });

  // ─── FULL PIPELINE FAILURE ────────────────────────────────────────────────

  it("returns empty object without throwing when all three stages fail", async () => {
    process.env.CLEARBIT_API_KEY = "test-key";
    process.env.GEMINI_API_KEY = "test-key";

    mockFetch
      .mockRejectedValueOnce(new Error("Clearbit down"))  // Clearbit
      .mockRejectedValueOnce(new Error("Site down"))       // Meta-tags
      .mockRejectedValueOnce(new Error("Gemini down"));    // Gemini

    await expect(enrichCompanyMeta("totally-broken.com")).resolves.toEqual({});
  });

  it("never overwrites a field already set by an earlier stage", async () => {
    process.env.CLEARBIT_API_KEY = "test-key";
    process.env.GEMINI_API_KEY = "test-key";

    // Clearbit provides description
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(200, {
        description: "Official Clearbit description.",
        logo: "https://logo.clearbit.com/test.com",
        tags: [],
        category: { industry: "SaaS" },
        metrics: {},
        type: "private",
      })
    );

    // Since description is now filled, meta-tags + Gemini are NOT called for description
    // (Gemini is only called when description or tagline are still empty)
    const result = await enrichCompanyMeta("test.com");

    // Clearbit description should be preserved
    expect(result.description).toBe("Official Clearbit description.");
  });
});

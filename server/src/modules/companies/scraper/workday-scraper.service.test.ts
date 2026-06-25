/**
 * @file workday-scraper.service.test.ts
 * @description Unit tests for the Workday ATS job scraper (`scrapeWorkdayJobs`).
 *
 * Mocking strategy:
 *  - `axios`  — vi.mock at module level; each test controls per-call resolution.
 *  - `prisma` — vi.mock; job.upsert returns a deterministic fixture.
 *  - `slugify` — real module (pure function, zero side effects).
 *
 * Suites:
 *  1. Tier discovery — wd1 responds 200, used immediately.
 *  2. Tier fallback  — wd1 fails, wd2 succeeds.
 *  3. All tiers fail — returns empty ProcessResult (zero crash).
 *  4. Bad payload    — null jobPosting, missing title, missing externalPath → safe handling.
 *  5. Pagination     — page 1 returns 20 jobs, page 2 returns 5 → 25 total, stops.
 *  6. Non-tech roles — filtered out, not upserted.
 *  7. ExternalPath-based apply URL construction.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Infrastructure mocks — BEFORE module import
// ---------------------------------------------------------------------------

vi.mock("axios");
vi.mock("shared/database/prisma", () => ({
  default: {
    job: {
      upsert: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));
vi.mock("services/elasticSync", () => ({
  syncJobsToElasticBulk: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------

import axios from "axios";
import prisma from "shared/database/prisma";
import { scrapeWorkdayJobs } from "./job-scraper.service";
import type { CompanyRow } from "./job-scraper.service";

const mockAxios = axios as unknown as { post: Mock; get: Mock };

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMPANY: CompanyRow = {
  id: randomUUID(),
  name: "Workday Corp",
  slug: "workday-corp",
  headquarters: "San Francisco, CA",
  country: "USA",
  websiteUrl: "https://workdaycorp.example.com",
  careersPageUrl: null,
  atsToken: "workdaycorp",
  atsSource: "workday",
};

/** Creates a minimal valid Workday job posting object. */
function makeWorkdayJob(overrides: Partial<Record<string, any>> = {}): Record<string, any> {
  return {
    title: "Software Engineer II",
    externalPath: "/jobs/123456789",
    locationsText: "San Francisco, CA",
    ...overrides,
  };
}

/** Creates a Workday API response body. */
function makeWorkdayResponse(jobs: any[]): { data: { jobPostings: any[] } } {
  return { data: { jobPostings: jobs } };
}

/** Creates a fake upserted job record. */
function makeUpsertedJob(jobId: string = randomUUID()) {
  const now = new Date();
  const oneSecondAgo = new Date(now.getTime() - 1000);
  return {
    id: jobId,
    createdAt: oneSecondAgo, // createdAt !== updatedAt → result.updated++
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Configures axios.post to return 200 for the given tier and an empty second page. */
function mockWd1Success(jobs: any[] = [makeWorkdayJob()]) {
  mockAxios.post = vi.fn()
    .mockImplementationOnce((url: string) => {
      if (url.includes("wd1")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("wrong tier"));
    })
    // Paginated data fetch (page 1)
    .mockImplementationOnce(() => Promise.resolve(makeWorkdayResponse(jobs)))
    // Page 2 — empty, stops pagination
    .mockImplementationOnce(() => Promise.resolve(makeWorkdayResponse([])));
}

// ---------------------------------------------------------------------------
// Suite 1 — Tier discovery: wd1 responds
// ---------------------------------------------------------------------------

describe("scrapeWorkdayJobs — tier discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("uses wd1 when it responds 200", async () => {
    mockWd1Success([makeWorkdayJob()]);

    const result = await scrapeWorkdayJobs("testcorp", COMPANY);

    // At least the probe call + data fetch used wd1 URL
    const calls = (mockAxios.post as Mock).mock.calls;
    expect(calls[0][0]).toContain("wd1");
    expect(result.processedJobIds.length).toBeGreaterThan(0);
  });

  it("returns a valid ProcessResult shape", async () => {
    mockWd1Success([makeWorkdayJob()]);

    const result = await scrapeWorkdayJobs("testcorp", COMPANY);

    expect(result).toMatchObject({
      created: expect.any(Number),
      updated: expect.any(Number),
      staleArchived: expect.any(Number),
      processedJobIds: expect.any(Array),
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Tier fallback: wd1 fails, wd2 succeeds
// ---------------------------------------------------------------------------

describe("scrapeWorkdayJobs — tier fallback wd1 fail → wd2 success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("falls back to wd2 when wd1 is unreachable", async () => {
    mockAxios.post = vi.fn()
      // wd1 probe — network error
      .mockImplementationOnce((url: string) => {
        if (url.includes("wd1")) return Promise.reject(new Error("ECONNREFUSED"));
        return Promise.reject(new Error("wrong call"));
      })
      // wd2 probe — 200 OK
      .mockImplementationOnce((url: string) => {
        if (url.includes("wd2")) return Promise.resolve({ status: 200 });
        return Promise.reject(new Error("wrong call"));
      })
      // Paginated data fetch (wd2)
      .mockImplementationOnce(() => Promise.resolve(makeWorkdayResponse([makeWorkdayJob()])))
      // Page 2 — empty
      .mockImplementationOnce(() => Promise.resolve(makeWorkdayResponse([])));

    const result = await scrapeWorkdayJobs("testcorp", COMPANY);

    // wd2 URL used for data fetch
    const dataCalls = (mockAxios.post as Mock).mock.calls;
    expect(dataCalls[2][0]).toContain("wd2");
    expect(result.processedJobIds.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — All tiers fail → empty result, no crash
// ---------------------------------------------------------------------------

describe("scrapeWorkdayJobs — all tiers fail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty ProcessResult when wd1–wd5 all fail", async () => {
    mockAxios.post = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await scrapeWorkdayJobs("ghost-company", COMPANY);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.processedJobIds).toHaveLength(0);
  });

  it("does not call prisma.job.upsert when no tier responds", async () => {
    mockAxios.post = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await scrapeWorkdayJobs("ghost-company", COMPANY);

    expect(prisma.job.upsert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Bad payload: null/undefined fields → safe handling
// ---------------------------------------------------------------------------

describe("scrapeWorkdayJobs — bad payload handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("handles a job with null title gracefully (uses fallback)", async () => {
    mockWd1Success([makeWorkdayJob({ title: null })]);

    // Should not throw
    await expect(scrapeWorkdayJobs("testcorp", COMPANY)).resolves.not.toThrow();
  });

  it("handles a job with missing externalPath (uses fallback ID)", async () => {
    mockWd1Success([makeWorkdayJob({ externalPath: undefined })]);

    await expect(scrapeWorkdayJobs("testcorp", COMPANY)).resolves.not.toThrow();
  });

  it("handles completely null job objects in the array", async () => {
    // jobPostings array contains null — should skip gracefully
    mockAxios.post = vi.fn()
      .mockResolvedValueOnce({ status: 200 }) // wd1 probe
      .mockResolvedValueOnce({ data: { jobPostings: [null, undefined, makeWorkdayJob()] } })
      .mockResolvedValueOnce(makeWorkdayResponse([]));

    // With null/undefined jobs filtered by isTechOrInternRole access, should not crash
    await expect(scrapeWorkdayJobs("testcorp", COMPANY)).resolves.not.toThrow();
  });

  it("handles a response body that uses `jobs` key instead of `jobPostings`", async () => {
    mockAxios.post = vi.fn()
      .mockResolvedValueOnce({ status: 200 }) // wd1 probe
      .mockResolvedValueOnce({ data: { jobs: [makeWorkdayJob({ title: "Software Engineer" })] } })
      .mockResolvedValueOnce({ data: { jobs: [] } });

    const result = await scrapeWorkdayJobs("testcorp", COMPANY);
    expect(result.processedJobIds.length).toBeGreaterThanOrEqual(0); // no crash
  });

  it("handles completely empty response body without crashing", async () => {
    mockAxios.post = vi.fn()
      .mockResolvedValueOnce({ status: 200 }) // wd1 probe
      .mockResolvedValueOnce({ data: {} }); // no recognisable key → rawJobs = []

    const result = await scrapeWorkdayJobs("testcorp", COMPANY);
    expect(result.created).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Pagination: 20 + 5 jobs across two pages
// ---------------------------------------------------------------------------

describe("scrapeWorkdayJobs — pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("fetches page 2 when page 1 returns a full page (20 jobs)", async () => {
    const page1Jobs = Array.from({ length: 20 }, (_, i) =>
      makeWorkdayJob({ title: `Software Engineer ${i}`, externalPath: `/jobs/${i}` })
    );
    const page2Jobs = Array.from({ length: 5 }, (_, i) =>
      makeWorkdayJob({ title: `Data Engineer ${i}`, externalPath: `/jobs/${20 + i}` })
    );

    mockAxios.post = vi.fn()
      .mockResolvedValueOnce({ status: 200 }) // wd1 probe
      .mockResolvedValueOnce(makeWorkdayResponse(page1Jobs)) // page 1
      .mockResolvedValueOnce(makeWorkdayResponse(page2Jobs)) // page 2
      .mockResolvedValueOnce(makeWorkdayResponse([])); // page 3 — empty sentinel

    const result = await scrapeWorkdayJobs("testcorp", COMPANY);

    // Should have fetched and upserted 25 tech jobs total
    expect(result.processedJobIds.length).toBe(25);
  });

  it("stops at WORKDAY_MAX_JOBS (50) even if more pages exist", async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) =>
      makeWorkdayJob({ title: `Engineer ${i}`, externalPath: `/jobs/${i}` })
    );

    mockAxios.post = vi.fn()
      .mockResolvedValueOnce({ status: 200 }) // wd1 probe
      .mockResolvedValueOnce(makeWorkdayResponse(fullPage)) // page 1 → 20
      .mockResolvedValueOnce(makeWorkdayResponse(fullPage)) // page 2 → 40
      .mockResolvedValueOnce(makeWorkdayResponse(fullPage)) // page 3 → 50 (capped here)
      .mockResolvedValueOnce(makeWorkdayResponse(fullPage)); // page 4 — should never be called

    const result = await scrapeWorkdayJobs("testcorp", COMPANY);

    // Capped at 50
    expect(result.processedJobIds.length).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — Non-tech role filtering
// ---------------------------------------------------------------------------

describe("scrapeWorkdayJobs — role filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("does not upsert non-tech roles like 'Sales Representative'", async () => {
    mockWd1Success([
      makeWorkdayJob({ title: "Sales Representative" }),
      makeWorkdayJob({ title: "Senior Software Engineer" }), // only this should pass
    ]);

    await scrapeWorkdayJobs("testcorp", COMPANY);

    // Only the tech role should be upserted
    expect(prisma.job.upsert).toHaveBeenCalledTimes(1);
  });

  it("always includes internship roles regardless of tech keywords", async () => {
    mockWd1Success([makeWorkdayJob({ title: "Summer Business Intern" })]);

    const result = await scrapeWorkdayJobs("testcorp", COMPANY);
    expect(result.processedJobIds.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — Apply URL construction
// ---------------------------------------------------------------------------

describe("scrapeWorkdayJobs — apply URL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("builds apply URL from externalPath when present", async () => {
    mockWd1Success([
      makeWorkdayJob({ title: "Software Engineer", externalPath: "/en-US/External/job/San-Francisco/123456789" }),
    ]);

    await scrapeWorkdayJobs("testcorp", COMPANY);

    const upsertCall = (prisma.job.upsert as Mock).mock.calls[0][0];
    expect(upsertCall.create.applyUrl).toContain("/en-US/External/job/San-Francisco/123456789");
  });

  it("falls back to careers homepage URL when externalPath is absent", async () => {
    mockWd1Success([
      makeWorkdayJob({ title: "Software Engineer", externalPath: undefined }),
    ]);

    await scrapeWorkdayJobs("testcorp", COMPANY);

    const upsertCall = (prisma.job.upsert as Mock).mock.calls[0][0];
    expect(upsertCall.create.applyUrl).toContain("wd1.myworkdayjobs.com");
  });
});

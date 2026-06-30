/**
 * @file ats-scrapers.service.test.ts
 * @description Unit tests for BambooHR, iCIMS, and Paylocity job board scrapers.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Infrastructure Mocks
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
// Subject Under Test
// ---------------------------------------------------------------------------

import axios from "axios";
import prisma from "shared/database/prisma";
import { scrapeBambooHRJobs, scrapeIcimsJobs, scrapePaylocityJobs } from "./job-scraper.service";
import type { CompanyRow } from "./job-scraper.service";

const mockAxios = axios as unknown as { post: Mock; get: Mock };

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMPANY: CompanyRow = {
  id: randomUUID(),
  name: "Test Corp",
  slug: "test-corp",
  headquarters: "New York, NY",
  country: "USA",
  websiteUrl: "https://testcorp.example.com",
  careersPageUrl: null,
};

function makeUpsertedJob(jobId: string = randomUUID()) {
  const now = new Date();
  const oneSecondAgo = new Date(now.getTime() - 1000);
  return {
    id: jobId,
    createdAt: oneSecondAgo,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("scrapeBambooHRJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("successfully scrapes tech jobs from BambooHR JSON endpoint", async () => {
    mockAxios.get = vi.fn().mockResolvedValue({
      data: {
        result: [
          {
            id: "101",
            jobOpeningName: "Software Engineer",
            location: { city: "New York", state: "NY" },
          },
          {
            id: "102",
            jobOpeningName: "Sales Lead", // should be filtered out (non-tech)
            location: { city: "Dallas", state: "TX" },
          },
          {
            id: "103",
            jobOpeningName: "Summer Systems Engineering Intern", // should be included
            location: "Remote",
          },
        ],
      },
    });

    const result = await scrapeBambooHRJobs("testcorp", COMPANY);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(2); // 2 tech jobs processed
    expect(result.processedJobSlugs).toContain("test-corp-software-engineer-101");
    expect(result.processedJobSlugs).toContain("test-corp-summer-systems-engineering-intern-103");
    expect(prisma.job.upsert).toHaveBeenCalledTimes(2);
  });

  it("handles missing location structure gracefully", async () => {
    mockAxios.get = vi.fn().mockResolvedValue({
      data: {
        result: [
          {
            id: "201",
            jobOpeningName: "Frontend Developer",
            location: null,
          },
        ],
      },
    });

    const result = await scrapeBambooHRJobs("testcorp", COMPANY);

    expect(result.processedJobIds).toHaveLength(1);
    expect(prisma.job.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          location: "Not specified",
        }),
      })
    );
  });
});

describe("scrapeIcimsJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("successfully parses iCIMS XML sitemap and handles regex title decoding", async () => {
    const fakeSitemapXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>https://careers-testcorp.icims.com/jobs/9620/senior-backend-engineer/job</loc>
          <lastmod>2026-06-25T12:00:00Z</lastmod>
        </url>
        <url>
          <loc>https://careers-testcorp.icims.com/jobs/9621/human-resources-coordinator/job</loc> <!-- non-tech -->
          <lastmod>2026-06-24T12:00:00Z</lastmod>
        </url>
        <url>
          <loc>https://careers-testcorp.icims.com/jobs/intro</loc> <!-- intro page should be ignored -->
        </url>
      </urlset>
    `;

    mockAxios.get = vi.fn().mockResolvedValue({ data: fakeSitemapXml });

    const result = await scrapeIcimsJobs("testcorp", COMPANY);

    expect(result.processedJobSlugs).toContain("test-corp-senior-backend-engineer-9620");
    expect(result.processedJobSlugs).not.toContain("test-corp-human-resources-coordinator-9621");
    expect(prisma.job.upsert).toHaveBeenCalledTimes(1);
  });

  it("gracefully exits if the sitemap XML response is invalid", async () => {
    mockAxios.get = vi.fn().mockResolvedValue({ data: null });

    const result = await scrapeIcimsJobs("testcorp", COMPANY);
    expect(result.processedJobIds).toHaveLength(0);
  });
});

describe("scrapePaylocityJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.upsert as Mock).mockResolvedValue(makeUpsertedJob());
  });

  it("successfully parses Paylocity page script HTML data", async () => {
    const fakeHtml = `
      <html>
        <head><title>Careers</title></head>
        <body>
          <script>
            window.pageData = {
              "Jobs": [
                {
                  "JobId": "301",
                  "JobTitle": "Lead DevOps Engineer",
                  "JobLocation": { "City": "Chicago", "State": "IL" },
                  "IsRemote": true,
                  "PublishedDate": "2026-06-29T10:00:00Z"
                },
                {
                  "JobId": "302",
                  "JobTitle": "Sales Rep",
                  "JobLocation": { "City": "Boston", "State": "MA" },
                  "IsRemote": false
                }
              ]
            };
          </script>
        </body>
      </html>
    `;

    mockAxios.get = vi.fn().mockResolvedValue({ data: fakeHtml });

    const result = await scrapePaylocityJobs("testcorp-guid", COMPANY);

    expect(result.processedJobSlugs).toContain("test-corp-lead-devops-engineer-301");
    expect(result.processedJobSlugs).not.toContain("test-corp-sales-rep-302");
    expect(prisma.job.upsert).toHaveBeenCalledTimes(1);
    
    expect(prisma.job.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          workMode: "REMOTE",
          location: "Chicago, IL",
        }),
      })
    );
  });

  it("handles HTML decoded entities correctly for Paylocity jobs", async () => {
    const fakeHtml = `
      <html>
        <body>
          <script>
            window.pageData = {
              "Jobs": [
                {
                  "JobId": "401",
                  "JobTitle": "Backend Developer - R&amp;D Team",
                  "JobLocation": { "City": "Austin&#39;s Hub", "State": "TX" },
                  "LocationName": "Austin&#39;s Main Office",
                  "IsRemote": false
                }
              ]
            };
          </script>
        </body>
      </html>
    `;

    mockAxios.get = vi.fn().mockResolvedValue({ data: fakeHtml });

    const result = await scrapePaylocityJobs("testcorp-guid", COMPANY);

    expect(result.processedJobIds).toHaveLength(1);
    expect(prisma.job.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          title: "Backend Developer - R&D Team",
          location: "Austin's Hub, TX",
        }),
      })
    );
  });
});

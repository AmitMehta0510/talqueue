import { describe, test, expect, vi, beforeEach } from "vitest";
import prisma from "shared/database/prisma";
import elasticClient from "services/elasticClient";
import { globalSearch } from "./search.service";

vi.mock("shared/database/prisma", () => {
  return {
    default: {
      user: {
        findMany: vi.fn(),
      },
      project: {
        findMany: vi.fn(),
      },
      hackathon: {
        findMany: vi.fn(),
      },
      job: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      company: {
        findMany: vi.fn(),
      },
      community: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("services/elasticClient", () => {
  return {
    default: {
      search: vi.fn(),
    },
  };
});

describe("Search Service - globalSearch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("Backward compatibility: fetches 6 items per entity and includes topResults when omniMode is false", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", trustLevel: "VERIFIED", engineeringScore: 10, profile: { collegeId: "c1" }, skills: [] },
    ] as any);
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { id: "p1", title: "Project 1", verified: true, featured: false, members: [] },
    ] as any);
    vi.mocked(elasticClient.search).mockRejectedValue(new Error("ES down - fallback to prisma"));
    vi.mocked(prisma.hackathon.findMany).mockResolvedValue([
      { id: "h1", title: "Hackathon 1", verified: true, featured: true },
    ] as any);
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      { id: "j1", title: "Job 1", featured: true, company: { id: "co1", name: "Company 1" } },
    ] as any);
    vi.mocked(prisma.job.count).mockResolvedValue(1);
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: "co1", name: "Company 1", verified: true },
    ] as any);
    vi.mocked(prisma.community.findMany).mockResolvedValue([
      { id: "comm1", name: "Community 1", trendingScore: 5 },
    ] as any);

    const result = await globalSearch("test", false);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 6 })
    );
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 6 })
    );
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 6 })
    );
    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 6 })
    );
    expect(prisma.community.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 6 })
    );

    expect(result).toHaveProperty("topResults");
    expect(result.topResults?.length).toBeGreaterThan(0);
    expect(result.jobsTotal).toBe(1);
  });

  test("Omni mode: fetches 3 items per entity and does not include topResults when omniMode is true", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as any);
    vi.mocked(elasticClient.search).mockRejectedValue(new Error("ES down - fallback to prisma"));
    vi.mocked(prisma.hackathon.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.job.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.job.count).mockResolvedValue(0);
    vi.mocked(prisma.company.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.community.findMany).mockResolvedValue([] as any);

    const result = await globalSearch("test", true);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
    expect(prisma.community.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );

    expect(result.topResults).toBeUndefined();
    expect((result as any).jobsTotal).toBeUndefined();
  });
});

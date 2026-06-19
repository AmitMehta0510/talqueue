import { describe, test, expect, vi, afterEach } from "vitest";
import prisma from "shared/database/prisma";
import * as leaderboardService from "../analytics/leaderboard.service";
import {
  getJobPipeline,
  getRecruiterDashboard,
} from "./recruiter-dashboard.service";

afterEach(() => vi.restoreAllMocks());

describe("Recruiter Dashboard Service", () => {
  test("should compile and construct correct applicant pipeline with verification metrics", async () => {
    vi.spyOn(prisma.job, "findFirst").mockResolvedValueOnce({
      id: "job-1",
      title: "React Developer",
      skillsRequired: ["react", "typescript"],
    } as any);

    vi.spyOn(prisma.jobApplication, "findMany").mockResolvedValueOnce([
      {
        id: "app-1",
        status: "SHORTLISTED",
        createdAt: new Date(),
        resumeUrl: "https://resume.pdf",
        coverLetter: "Cover Letter",
        recruiterNotes: "Notes",
        applicantId: "user-1",
        applicant: {
          id: "user-1",
          username: "johndoe",
          trustLevel: "VERIFIED",
          engineeringScore: 85,
          reputationScore: 120,
          verifiedEngineer: true,
          profile: {
            fullName: "John Doe",
            avatarUrl: "https://avatar.png",
            headline: "SDE 2",
          },
          skills: [
            { skill: { name: "React" } },
            { skill: { name: "TypeScript" } },
          ],
          badges: [
            {
              badge: {
                name: "React Master",
                rarity: "RARE",
                category: "PROJECT",
              },
            },
          ],
        },
      },
    ] as any);

    vi.spyOn(prisma.experience, "findMany").mockResolvedValueOnce([
      {
        userId: "user-1",
        verified: true,
        suspicious: false,
        verificationScore: 90,
      },
    ] as any);

    const result = await getJobPipeline("recruiter-1", "job-1");

    expect(result.pipeline.APPLIED).toBeDefined();
    expect(result.pipeline.VIEWED).toBeDefined();
    expect(result.pipeline.SHORTLISTED).toBeDefined();
    expect(result.pipeline.INTERVIEW).toBeDefined();
    expect(result.pipeline.HIRED).toBeDefined();
    expect(result.pipeline.REJECTED).toBeDefined();

    expect(result.job.title).toBe("React Developer");

    const shortlisted = result.pipeline.SHORTLISTED;
    expect(shortlisted).toHaveLength(1);
    const card = shortlisted[0];

    expect(card.id).toBe("app-1");
    expect(card.candidate.fullName).toBe("John Doe");
    expect(card.skillsMatch.matchPercentage).toBe(100);
    expect(card.verificationMetrics.verifiedExperiences).toBe(1);
    expect(card.verificationMetrics.suspiciousExperiences).toBe(0);
    expect(card.verificationMetrics.averageVerificationScore).toBe(90);
    expect(card.badges[0].name).toBe("React Master");
  });

  test("should aggregate analytics via groupBy and return correct dashboard shape", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: "recruiter-1",
      username: "recruiter_user",
      profile: { fullName: "Recruiter One" },
    } as any);

    vi.spyOn(prisma.job, "findMany").mockResolvedValueOnce([
      { id: "job-1", title: "Backend Engineer", skillsRequired: ["node", "postgres"], createdAt: new Date() },
      { id: "job-2", title: "Frontend Engineer", skillsRequired: ["react", "css"], createdAt: new Date() },
    ] as any);

    // First groupBy call: status-level totals
    vi.spyOn(prisma.jobApplication, "groupBy")
      .mockResolvedValueOnce([
        { status: "APPLIED", _count: { status: 5 } },
        { status: "SHORTLISTED", _count: { status: 2 } },
        { status: "INTERVIEW", _count: { status: 1 } },
        { status: "HIRED", _count: { status: 1 } },
      ] as any)
      // Second groupBy call: per-job counts
      .mockResolvedValueOnce([
        { jobId: "job-1", status: "APPLIED", _count: { status: 3 } },
        { jobId: "job-1", status: "SHORTLISTED", _count: { status: 1 } },
        { jobId: "job-1", status: "HIRED", _count: { status: 1 } },
        { jobId: "job-2", status: "APPLIED", _count: { status: 2 } },
        { jobId: "job-2", status: "SHORTLISTED", _count: { status: 1 } },
      ] as any);

    // rankJobCandidates internally calls prisma.job.findUnique — return jobs with empty applications
    vi.spyOn(prisma.job, "findUnique")
      .mockResolvedValue({ id: "job-1", postedById: "recruiter-1", applications: [] } as any);

    vi.spyOn(leaderboardService, "getFastestGrowingEngineers").mockResolvedValueOnce([] as any);

    const result = await getRecruiterDashboard("recruiter-1");

    expect(result.recruiter.username).toBe("recruiter_user");
    expect(result.analytics.totalJobs).toBe(2);
    expect(result.analytics.totalApplications).toBe(9);
    expect(result.analytics.totalShortlisted).toBe(2);
    expect(result.analytics.totalInterviews).toBe(1);
    expect(result.analytics.totalHired).toBe(1);

    const job1 = result.jobs.find((j) => j.id === "job-1");
    expect(job1?.applicationsCount).toBe(5);
    expect(job1?.shortlistedCount).toBe(1);
    expect(job1?.hiredCount).toBe(1);

    const job2 = result.jobs.find((j) => j.id === "job-2");
    expect(job2?.applicationsCount).toBe(3);
    expect(job2?.shortlistedCount).toBe(1);
    expect(job2?.hiredCount).toBe(0);

    expect(result.topCandidates).toBeDefined();
    expect(result.fastestGrowingEngineers).toBeDefined();
  });
});

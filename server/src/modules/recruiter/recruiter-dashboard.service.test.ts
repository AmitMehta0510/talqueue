import { describe, test, expect } from "vitest";
import prisma from "shared/database/prisma";
import { getJobPipeline } from "./recruiter-dashboard.service";

describe("Recruiter Dashboard Service", () => {
  test("should compile and construct correct applicant pipeline with verification metrics", async () => {
    (prisma.job.findFirst as any) = async (args: any) => {
      return {
        id: "job-1",
        title: "React Developer",
        skillsRequired: ["react", "typescript"],
      };
    };

    (prisma.jobApplication.findMany as any) = async (args: any) => {
      return [
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
      ];
    };

    (prisma.experience.findMany as any) = async (args: any) => {
      return [
        {
          userId: "user-1",
          verified: true,
          suspicious: false,
          verificationScore: 90,
        },
      ];
    };

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
});


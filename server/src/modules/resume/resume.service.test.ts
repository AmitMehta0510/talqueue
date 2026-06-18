import { describe, test, expect, vi, beforeEach } from "vitest";
import prisma from "shared/database/prisma";
import { getResumeHtml, buildResumePdf } from "controllers/resumeController";

vi.mock("puppeteer", () => {
  const mockPage = {
    setContent: vi.fn().mockResolvedValue(null),
    pdf: vi.fn().mockResolvedValue(Buffer.from("mock_pdf_buffer")),
  };
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(null),
  };
  const mockLaunch = vi.fn().mockResolvedValue(mockBrowser);
  return {
    default: {
      launch: mockLaunch,
    },
    launch: mockLaunch,
  };
});

describe("Resume HTML Generator Template", () => {
  test("should dynamically compile resume data into HTML template", () => {
    const mockData = {
      user: { email: "alice@example.com", username: "alice" },
      profile: {
        fullName: "Alice Dev",
        headline: "Backend Engineer",
        bio: "Passionate developer",
        location: "San Francisco",
        githubUrl: "https://github.com/alice",
      },
      experiences: [
        {
          title: "SDE 1",
          companyName: "Google",
          startDate: new Date("2024-01-01"),
          endDate: null,
          isCurrent: true,
          description: "Worked on Search.",
          techStack: ["Go", "Kubernetes"],
        },
      ],
      educations: [
        {
          degree: "B.Tech",
          fieldOfStudy: "Computer Science",
          startYear: 2020,
          endYear: 2024,
          current: false,
          college: { name: "Stanford" },
          cgpa: 9.8,
        },
      ],
      verifiedSkills: [
        {
          skill: { name: "TypeScript" },
        },
      ],
      projects: [
        {
          title: "Awesome App",
          description: "A cool app",
          githubUrl: "https://github.com/alice/app",
          techStack: ["React", "Express"],
        },
      ],
    };

    const html = getResumeHtml(mockData);

    expect(html).toContain("Alice Dev");
    expect(html).toContain("Backend Engineer");
    expect(html).toContain("alice@example.com");
    expect(html).toContain("Google");
    expect(html).toContain("SDE 1");
    expect(html).toContain("Stanford");
    expect(html).toContain("B.Tech");
    expect(html).toContain("TypeScript");
    expect(html).toContain("Awesome App");
  });
});

describe("buildResumePdf Service Function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should fetch user details, generate PDF, and return buffer and username", async () => {
    // Mock database output
    (prisma.user.findUnique as any) = async (args: any) => {
      expect(args.where.id).toBe("user-123");
      return {
        id: "user-123",
        username: "alice",
        email: "alice@example.com",
        profile: {
          fullName: "Alice Dev",
          headline: "Backend Engineer",
        },
        skills: [{ skill: { name: "TypeScript" } }],
        experiences: [],
        educations: [],
        ownedProjects: [],
      };
    };

    const result = await buildResumePdf("user-123");

    expect(result.username).toBe("alice");
    expect(result.buffer.toString()).toBe("mock_pdf_buffer");
  });
});

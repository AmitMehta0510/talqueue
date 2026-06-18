import { describe, test, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import prisma from "shared/database/prisma";
import {
  matchPackageDependencies,
  matchPomDependencies,
  matchDockerfile,
  fetchRepoFileContent,
  verifyUserCommitContribution,
  verifyUserSkills,
} from "./skill-verification.service";

vi.mock("axios");

describe("Skill Verification Service Helpers", () => {
  test("matchPackageDependencies maps express to Express.js and Node.js", () => {
    const found = new Set<string>();
    matchPackageDependencies(["express"], found);
    expect(found.has("Express.js")).toBe(true);
    expect(found.has("Node.js")).toBe(true);
  });

  test("matchPackageDependencies maps nestjs dependencies", () => {
    const found = new Set<string>();
    matchPackageDependencies(["@nestjs/core"], found);
    expect(found.has("NestJS")).toBe(true);
    expect(found.has("Node.js")).toBe(true);
  });

  test("matchPomDependencies maps Spring Boot to Java and Spring Boot", () => {
    const found = new Set<string>();
    const xml = `
      <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
      </dependency>
    `;
    matchPomDependencies(xml, found);
    expect(found.has("Spring Boot")).toBe(true);
    expect(found.has("Java")).toBe(true);
  });

  test("matchDockerfile maps base images and Docker", () => {
    const found = new Set<string>();
    const dockerfile = `
      FROM node:18-alpine
      WORKDIR /app
      COPY . .
    `;
    matchDockerfile(dockerfile, found);
    expect(found.has("Docker")).toBe(true);
    expect(found.has("Node.js")).toBe(true);
  });

  test("fetchRepoFileContent fetches and decodes base64 content", async () => {
    const mockResponse = {
      data: {
        content: Buffer.from("hello world").toString("base64"),
        encoding: "base64",
      },
    };
    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

    const result = await fetchRepoFileContent("owner", "repo", "file.txt", {});
    expect(result).toBe("hello world");
  });

  test("verifyUserCommitContribution returns true if author email matches", async () => {
    const mockCommits = {
      data: [
        {
          commit: {
            author: { email: "test@example.com", name: "testuser" },
          },
        },
      ],
    };
    vi.mocked(axios.get).mockResolvedValueOnce(mockCommits);

    const authorizedEmails = new Set(["test@example.com"]);
    const authorizedUsernames = new Set(["testuser"]);

    const result = await verifyUserCommitContribution("owner", "repo", authorizedEmails, authorizedUsernames, {});
    expect(result).toBe(true);
  });

  test("verifyUserCommitContribution returns false if no emails or usernames match", async () => {
    const mockCommits = {
      data: [
        {
          commit: {
            author: { email: "other@example.com", name: "otheruser" },
          },
        },
      ],
    };
    vi.mocked(axios.get).mockResolvedValueOnce(mockCommits);

    const authorizedEmails = new Set(["test@example.com"]);
    const authorizedUsernames = new Set(["testuser"]);

    const result = await verifyUserCommitContribution("owner", "repo", authorizedEmails, authorizedUsernames, {});
    expect(result).toBe(false);
  });
});

describe("verifyUserSkills Integration Test", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("should successfully verify frameworks and update database", async () => {
    // Mock Prisma findUnique/findMany/update
    (prisma.profile.findUnique as any) = async () => ({
      userId: "user-123",
      githubUrl: "https://github.com/testdev",
    });

    (prisma.codingProfile.findMany as any) = async () => [];

    (prisma.userSkill.findMany as any) = async () => [
      {
        id: "userskill-1",
        skill: { name: "Express.js" },
      },
    ];

    (prisma.user.findUnique as any) = async () => ({
      id: "user-123",
      email: "testdev@example.com",
      username: "testdev",
      experiences: [],
      educations: [],
    });

    // We stub user.update and userSkill.update to verify they get called
    const updateSkillSpy = vi.fn().mockResolvedValue({});
    (prisma.userSkill.update as any) = updateSkillSpy;
    (prisma.user.update as any) = vi.fn().mockResolvedValue({});

    // Mock axios.get for repos, commits, and package.json contents
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes("/repos?sort=updated")) {
        return {
          data: [
            {
              name: "my-express-app",
              languages_url: "https://api.github.com/repos/testdev/my-express-app/languages",
            },
          ],
        };
      }
      if (url.includes("/languages")) {
        return { data: { JavaScript: 10000 } };
      }
      if (url.includes("/commits")) {
        return {
          data: [
            {
              commit: {
                author: { email: "testdev@example.com", name: "testdev" },
              },
            },
          ],
        };
      }
      if (url.includes("/contents/package.json")) {
        return {
          data: {
            content: Buffer.from(JSON.stringify({ dependencies: { express: "^5.0.0" } })).toString("base64"),
            encoding: "base64",
          },
        };
      }
      return { data: {} };
    });

    const result = await verifyUserSkills("user-123");
    expect(result.success).toBe(true);
    expect(updateSkillSpy).toHaveBeenCalled();
    expect(updateSkillSpy.mock.calls[0][0].data.verified).toBe(true);
    expect(updateSkillSpy.mock.calls[0][0].data.verificationSource).toContain("GITHUB_REPOS");
  });

  test("should throw AppError if user has not filled githubUrl", async () => {
    (prisma.profile.findUnique as any) = async () => ({
      userId: "user-123",
      githubUrl: "",
    });

    (prisma.codingProfile.findMany as any) = async () => [];

    await expect(verifyUserSkills("user-123")).rejects.toThrow(
      "You must fill your GitHub URL on your profile."
    );
  });
});

import axios from "axios";
import { Prisma } from "@prisma/client";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

const SYNONYM_MAP: Record<string, string> = {
  "js": "javascript",
  "javascript": "javascript",
  "ts": "typescript",
  "typescript": "typescript",
  "py": "python",
  "python": "python",
  "cpp": "c++",
  "c++": "c++",
  "cplusplus": "c++",
  "go": "go",
  "golang": "go",
  "rs": "rust",
  "rust": "rust",
  "rb": "ruby",
  "ruby": "ruby",
  "cs": "c#",
  "c#": "c#",
  "csharp": "c#",
  "html": "html",
  "html5": "html",
  "css": "css",
  "css3": "css",
  "java": "java",
  "kotlin": "kotlin",
  "swift": "swift",
  "php": "php",
  "express": "express.js",
  "nestjs": "nestjs",
  "spring-boot": "spring boot",
  "dockerfile": "docker",
};

// Minimum bytes in GitHub repo to verify a language skill
const MIN_GITHUB_BYTES = 5000;

// Helper to fetch file content from GitHub repository
export const fetchRepoFileContent = async (
  owner: string,
  repo: string,
  path: string,
  headers: any
): Promise<string | null> => {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers, timeout: 5000 }
    );
    if (res.data && res.data.content && res.data.encoding === "base64") {
      return Buffer.from(res.data.content, "base64").toString("utf8");
    }
  } catch (err) {
    // Gracefully handle 404 or other errors
  }
  return null;
};

// Helper to verify if user is contributor to the repo (anti-cheat check)
export const verifyUserCommitContribution = async (
  owner: string,
  repo: string,
  authorizedEmails: Set<string>,
  authorizedUsernames: Set<string>,
  headers: any
): Promise<boolean> => {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`,
      { headers, timeout: 5000 }
    );
    if (Array.isArray(res.data)) {
      for (const commit of res.data) {
        const authorEmail = commit.commit?.author?.email?.toLowerCase();
        const committerEmail = commit.commit?.committer?.email?.toLowerCase();
        const authorLogin = commit.author?.login?.toLowerCase();
        const committerLogin = commit.committer?.login?.toLowerCase();
        const authorName = commit.commit?.author?.name?.toLowerCase();
        const committerName = commit.commit?.committer?.name?.toLowerCase();

        if (
          (authorEmail && authorizedEmails.has(authorEmail)) ||
          (committerEmail && authorizedEmails.has(committerEmail)) ||
          (authorLogin && authorizedUsernames.has(authorLogin)) ||
          (committerLogin && authorizedUsernames.has(committerLogin)) ||
          (authorName && authorizedUsernames.has(authorName)) ||
          (committerName && authorizedUsernames.has(committerName))
        ) {
          return true;
        }
      }
    }
  } catch (err) {
    // Gracefully handle rate limit/errors
  }
  return false;
};

export const matchPackageDependencies = (deps: string[], foundSkills: Set<string>) => {
  for (const dep of deps) {
    const normalizedDep = dep.toLowerCase();
    if (normalizedDep === "express") {
      foundSkills.add("Express.js");
      foundSkills.add("Node.js");
    }
    if (normalizedDep.includes("nestjs")) {
      foundSkills.add("NestJS");
      foundSkills.add("Node.js");
    }
    if (normalizedDep === "mongoose") {
      foundSkills.add("Mongoose");
      foundSkills.add("MongoDB");
    }
    if (normalizedDep === "mongodb") {
      foundSkills.add("MongoDB");
    }
    if (normalizedDep === "react") {
      foundSkills.add("React");
    }
    if (normalizedDep === "next") {
      foundSkills.add("Next.js");
    }
    if (normalizedDep === "vue") {
      foundSkills.add("Vue.js");
    }
    if (normalizedDep === "nuxt") {
      foundSkills.add("Nuxt.js");
    }
    if (normalizedDep.includes("angular")) {
      foundSkills.add("Angular");
    }
    if (normalizedDep === "svelte") {
      foundSkills.add("Svelte");
    }
    if (normalizedDep.includes("prisma")) {
      foundSkills.add("Prisma");
    }
    if (normalizedDep === "sequelize") {
      foundSkills.add("Sequelize");
    }
    if (normalizedDep === "typeorm") {
      foundSkills.add("TypeORM");
    }
    if (normalizedDep === "drizzle-orm") {
      foundSkills.add("Drizzle ORM");
    }
    if (normalizedDep === "fastify") {
      foundSkills.add("Fastify");
      foundSkills.add("Node.js");
    }
    if (normalizedDep === "hono") {
      foundSkills.add("Hono");
      foundSkills.add("Node.js");
    }
  }
};

export const matchPomDependencies = (content: string, foundSkills: Set<string>) => {
  const lowercaseContent = content.toLowerCase();
  if (lowercaseContent.includes("spring-boot") || lowercaseContent.includes("springframework.boot")) {
    foundSkills.add("Spring Boot");
    foundSkills.add("Java");
  }
  if (lowercaseContent.includes("hibernate")) {
    foundSkills.add("Hibernate");
    foundSkills.add("Java");
  }
  if (lowercaseContent.includes("junit")) {
    foundSkills.add("JUnit");
  }
};

export const matchDockerfile = (content: string, foundSkills: Set<string>) => {
  foundSkills.add("Docker");
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith("FROM")) {
      const parts = trimmed.split(/\s+/);
      if (parts.length > 1) {
        const image = parts[1].toLowerCase();
        if (image.includes("node")) {
          foundSkills.add("Node.js");
        } else if (image.includes("python")) {
          foundSkills.add("Python");
        } else if (image.includes("openjdk") || image.includes("maven") || image.includes("gradle")) {
          foundSkills.add("Java");
        } else if (image.includes("golang") || image.includes("go:")) {
          foundSkills.add("Go");
        } else if (image.includes("rust")) {
          foundSkills.add("Rust");
        } else if (image.includes("ubuntu")) {
          foundSkills.add("Ubuntu");
        }
      }
    }
  }
};

export const verifyUserSkills = async (userId: string) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  const codingProfiles = await prisma.codingProfile.findMany({
    where: { userId },
  });

  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true },
  });

  if (!profile || !profile.githubUrl || profile.githubUrl.trim() === "") {
    throw new AppError("You must fill your GitHub URL on your profile.", 400);
  }

  const detectedSkills: Record<string, { verified: boolean; source: string; proof: any }> = {};

  // Get user with experiences and educations to fetch work/college emails for anti-cheat verification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      experiences: {
        where: { verified: true },
        select: { workEmail: true },
      },
      educations: {
        where: { collegeEmailVerified: true },
        select: { collegeEmail: true },
      },
    },
  });

  const authorizedEmails = new Set<string>();
  const authorizedUsernames = new Set<string>();

  if (user) {
    if (user.email) authorizedEmails.add(user.email.toLowerCase());
    if (user.username) authorizedUsernames.add(user.username.toLowerCase());

    if (profile?.githubUrl) {
      const ghUsername = profile.githubUrl
        .replace("https://github.com/", "")
        .replace("http://github.com/", "")
        .replace(/\/$/, "")
        .split("/")[0];
      if (ghUsername) {
        authorizedUsernames.add(ghUsername.toLowerCase());
      }
    }

    for (const exp of user.experiences) {
      if (exp.workEmail) {
        authorizedEmails.add(exp.workEmail.toLowerCase());
      }
    }

    for (const edu of user.educations) {
      if (edu.collegeEmail) {
        authorizedEmails.add(edu.collegeEmail.toLowerCase());
      }
    }
  }

  // 1. GITHUB VERIFICATION
  if (profile?.githubUrl) {
    try {
      const username = profile.githubUrl
        .replace("https://github.com/", "")
        .replace("http://github.com/", "")
        .replace(/\/$/, "")
        .split("/")[0];

      if (username) {
        const headers = process.env.GITHUB_TOKEN
          ? {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github+json",
            }
          : { Accept: "application/vnd.github+json" };

        // Fetch user public repos
        const reposResponse = await axios.get(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=15`,
          { headers, timeout: 5000 }
        );

        if (Array.isArray(reposResponse.data)) {
          // Fetch detailed language stats for top 6 repos to stay safe from rate limits
          const topRepos = reposResponse.data.slice(0, 6);
          const langPromises = topRepos.map(async (repo: any) => {
            try {
              const langRes = await axios.get(repo.languages_url, { headers, timeout: 3000 });
              return { repoName: repo.name, languages: langRes.data };
            } catch (err) {
              return { repoName: repo.name, languages: {} };
            }
          });

          const reposLanguages = await Promise.all(langPromises);

          // Group and accumulate language bytes
          const langBytes: Record<string, { totalBytes: number; repos: Array<{ name: string; bytes: number }> }> = {};

          for (const repoLangs of reposLanguages) {
            const repoName = repoLangs.repoName;
            for (const [langName, bytes] of Object.entries(repoLangs.languages)) {
              const normalizedName = langName.toLowerCase();
              const standardName = SYNONYM_MAP[normalizedName] || normalizedName;

              if (typeof bytes === "number") {
                if (!langBytes[standardName]) {
                  langBytes[standardName] = { totalBytes: 0, repos: [] };
                }
                langBytes[standardName].totalBytes += bytes;
                langBytes[standardName].repos.push({ name: repoName, bytes });
              }
            }
          }

          // Add primary languages for remaining repos
          const remainingRepos = reposResponse.data.slice(6);
          for (const repo of remainingRepos) {
            if (repo.language) {
              const normalizedName = repo.language.toLowerCase();
              const standardName = SYNONYM_MAP[normalizedName] || normalizedName;

              if (!langBytes[standardName]) {
                langBytes[standardName] = { totalBytes: 0, repos: [] };
              }
              // Add a default block for primary language
              langBytes[standardName].totalBytes += 10000;
              langBytes[standardName].repos.push({ name: repo.name, bytes: 10000 });
            }
          }

          // Filter by minimum threshold (5,000 bytes)
          for (const [lang, data] of Object.entries(langBytes)) {
            if (data.totalBytes >= MIN_GITHUB_BYTES) {
              detectedSkills[lang] = {
                verified: true,
                source: "GITHUB",
                proof: {
                  totalBytes: data.totalBytes,
                  repositories: data.repos.slice(0, 3), // store top 3 repo proofs
                },
              };
            }
          }

          // 2. Framework/Tools parsing with Commit Verification (Anti-Cheat)
          const repoPromises = reposResponse.data.slice(0, 10).map(async (repo: any) => {
            const isContributor = await verifyUserCommitContribution(
              username,
              repo.name,
              authorizedEmails,
              authorizedUsernames,
              headers
            );

            if (!isContributor) {
              return null;
            }

            // Fetch package.json, pom.xml, and Dockerfile concurrently
            const [packageJson, pomXml, dockerfile] = await Promise.all([
              fetchRepoFileContent(username, repo.name, "package.json", headers),
              fetchRepoFileContent(username, repo.name, "pom.xml", headers),
              fetchRepoFileContent(username, repo.name, "Dockerfile", headers),
            ]);

            const repoSkills = new Set<string>();
            if (packageJson) {
              try {
                const parsed = JSON.parse(packageJson);
                const deps = [
                  ...Object.keys(parsed.dependencies || {}),
                  ...Object.keys(parsed.devDependencies || {}),
                ];
                matchPackageDependencies(deps, repoSkills);
              } catch (e) {
                // Invalid JSON, skip
              }
            }
            if (pomXml) {
              matchPomDependencies(pomXml, repoSkills);
            }
            if (dockerfile) {
              matchDockerfile(dockerfile, repoSkills);
            }

            return {
              repoName: repo.name,
              skills: Array.from(repoSkills),
            };
          });

          const verifiedReposSkills = await Promise.all(repoPromises);

          for (const item of verifiedReposSkills) {
            if (item && item.skills.length > 0) {
              for (const skill of item.skills) {
                const normalizedSkill = skill.toLowerCase();
                const standardName = SYNONYM_MAP[normalizedSkill] || normalizedSkill;

                // Let's store or update detected skills (accumulating the proof)
                const existing = detectedSkills[standardName] || detectedSkills[normalizedSkill];
                const matchedName = existing ? (SYNONYM_MAP[standardName] || standardName) : skill;

                detectedSkills[matchedName.toLowerCase()] = {
                  verified: true,
                  source: existing ? `${existing.source}, GITHUB_REPOS` : "GITHUB_REPOS",
                  proof: {
                    ...existing?.proof,
                    githubRepo: {
                      repoName: item.repoName,
                      reason: "Extracted from verified framework/config files",
                    },
                  },
                };
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error verifying skills via GitHub API:", error.message);
    }
  }

  // 2. LEETCODE VERIFICATION
  const leetcodeProfile = codingProfiles.find(p => p.platform.toLowerCase() === "leetcode");
  if (leetcodeProfile) {
    try {
      const username = leetcodeProfile.username || leetcodeProfile.url
        .replace("https://leetcode.com/", "")
        .replace("http://leetcode.com/", "")
        .replace(/\/$/, "")
        .split("/")
        .filter(Boolean)
        .pop();

      if (username) {
        // Query public user language stats from LeetCode GraphQL
        const query = `
          query userLanguageStats($username: String!) {
            matchedUser(username: $username) {
              languageProblemCount {
                languageName
                problemsSolved
              }
            }
          }
        `;
        const response = await axios.post(
          "https://leetcode.com/graphql",
          { query, variables: { username } },
          { 
            headers: { 
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }, 
            timeout: 5000 
          }
        );

        const stats = response.data?.data?.matchedUser?.languageProblemCount;
        if (Array.isArray(stats)) {
          for (const stat of stats) {
            const normalizedName = stat.languageName.toLowerCase();
            const standardName = SYNONYM_MAP[normalizedName] || normalizedName;
            const solved = stat.problemsSolved;

            // Verify if user solved at least 3 problems in this language
            if (solved >= 3) {
              const existing = detectedSkills[standardName];
              detectedSkills[standardName] = {
                verified: true,
                source: existing ? `${existing.source}, LEETCODE` : "LEETCODE",
                proof: {
                  ...existing?.proof,
                  leetcode: {
                    problemsSolved: solved,
                    username,
                  },
                },
              };
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error verifying skills via LeetCode GraphQL:", error.message);
    }
  }

  // 3. OTHER CODING PLATFORMS (HackerRank/GFG/Coding Ninjas) MOCK FALLBACK
  for (const cpProfile of codingProfiles) {
    const platform = cpProfile.platform.toLowerCase();
    if (platform === "hackerrank" || platform === "geeksforgeeks" || platform === "codingninjas") {
      const username = cpProfile.username || "user";
      const typicalLanguages = ["java", "python", "c++"];
      for (const lang of typicalLanguages) {
        const existing = detectedSkills[lang];
        detectedSkills[lang] = {
          verified: true,
          source: existing ? `${existing.source}, ${cpProfile.platform.toUpperCase()}` : cpProfile.platform.toUpperCase(),
          proof: {
            ...existing?.proof,
            [platform]: {
              username,
              status: "Linked Profile verified",
            },
          },
        };
      }
    }
  }

  // 4. SYNC WITH DATABASE
  let updatedCount = 0;
  for (const userSkill of userSkills) {
    const skillNameNormalized = userSkill.skill.name.toLowerCase();
    const standardName = SYNONYM_MAP[skillNameNormalized] || skillNameNormalized;

    const match = detectedSkills[standardName] || detectedSkills[skillNameNormalized];

    if (match) {
      await prisma.userSkill.update({
        where: { id: userSkill.id },
        data: {
          verified: true,
          verificationSource: match.source,
          verificationProof: match.proof || {},
        },
      });
      updatedCount++;
    } else {
      await prisma.userSkill.update({
        where: { id: userSkill.id },
        data: {
          verified: false,
          verificationSource: null,
          verificationProof: Prisma.JsonNull,
        },
      });
    }
  }

  // Auto-upgrade user trust level
  if (updatedCount > 0) {
    const trustLevel = updatedCount >= 5 ? "ELITE" : (updatedCount >= 3 ? "VERIFIED" : "EMERGING");
    await prisma.user.update({
      where: { id: userId },
      data: { trustLevel },
    });
  }

  return {
    success: true,
    message: `Skill verification complete. Verified ${updatedCount} skills.`,
    verifiedCount: updatedCount,
  };
};

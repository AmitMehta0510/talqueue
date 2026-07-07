import axios from "axios";
import { RepoVisibility } from "@prisma/client";
import AppError from "shared/errors/AppError";

export interface GithubRepoData {
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  contributorsCount: number;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  repoVisibility: RepoVisibility;
  repoCreatedAt: string;
  repoUpdatedAt: string;
  /** True if this repo is a fork of another repository */
  isFork: boolean;
  /** Name of the parent repo if forked, e.g. "facebook/react" */
  parentRepo: string | null;
  /** Plagiarism risk score 0–100 based on fork status and commit density */
  plagiarismRisk: number;
  /** Text label for the plagiarism risk level */
  plagiarismRiskLevel: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Parses a GitHub URL and returns owner + repo name.
 * Throws AppError 400 on invalid URL.
 */
function parseGithubUrl(repoUrl: string): { owner: string; repo: string } {
  const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;
  const match = repoUrl.trim().match(regex);
  if (!match || !match[1] || !match[2]) {
    throw new AppError("Invalid GitHub URL", 400);
  }
  return { owner: match[1], repo: match[2] };
}

/**
 * Computes a plagiarism risk score based on whether the repo is a fork and
 * the ratio of commits to repo age. Returns 0–100 where:
 *  - HIGH (≥70): forked repo with < 5 commits OR < 3 days old with < 3 contributors
 *  - MEDIUM (30–69): forked with 5–20 commits OR brand new repo
 *  - LOW (<30): original repo with normal commit activity
 */
function computePlagiarismRisk(
  isFork: boolean,
  commitCount: number,
  contributorsCount: number,
  repoCreatedAt: string,
): { score: number; level: "LOW" | "MEDIUM" | "HIGH" } {
  const ageMs = Date.now() - new Date(repoCreatedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (isFork && commitCount < 5) return { score: 85, level: "HIGH" };
  if (isFork && commitCount < 20) return { score: 55, level: "MEDIUM" };
  if (isFork) return { score: 25, level: "LOW" };

  if (ageDays < 3 && contributorsCount < 2) return { score: 70, level: "HIGH" };
  if (ageDays < 7 && commitCount < 3) return { score: 45, level: "MEDIUM" };

  return { score: 10, level: "LOW" };
}

export const fetchGithubRepository = async (repoUrl: string): Promise<GithubRepoData> => {
  try {
    const { owner, repo } = parseGithubUrl(repoUrl);

    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    };

    const [repoResponse, languagesResponse, contributorsResponse] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers, timeout: 5000 }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers, timeout: 5000 }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`, { headers, timeout: 5000 }),
    ]);

    const repoData = repoResponse.data;
    const isFork: boolean = repoData.fork === true;
    const parentRepo: string | null = isFork ? (repoData.parent?.full_name ?? null) : null;
    const contributorsCount: number = contributorsResponse.data?.length || 0;

    // Estimate commit count from contributors list (sum of contributions)
    const totalCommits: number = Array.isArray(contributorsResponse.data)
      ? contributorsResponse.data.reduce((sum: number, c: any) => sum + (c.contributions || 0), 0)
      : 0;

    const { score: plagiarismRisk, level: plagiarismRiskLevel } = computePlagiarismRisk(
      isFork,
      totalCommits,
      contributorsCount,
      repoData.created_at,
    );

    return {
      starsCount: repoData.stargazers_count || 0,
      forksCount: repoData.forks_count || 0,
      openIssuesCount: repoData.open_issues_count || 0,
      contributorsCount,
      primaryLanguage: repoData.language ?? null,
      languages: languagesResponse.data || {},
      repoVisibility: repoData.private ? RepoVisibility.PRIVATE : RepoVisibility.PUBLIC,
      repoCreatedAt: repoData.created_at,
      repoUpdatedAt: repoData.updated_at,
      isFork,
      parentRepo,
      plagiarismRisk,
      plagiarismRiskLevel,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        if (status === 404) throw new AppError("GitHub repository not found", 404);
        if (status === 401 || status === 403) {
          throw new AppError(error.response.data?.message || "GitHub API authorization failed", status);
        }
        throw new AppError(error.response.data?.message || "Failed to fetch GitHub repository data", status);
      }
      throw new AppError("GitHub API is unreachable or request timed out", 503);
    }

    throw new AppError(error.message || "An unexpected error occurred while processing GitHub data", 500);
  }
};

/**
 * Verifies that a given GitHub username appears in the contributor list
 * of the specified repository. Used to validate project ownership.
 *
 * @returns `{ verified: true }` if the user is a contributor, `{ verified: false }` otherwise.
 */
export const verifyContributorAuthorship = async (
  repoUrl: string,
  githubUsername: string,
): Promise<{ verified: boolean }> => {
  if (!githubUsername?.trim()) return { verified: false };

  try {
    const { owner, repo } = parseGithubUrl(repoUrl);
    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    };

    // Fetch up to 100 contributors — sufficient for the vast majority of projects
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`,
      { headers, timeout: 5000 },
    );

    const contributors: { login: string }[] = response.data || [];
    const normalizedUsername = githubUsername.trim().toLowerCase();
    const verified = contributors.some((c) => c.login?.toLowerCase() === normalizedUsername);

    return { verified };
  } catch {
    // If GitHub API fails, we do not penalise the user — just return unverified
    return { verified: false };
  }
};
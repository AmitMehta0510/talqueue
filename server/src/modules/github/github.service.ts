import axios from "axios";
import { RepoVisibility } from "@prisma/client";
import AppError from "shared/errors/AppError";

export const fetchGithubRepository = async (
  repoUrl: string
) => {
  try {
    const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)\/([\w-]+)(?:\.git)?\/?$/i;
    const match = repoUrl.trim().match(regex);

    if (!match) {
      throw new AppError("Invalid GitHub URL", 400);
    }

    const [, owner, repo] = match;
    if (!owner || !repo) {
      throw new AppError("Invalid GitHub URL", 400);
    }

    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    };

    const [repoResponse, languagesResponse, contributorsResponse] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers, timeout: 5000 }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers, timeout: 5000 }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/contributors`, { headers, timeout: 5000 }),
    ]);

    return {
      starsCount: repoResponse.data.stargazers_count || 0,
      forksCount: repoResponse.data.forks_count || 0,
      openIssuesCount: repoResponse.data.open_issues_count || 0,
      contributorsCount: contributorsResponse.data?.length || 0,
      primaryLanguage: repoResponse.data.language,
      languages: languagesResponse.data,
      repoVisibility: repoResponse.data.private
        ? RepoVisibility.PRIVATE
        : RepoVisibility.PUBLIC,
      repoCreatedAt: repoResponse.data.created_at,
      repoUpdatedAt: repoResponse.data.updated_at,
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          throw new AppError("GitHub repository not found", 404);
        }
        if (status === 401 || status === 403) {
          throw new AppError(
            error.response.data?.message || "GitHub API authorization failed",
            status
          );
        }
        throw new AppError(
          error.response.data?.message || "Failed to fetch GitHub repository data",
          status
        );
      }
      throw new AppError("GitHub API is unreachable or request timed out", 503);
    }

    throw new AppError(
      error.message || "An unexpected error occurred while processing GitHub data",
      500
    );
  }
};
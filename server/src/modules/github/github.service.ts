import axios from "axios";
import { RepoVisibility }
from "@prisma/client";

export const fetchGithubRepository =  async (
    repoUrl: string
  ) => {

    const cleaned =
      repoUrl
        .replace(
          "https://github.com/",
          ""
        )
        .replace(
          "http://github.com/",
          ""
        )
        .replace(/\/$/, "");

    const [owner, repo] =
      cleaned.split("/");

    if (!owner || !repo) {
      throw new Error(
        "Invalid GitHub URL"
      );
    }

    const headers = {
      Authorization:
        `Bearer ${process.env.GITHUB_TOKEN}`,

      Accept:
        "application/vnd.github+json",
    };

    //
    // Repo metadata
    //
    const repoResponse =
      await axios.get(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers }
      );

    //
    // Languages
    //
    const languagesResponse =
      await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/languages`,
        { headers }
      );

    //
    // Contributors
    //
    const contributorsResponse =
      await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contributors`,
        { headers }
      );

    return {

      starsCount:
        repoResponse.data
          .stargazers_count || 0,

      forksCount:
        repoResponse.data
          .forks_count || 0,

      openIssuesCount:
        repoResponse.data
          .open_issues_count || 0,

      contributorsCount:
        contributorsResponse.data
          ?.length || 0,

      primaryLanguage:
        repoResponse.data
          .language,

      languages:
        languagesResponse.data,

      repoVisibility:
        repoResponse.data.private
          ? RepoVisibility.PRIVATE
          : RepoVisibility.PUBLIC,

      repoCreatedAt:
        repoResponse.data
          .created_at,

      repoUpdatedAt:
        repoResponse.data
          .updated_at,
    };
  };
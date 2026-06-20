import {
  Request,
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  globalSearch,
  searchUsers,
  searchProjects,
  searchHackathons,
  searchJobs,
  searchCompanies,
  searchCommunities,
} from "./search.service";

// Safety caps — prevent ILIKE full-table scans and oversized IN clauses
const MAX_QUERY_LEN = 200;
const MAX_FILTER_ITEMS = 50;

const sanitizeQuery = (val: string | undefined): string | undefined => {
  if (!val) return undefined;
  const trimmed = val.trim().slice(0, MAX_QUERY_LEN);
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseQueryArray = (val: any): string[] | undefined => {
  if (!val) return undefined;
  const arr = val
    .toString()
    .split(",")
    .map((s: string) => s.trim().slice(0, MAX_QUERY_LEN))
    .filter(Boolean)
    .slice(0, MAX_FILTER_ITEMS);
  return arr.length > 0 ? arr : undefined;
};

export const globalSearchHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const query = sanitizeQuery(req.query.q?.toString()) ?? "";

      const results =
        await globalSearch(
          query
        );

      res.json(
        successResponse(
          results
        )
      );
    }
  );

//
// SEARCH USERS
//
export const searchUsersHandler =asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const users =
        await searchUsers({

          query:
            sanitizeQuery(req.query.q?.toString()),

          collegeIds:
            parseQueryArray(req.query.collegeIds),

          collegeName: req.query.collegeName?.toString() || undefined,

          departmentIds:
            parseQueryArray(req.query.departmentIds),

          graduationYears:
            parseQueryArray(req.query.graduationYears)?.map(Number),

          skills:
            parseQueryArray(req.query.skills),

          trustLevels:
            parseQueryArray(req.query.trustLevels),

          companyNames:
            parseQueryArray(req.query.companyNames),

          role: req.query.role?.toString() || undefined,

          openToWork:
            req.query.openToWork === "true" ? true : undefined,

          openToInternship:
            req.query.openToInternship === "true" ? true : undefined,

          acceptingCollaborators:
            req.query.acceptingCollaborators === "true" ? true : undefined,

          acceptingReferrals:
            req.query.acceptingReferrals === "true" ? true : undefined,

          verifiedSkillsOnly:
            req.query.verifiedSkillsOnly === "true" ? true : undefined,

          limit:
            req.query.limit
              ? Math.min(
                  Number(
                    req.query.limit
                  ),
                  50
                )
              : 20,
        });

      res.json(
        successResponse(
          users
        )
      );
    }
  );


//
// SEARCH PROJECTS
//
export const searchProjectsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const projects = await searchProjects({
      query: sanitizeQuery(req.query.q?.toString()),
      techStack: parseQueryArray(req.query.techStack),
      domains: parseQueryArray(req.query.domains),
      difficultyLevels: parseQueryArray(req.query.difficultyLevels),
      verifiedOnly: req.query.verifiedOnly === "true",
      featuredOnly: req.query.featuredOnly === "true",
      lookingForCollaborators: req.query.lookingForCollaborators === "true",
      limit: req.query.limit ? Math.min(Number(req.query.limit), 50) : 20,
    });
    res.json(successResponse(projects));
  }
);


//
// SEARCH HACKATHONS
//
export const searchHackathonsHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const hackathons =  await searchHackathons({

          query:
            sanitizeQuery(req.query.q?.toString()),

          tags:
            parseQueryArray(req.query.tags),

          verifiedOnly:
            req.query.verifiedOnly ===
            "true",

          featuredOnly:
            req.query.featuredOnly ===
            "true",

          difficultyLevels:
            parseQueryArray(req.query.difficultyLevels),

          limit:
            req.query.limit
              ? Math.min(
                  Number(
                    req.query.limit
                  ),
                  50
                )
              : 20,
        });

      res.json(
        successResponse(
          hackathons
        )
      );
    }
  );

//
// SEARCH JOBS
//
export const searchJobsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const jobs = await searchJobs({
      query: sanitizeQuery(req.query.q?.toString()),
      companyName: sanitizeQuery(req.query.companyName?.toString()),
      skills: parseQueryArray(req.query.skills),
      workMode: req.query.workMode?.toString(),
      experienceLevel: req.query.experienceLevel?.toString(),
      location: req.query.location?.toString(),
      type: req.query.type?.toString(),
      salaryMin: req.query.salaryMin ? Number(req.query.salaryMin) : undefined,
      salaryMax: req.query.salaryMax ? Number(req.query.salaryMax) : undefined,
      postedWithinDays: req.query.postedWithinDays ? Number(req.query.postedWithinDays) : undefined,
      limit: req.query.limit ? Math.min(Number(req.query.limit), 50) : 20,
    });
    res.json(successResponse(jobs));
  }
);

//
// SEARCH COMPANIES
//
export const searchCompaniesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const companies = await searchCompanies({
      query: sanitizeQuery(req.query.q?.toString()),
      industry: req.query.industry?.toString(),
      size: req.query.size?.toString(),
      location: req.query.location?.toString(),
      hiringEnabled: req.query.hiringEnabled === "true" ? true : req.query.hiringEnabled === "false" ? false : undefined,
      referralEnabled: req.query.referralEnabled === "true" ? true : req.query.referralEnabled === "false" ? false : undefined,
      verified: req.query.verified === "true" ? true : undefined,
      limit: req.query.limit ? Math.min(Number(req.query.limit), 50) : 20,
    });
    res.json(successResponse(companies));
  }
);

//
// SEARCH COMMUNITIES
//
export const searchCommunitiesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const communities = await searchCommunities({
      query: sanitizeQuery(req.query.q?.toString()),
      type: req.query.type?.toString(),
      category: req.query.category?.toString(),
      limit: req.query.limit ? Math.min(Number(req.query.limit), 50) : 20,
    });
    res.json(successResponse(communities));
  }
);
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

export const globalSearchHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const query =
        req.query.q?.toString() || "";

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
            req.query.q?.toString(),

          collegeIds:
            req.query.collegeIds
              ?.toString()
              .split(","),

          collegeName: req.query.collegeName?.toString() || undefined,

          departmentIds:
            req.query.departmentIds
              ?.toString()
              .split(","),

          graduationYears:
            req.query.graduationYears
              ?.toString()
              .split(",")
              .map(Number),

          skills:
            req.query.skills
              ?.toString()
              .split(","),

          trustLevels:
            req.query.trustLevels
              ?.toString()
              .split(","),

          companyNames:
            req.query.companyNames
              ?.toString()
              .split(","),

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
              ? Number(
                  req.query.limit
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
      query: req.query.q?.toString(),
      techStack: req.query.techStack?.toString().split(",").filter(Boolean),
      domains: req.query.domains?.toString().split(",").filter(Boolean),
      difficultyLevels: req.query.difficultyLevels?.toString().split(",").filter(Boolean),
      verifiedOnly: req.query.verifiedOnly === "true",
      featuredOnly: req.query.featuredOnly === "true",
      lookingForCollaborators: req.query.lookingForCollaborators === "true",
      limit: req.query.limit ? Number(req.query.limit) : 20,
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
            req.query.q?.toString(),

          tags:
            req.query.tags
              ?.toString()
              .split(","),

          verifiedOnly:
            req.query.verifiedOnly ===
            "true",

          featuredOnly:
            req.query.featuredOnly ===
            "true",

          difficultyLevels:
            req.query.difficultyLevels
              ?.toString()
              .split(","),

          limit:
            req.query.limit
              ? Number(
                  req.query.limit
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
      query: req.query.q?.toString(),
      companyName: req.query.companyName?.toString(),
      skills: req.query.skills?.toString().split(",").filter(Boolean),
      workMode: req.query.workMode?.toString(),
      experienceLevel: req.query.experienceLevel?.toString(),
      location: req.query.location?.toString(),
      type: req.query.type?.toString(),
      salaryMin: req.query.salaryMin ? Number(req.query.salaryMin) : undefined,
      salaryMax: req.query.salaryMax ? Number(req.query.salaryMax) : undefined,
      postedWithinDays: req.query.postedWithinDays ? Number(req.query.postedWithinDays) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 20,
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
      query: req.query.q?.toString(),
      industry: req.query.industry?.toString(),
      size: req.query.size?.toString(),
      location: req.query.location?.toString(),
      hiringEnabled: req.query.hiringEnabled === "true" ? true : req.query.hiringEnabled === "false" ? false : undefined,
      referralEnabled: req.query.referralEnabled === "true" ? true : req.query.referralEnabled === "false" ? false : undefined,
      verified: req.query.verified === "true" ? true : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 20,
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
      query: req.query.q?.toString(),
      type: req.query.type?.toString(),
      category: req.query.category?.toString(),
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.json(successResponse(communities));
  }
);
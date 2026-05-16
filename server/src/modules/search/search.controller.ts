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

          openToWork:
            req.query.openToWork ===
            "true",

          openToInternship:
            req.query.openToInternship ===
            "true",

          acceptingCollaborators:
            req.query.acceptingCollaborators ===
            "true",

          acceptingReferrals:
            req.query.acceptingReferrals ===
            "true",

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
export const searchProjectsHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const projects =
        await searchProjects({

          query:
            req.query.q?.toString(),

          techStack:
            req.query.techStack
              ?.toString()
              .split(","),

          domains:
            req.query.domains
              ?.toString()
              .split(","),

          difficultyLevels:
            req.query.difficultyLevels
              ?.toString()
              .split(","),

          verifiedOnly:
            req.query.verifiedOnly ===
            "true",

          featuredOnly:
            req.query.featuredOnly ===
            "true",

          limit:
            req.query.limit
              ? Number(
                  req.query.limit
                )
              : 20,
        });

      res.json(
        successResponse(
          projects
        )
      );
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
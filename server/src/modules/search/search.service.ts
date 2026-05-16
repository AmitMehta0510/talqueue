import prisma from "shared/database/prisma";

import {
  SearchUsersFilters,
  SearchProjectsFilters,
  SearchHackathonsFilters,
} from "./search.types";

import {
  calculateUserSearchScore,
  calculateProjectSearchScore,
  calculateHackathonSearchScore,
} from "./search-ranking.service";

//
// USERS
//
export const searchUsers =  async (
    filters: SearchUsersFilters,
    currentUserId?: string
  ) => {

    const users =
      await prisma.user.findMany({

        where: {

          searchVisibility: true,

          ...(filters.query && {
            OR: [

              {
                username: {
                  contains:
                    filters.query,
                  mode:
                    "insensitive",
                },
              },

              {
                profile: {
                  fullName: {
                    contains:
                      filters.query,
                    mode:
                      "insensitive",
                  },
                },
              },

              {
                skills: {
                  some: {
                    skill: {
                      name: {
                        contains:
                          filters.query,
                        mode:
                          "insensitive",
                      },
                    },
                  },
                },
              },
            ],
          }),

          ...(filters.collegeIds
            ?.length && {

            profile: {
              collegeId: {
                in:
                  filters.collegeIds,
              },
            },
          }),

          ...(filters.departmentIds
            ?.length && {

            profile: {
              departmentId: {
                in:
                  filters.departmentIds,
              },
            },
          }),

          ...(filters.graduationYears
            ?.length && {

            profile: {
              graduationYear: {
                in:
                  filters.graduationYears,
              },
            },
          }),

          ...(filters.skills
            ?.length && {

            skills: {
              some: {
                skill: {
                  name: {
                    in:
                      filters.skills,
                  },
                },
              },
            },
          }),

          ...(filters.trustLevels
            ?.length && {

            trustLevel: {
              in:
                filters.trustLevels as any,
            },
          }),

          ...(filters.openToWork !==
            undefined && {
            openToWork:
              filters.openToWork,
          }),

          ...(filters.openToInternship !==
            undefined && {
            openToInternship:
              filters.openToInternship,
          }),

          ...(filters.acceptingCollaborators !==
            undefined && {
            acceptingCollaborators:
              filters.acceptingCollaborators,
          }),

          ...(filters.acceptingReferrals !==
            undefined && {
            acceptingReferrals:
              filters.acceptingReferrals,
          }),

          ...(filters.companyNames
            ?.length && {

            experiences: {
              some: {
                companyName: {
                  in:
                    filters.companyNames,
                },
              },
            },
          }),
        },

        include: {

          profile: {
            include: {
              college: true,
              department: true,
            },
          },

          skills: {
            include: {
              skill: true,
            },
          },

          experiences: true,

          _count: {
            select: {
              followers: true,
              projectMemberships: true,
            },
          },
        },

        take:
          filters.limit || 20,
      });

    const ranked =
      users.map((user) => ({

        user,

        relevanceScore:
          calculateUserSearchScore(
            user,
            {
              skillNames:
                filters.skills,
            }
          ),

        matchReasons: [
          user.trustLevel,
          `${user.engineeringScore} engineering score`,
        ],
      }));

    ranked.sort(
      (a, b) =>
        b.relevanceScore -
        a.relevanceScore
    );

    return ranked;
  };

//
// PROJECTS
//
export const searchProjects =  async (
    filters: SearchProjectsFilters
  ) => {

    const projects =
      await prisma.project.findMany({

        where: {

          deletedAt: null,

          visibility:
            "PUBLIC",

          ...(filters.query && {

            OR: [

              {
                title: {
                  contains:
                    filters.query,
                  mode:
                    "insensitive",
                },
              },

              {
                description: {
                  contains:
                    filters.query,
                  mode:
                    "insensitive",
                },
              },
            ],
          }),

          ...(filters.verifiedOnly && {
            verified: true,
          }),

          ...(filters.featuredOnly && {
            featured: true,
          }),

          ...(filters.domains
            ?.length && {

            domain: {
              in:
                filters.domains,
            },
          }),
        },

        include: {

          owner: {
            include: {
              profile: true,
            },
          },

          members: true,
        },

        take:
          filters.limit || 20,
      });

    const ranked =
      projects.map(
        (project) => ({

          project,

          relevanceScore:
            calculateProjectSearchScore(
              project,
              filters.techStack?.map(
                (s) =>
                  s.toLowerCase()
              ) || []
            ),

          matchReasons: [
            project.verified
              ? "Verified project"
              : null,

            project.featured
              ? "Featured project"
              : null,
          ].filter(Boolean),
        })
      );

    ranked.sort(
      (a, b) =>
        b.relevanceScore -
        a.relevanceScore
    );

    return ranked;
  };

//
// HACKATHONS
//
export const searchHackathons =  async (
    filters: SearchHackathonsFilters
  ) => {

    const hackathons =
      await prisma.hackathon.findMany({

        where: {

          deletedAt: null,

          ...(filters.query && {

            OR: [

              {
                title: {
                  contains:
                    filters.query,
                  mode:
                    "insensitive",
                },
              },

              {
                description: {
                  contains:
                    filters.query,
                  mode:
                    "insensitive",
                },
              },
            ],
          }),

          ...(filters.verifiedOnly && {
            verified: true,
          }),

          ...(filters.featuredOnly && {
            featured: true,
          }),
        },

        include: {
          createdBy: true,
        },

        take:
          filters.limit || 20,
      });

    const ranked =
      hackathons.map(
        (hackathon) => ({

          hackathon,

          relevanceScore:
            calculateHackathonSearchScore(
              hackathon
            ),

          matchReasons: [
            hackathon.verified
              ? "Verified hackathon"
              : null,

            hackathon.featured
              ? "Featured"
              : null,
          ].filter(Boolean),
        })
      );

    ranked.sort(
      (a, b) =>
        b.relevanceScore -
        a.relevanceScore
    );

    return ranked;
  };

//
// GLOBAL SEARCH
//
export const globalSearch =  async (
    query: string
  ) => {

    const [
      users,
      projects,
      hackathons,
    ] = await Promise.all([
      searchUsers({
        query,
        limit: 8,
      }),

      searchProjects({
        query,
        limit: 8,
      }),

      searchHackathons({
        query,
        limit: 8,
      }),
    ]);

    const topResults = [

      ...users.map((u) => ({
        type: "USER",
        score:
          u.relevanceScore,
        data: u.user,
      })),

      ...projects.map(
        (p) => ({
          type:
            "PROJECT",
          score:
            p.relevanceScore,
          data:
            p.project,
        })
      ),

      ...hackathons.map(
        (h) => ({
          type:
            "HACKATHON",
          score:
            h.relevanceScore,
          data:
            h.hackathon,
        })
      ),
    ];

    topResults.sort(
      (a, b) =>
        b.score - a.score
    );

    return {
      users,
      projects,
      hackathons,
      topResults:
        topResults.slice(0, 15),
    };
  };
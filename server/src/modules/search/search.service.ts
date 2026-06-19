import prisma from "shared/database/prisma";

import {
  SearchUsersFilters,
  SearchProjectsFilters,
  SearchHackathonsFilters,
  SearchJobsFilters,
  SearchCompaniesFilters,
  SearchCommunitiesFilters,
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

          roles: {
            none: {
              role: {
                name: {
                  in: ["SUPER_ADMIN", "PLATFORM_ADMIN"],
                },
              },
            },
          },

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

          ...((filters as any).collegeName && {
            profile: {
              college: {
                name: {
                  contains: (filters as any).collegeName,
                  mode: "insensitive",
                },
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

          ...(filters.verifiedSkillsOnly && {
            skills: {
              some: {
                verified: true,
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

          ...(filters.acceptingCollaborators !== undefined && {
            acceptingCollaborators: filters.acceptingCollaborators,
          }),

          ...(filters.acceptingReferrals !== undefined && {
            acceptingReferrals: filters.acceptingReferrals,
          }),

          ...(filters.role && {
            // The User model stores the primary role as `primaryRole String?`
            // (the `roles` relation is for admin/platform roles).
            primaryRole: filters.role,
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
              collegeId:
                user.profile?.collegeId || undefined,
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
export const searchProjects = async (
    filters: SearchProjectsFilters
  ) => {

    const techStackTerms = filters.techStack
      ?.flatMap((t) => t.split(",").map((s) => s.trim().toLowerCase()))
      .filter(Boolean) || [];

    const projects = await prisma.project.findMany({

        where: {

          deletedAt: null,

          visibility: "PUBLIC",

          ...(filters.query && {

            OR: [
              { title: { contains: filters.query, mode: "insensitive" } },
              { description: { contains: filters.query, mode: "insensitive" } },
            ],
          }),

          ...(filters.verifiedOnly && { verified: true }),

          ...(filters.featuredOnly && { featured: true }),

          ...(filters.lookingForCollaborators && { acceptingCollaborators: true }),

          ...(filters.difficultyLevels?.length && {
            difficulty: { in: filters.difficultyLevels as any },
          }),

          ...(filters.domains?.length && {
            domain: { in: filters.domains },
          }),
        },

        include: {
          owner: { include: { profile: true } },
          members: true,
        },

        take: filters.limit || 20,
      });


    const ranked =
      projects.map(
        (project) => ({

          project,

          relevanceScore:
            calculateProjectSearchScore(
              project,
              techStackTerms
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

          ...(filters.tags?.length && {
            tags: { hasSome: filters.tags },
          }),

          ...(filters.difficultyLevels?.length && {
            difficultyLevel: { in: filters.difficultyLevels as any },
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
// JOBS
//
export const searchJobs = async (filters: SearchJobsFilters) => {
  const postedAfter = filters.postedWithinDays
    ? new Date(Date.now() - filters.postedWithinDays * 24 * 60 * 60 * 1000)
    : undefined;

  return prisma.job.findMany({
    where: {
      status: "OPEN",
      deletedAt: null,

      ...(filters.query && {
        OR: [
          { title: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
          { company: { name: { contains: filters.query, mode: "insensitive" } } },
        ],
      }),

      ...(filters.companyName && {
        company: { name: { contains: filters.companyName, mode: "insensitive" } },
      }),

      ...(filters.workMode && { workMode: filters.workMode as any }),
      ...(filters.experienceLevel && { experienceLevel: filters.experienceLevel as any }),
      ...(filters.type && { type: filters.type as any }),

      ...(filters.location && {
        location: { contains: filters.location, mode: "insensitive" },
      }),

      ...(filters.salaryMin !== undefined && { salaryMin: { gte: filters.salaryMin } }),
      ...(filters.salaryMax !== undefined && { salaryMax: { lte: filters.salaryMax } }),

      ...(postedAfter && { createdAt: { gte: postedAfter } }),

      ...(filters.skills?.length && {
        skillsRequired: { hasSome: filters.skills },
      }),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      location: true,
      workMode: true,
      type: true,
      experienceLevel: true,
      salaryMin: true,
      salaryMax: true,
      createdAt: true,
      featured: true,
      skillsRequired: true,
      company: {
        select: { id: true, name: true, logoUrl: true, verified: true },
      },
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: filters.limit || 20,
  });
};

//
// COMPANIES
//
export const searchCompanies = async (filters: SearchCompaniesFilters) => {
  return prisma.company.findMany({
    where: {
      ...(filters.query && {
        OR: [
          { name: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
          { tagline: { contains: filters.query, mode: "insensitive" } },
        ],
      }),
      ...(filters.industry && {
        industry: { contains: filters.industry, mode: "insensitive" },
      }),
      ...(filters.size && { size: filters.size as any }),
      ...(filters.location && {
        headquarters: { contains: filters.location, mode: "insensitive" },
      }),
      ...(filters.hiringEnabled !== undefined && { hiringEnabled: filters.hiringEnabled }),
      ...(filters.referralEnabled !== undefined && { referralEnabled: filters.referralEnabled }),
      ...(filters.verified !== undefined && { verified: filters.verified }),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      tagline: true,
      description: true,
      industry: true,
      headquarters: true,
      size: true,
      verified: true,
      hiringEnabled: true,
      referralEnabled: true,
    },
    orderBy: [{ verified: "desc" }, { name: "asc" }],
    take: filters.limit || 20,
  });
};

//
// COMMUNITIES
//
export const searchCommunities = async (filters: SearchCommunitiesFilters) => {
  return prisma.community.findMany({
    where: {
      ...(filters.query && {
        OR: [
          { name: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
          { shortDescription: { contains: filters.query, mode: "insensitive" } },
        ],
      }),
      ...(filters.type && { type: filters.type as any }),
      ...(filters.category && { category: filters.category as any }),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      avatarUrl: true,
      shortDescription: true,
      description: true,
      type: true,
      category: true,
      memberCount: true,
      postCount: true,
      trendingScore: true,
    },
    orderBy: [{ trendingScore: "desc" }, { memberCount: "desc" }],
    take: filters.limit || 20,
  });
};

//
// GLOBAL SEARCH
//
export const globalSearch = async (query: string) => {
  const [users, projects, hackathons, jobs, companies, communities] = await Promise.all([
    searchUsers({ query, limit: 6 }),
    searchProjects({ query, limit: 6 }),
    searchHackathons({ query, limit: 6 }),
    searchJobs({ query, limit: 6 }),
    searchCompanies({ query, limit: 6 }),
    searchCommunities({ query, limit: 6 }),
  ]);

  const topResults = [
    ...users.map((u) => ({ type: "USER", score: u.relevanceScore, data: u.user })),
    ...projects.map((p) => ({ type: "PROJECT", score: p.relevanceScore, data: p.project })),
    ...hackathons.map((h) => ({ type: "HACKATHON", score: h.relevanceScore, data: h.hackathon })),
    ...jobs.map((j) => ({ type: "JOB", score: j.featured ? 200 : 100, data: j })),
    ...companies.map((c) => ({ type: "COMPANY", score: c.verified ? 200 : 100, data: c })),
    ...communities.map((c) => ({ type: "COMMUNITY", score: Math.round((c.trendingScore || 0) * 10), data: c })),
  ];

  topResults.sort((a, b) => b.score - a.score);

  return {
    users,
    projects,
    hackathons,
    jobs,
    companies,
    communities,
    topResults: topResults.slice(0, 15),
  };
};
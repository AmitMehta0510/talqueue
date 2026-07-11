import prisma from "shared/database/prisma";
import elasticClient from "services/elasticClient";

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
//
// USERS — Elasticsearch-first search with Prisma fallback
//
// Architecture:
//  1. Build an ES bool query from all active filters
//  2. ES returns ranked user IDs (fast, indexed, no ILIKE)
//  3. Prisma fetches full user objects for the matched IDs
//  4. If ES is unavailable (dev without Docker, or ES down), falls back
//     to the original Prisma ILIKE query so nothing breaks
//
export const searchUsers = async (
  filters: SearchUsersFilters,
  _currentUserId?: string,
) => {
  const limit  = Math.min(filters.limit ?? 20, 50);
  const from   = ((filters.page ?? 1) - 1) * limit;

  try {
    // ── 1. Build ES bool query ───────────────────────────────────────────────
    const must:   unknown[] = [];
    const filter: unknown[] = [];
    const should: unknown[] = [];

    // Always exclude hidden profiles
    filter.push({ term: { searchVisibility: true } });

    // Full-text query across name, username, bio, headline
    if (filters.query?.trim()) {
      must.push({
        multi_match: {
          query:  filters.query.trim(),
          fields: [
            "fullName^3",
            "fullName.autocomplete^2",
            "username^3",
            "username.autocomplete^2",
            "headline^1.5",
            "bio",
          ],
          type:      "best_fields",
          fuzziness: "AUTO",
        },
      });
    }

    // Skill filter — terms match on lowercased skill names
    if (filters.skills?.length) {
      filter.push({
        terms: { skills: filters.skills.map((s) => s.toLowerCase()) },
      });
    }

    // College filter (by ID or name)
    if (filters.collegeIds?.length) {
      filter.push({ terms: { collegeId: filters.collegeIds } });
    }
    if ((filters as any).collegeName) {
      filter.push({ term: { collegeName: (filters as any).collegeName } });
    }

    // Department filter
    if (filters.departmentIds?.length) {
      filter.push({ terms: { departmentId: filters.departmentIds } });
    }

    // Graduation year filter
    if (filters.graduationYears?.length) {
      filter.push({ terms: { graduationYear: filters.graduationYears } });
    }

    // Trust level filter
    if (filters.trustLevels?.length) {
      filter.push({ terms: { trustLevel: filters.trustLevels } });
    }

    // Primary role filter
    if (filters.role) {
      filter.push({ term: { primaryRole: filters.role } });
    }

    // Engineering score range
    if (filters.minEngineeringScore !== undefined || filters.maxEngineeringScore !== undefined) {
      const rangeClause: Record<string, number> = {};
      if (filters.minEngineeringScore !== undefined) rangeClause.gte = filters.minEngineeringScore;
      if (filters.maxEngineeringScore !== undefined) rangeClause.lte = filters.maxEngineeringScore;
      filter.push({ range: { engineeringScore: rangeClause } });
    }

    // Boolean availability flags
    if (filters.openToWork !== undefined)             filter.push({ term: { openToWork: filters.openToWork } });
    if (filters.openToInternship !== undefined)       filter.push({ term: { openToInternship: filters.openToInternship } });
    if (filters.acceptingCollaborators !== undefined) filter.push({ term: { acceptingCollaborators: filters.acceptingCollaborators } });
    if (filters.acceptingReferrals !== undefined)     filter.push({ term: { acceptingReferrals: filters.acceptingReferrals } });

    // ── 2. Sorting ───────────────────────────────────────────────────────────
    let sort: unknown[] = [];
    switch (filters.sortBy) {
      case "ENGINEERING_SCORE":
        sort = [{ engineeringScore: "desc" }, { reputationScore: "desc" }];
        break;
      case "REPUTATION":
        sort = [{ reputationScore: "desc" }, { engineeringScore: "desc" }];
        break;
      case "RECENT":
        sort = [{ createdAt: "desc" }];
        break;
      default:
        // RELEVANCE — let ES _score drive order; boost by engineeringScore
        sort = ["_score", { engineeringScore: "desc" }];
    }

    // ── 3. Execute ES query ──────────────────────────────────────────────────
    const esResponse = await (elasticClient.search as any)({
      index: "users",
      from,
      size:  limit,
      query: {
        bool: {
          must:   must.length   ? must   : [{ match_all: {} }],
          filter: filter.length ? filter : undefined,
          should: should.length ? should : undefined,
        },
      },
      sort,
      // Only return the document ID — Prisma will fetch the full record
      _source: false,
    });

    const hits = (esResponse.hits?.hits ?? []) as Array<{ _id: string }>;
    if (!hits.length) return [];

    const orderedIds = hits.map((h) => h._id);

    // ── 4. Fetch full user objects from Prisma ───────────────────────────────
    const users = await prisma.user.findMany({
      where: { id: { in: orderedIds } },
      include: {
        profile:     { include: { college: true, department: true } },
        skills:      { include: { skill: true } },
        experiences: true,
        _count: { select: { followers: true, projectMemberships: true } },
      },
    });

    // Re-order to match ES relevance order
    const userMap = new Map(users.map((u) => [u.id, u]));
    return orderedIds
      .map((id) => {
        const user = userMap.get(id);
        if (!user) return null;
        return {
          user,
          relevanceScore: 0, // ES already ranked; score implicit in order
          matchReasons:   [user.trustLevel, `${user.engineeringScore} engineering score`],
        };
      })
      .filter(Boolean);

  } catch (esErr: any) {
    // ── Prisma ILIKE fallback (ES unavailable) ───────────────────────────────
    // Logs a warning so the team knows ES is degraded but doesn't break search.
    console.warn(
      "[SearchUsers] Elasticsearch unavailable — falling back to Prisma ILIKE query.",
      esErr?.message,
    );

    const users = await prisma.user.findMany({
      where: {
        searchVisibility: true,
        NOT: {
          OR: [
            { primaryRole: { in: ["SUPER_ADMIN", "PLATFORM_ADMIN"] } },
            { primaryRole: { contains: "scraper", mode: "insensitive" } },
          ],
        },
        ...(filters.query && {
          OR: [
            { username: { contains: filters.query, mode: "insensitive" } },
            { profile: { fullName: { contains: filters.query, mode: "insensitive" } } },
            { skills: { some: { skill: { name: { contains: filters.query, mode: "insensitive" } } } } },
          ],
        }),
        ...(filters.collegeIds?.length && { profile: { collegeId: { in: filters.collegeIds } } }),
        ...(filters.skills?.length && {
          skills: { some: { skill: { name: { in: filters.skills } } } },
        }),
        ...(filters.openToWork !== undefined && { openToWork: filters.openToWork }),
        ...(filters.openToInternship !== undefined && { openToInternship: filters.openToInternship }),
        ...(filters.acceptingCollaborators !== undefined && { acceptingCollaborators: filters.acceptingCollaborators }),
        ...(filters.acceptingReferrals !== undefined && { acceptingReferrals: filters.acceptingReferrals }),
        ...(filters.trustLevels?.length && { trustLevel: { in: filters.trustLevels as any } }),
        ...(filters.role && { primaryRole: filters.role }),
        ...(filters.graduationYears?.length && {
          profile: { graduationYear: { in: filters.graduationYears } },
        }),
      },
      include: {
        profile:     { include: { college: true, department: true } },
        skills:      { include: { skill: true } },
        experiences: true,
        _count: { select: { followers: true, projectMemberships: true } },
      },
      take: limit,
    });

    const ranked = users.map((user) => ({
      user,
      relevanceScore: calculateUserSearchScore(user, {
        skillNames: filters.skills,
        collegeId: user.profile?.collegeId || undefined,
      }),
      matchReasons: [user.trustLevel, `${user.engineeringScore} engineering score`],
    }));

    ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return ranked;
  }
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
// HACKATHONS — Elasticsearch-backed with Prisma enrichment
//
export const searchHackathons = async (
  filters: SearchHackathonsFilters
) => {
  const safeLimit = filters.limit || 20;

  // ── Prisma fallback query (reused on ES failure) ────────────────────────────
  const prismaFallback = async () => {
    const hackathons = await prisma.hackathon.findMany({
      where: {
        deletedAt: null,
        ...(filters.query && {
          OR: [
            { title: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
          ],
        }),
        ...(filters.verifiedOnly && { verified: true }),
        ...(filters.featuredOnly && { featured: true }),
        ...(filters.tags?.length && { tags: { hasSome: filters.tags } }),
        ...(filters.difficultyLevels?.length && {
          difficultyLevel: { in: filters.difficultyLevels as any },
        }),
      },
      include: { createdBy: true },
      take: safeLimit,
    });
    return hackathons.map((hackathon) => ({
      hackathon,
      relevanceScore: calculateHackathonSearchScore(hackathon),
      matchReasons: [
        hackathon.verified ? "Verified hackathon" : null,
        hackathon.featured ? "Featured" : null,
      ].filter(Boolean),
    }));
  };

  // ── Build Elasticsearch bool query ─────────────────────────────────────────
  try {
    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    // Only show non-deleted hackathons (status != DELETED acts as proxy)
    filterClauses.push({ term: { status: "DELETED" } });
    // Note: we negate via must_not below

    if (filters.query && filters.query.trim()) {
      mustClauses.push({
        multi_match: {
          query: filters.query.trim(),
          fields: ["title^3", "description^2", "shortDescription", "organizerName"],
          fuzziness: "AUTO",
          operator: "or",
        },
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      filterClauses.push({ terms: { tags: filters.tags } });
    }

    if (filters.difficultyLevels && filters.difficultyLevels.length > 0) {
      filterClauses.push({ terms: { difficultyLevel: filters.difficultyLevels } });
    }

    const boolQuery: any = {
      // Exclude deleted hackathons at the ES layer
      must_not: [{ term: { status: "DELETED" } }],
    };
    if (mustClauses.length > 0) boolQuery.must = mustClauses;
    // Remove the dummy DELETED filter we pushed — we handle it via must_not
    const realFilters = filterClauses.filter(
      (f) => !(f.term && f.term.status === "DELETED")
    );
    if (realFilters.length > 0) boolQuery.filter = realFilters;

    const esQuery = mustClauses.length === 0 && realFilters.length === 0
      ? { bool: boolQuery }
      : { bool: boolQuery };

    const esResponse = await elasticClient.search({
      index: "hackathons",
      size: safeLimit,
      query: esQuery,
      _source: false, // IDs only — Prisma will enrich
    });

    const hits = esResponse.hits?.hits ?? [];
    if (hits.length === 0) return [];

    // Preserve ES relevance order via a score map
    const scoreMap = new Map<string, number>();
    const esIds: string[] = [];
    for (const hit of hits) {
      const id = hit._id as string;
      esIds.push(id);
      scoreMap.set(id, hit._score ?? 0);
    }

    // ── Prisma enrichment pass ─────────────────────────────────────────────────
    const hackathons = await prisma.hackathon.findMany({
      where: {
        id: { in: esIds },
        deletedAt: null,
        ...(filters.verifiedOnly && { verified: true }),
        ...(filters.featuredOnly && { featured: true }),
      },
      include: { createdBy: true },
    });

    // Re-order to match ES relevance ranking
    const hackathonMap = new Map(hackathons.map((h) => [h.id, h]));
    const ranked = esIds
      .map((id) => {
        const hackathon = hackathonMap.get(id);
        if (!hackathon) return null;
        return {
          hackathon,
          relevanceScore: scoreMap.get(id) ?? 0,
          matchReasons: [
            hackathon.verified ? "Verified hackathon" : null,
            hackathon.featured ? "Featured" : null,
          ].filter(Boolean),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return ranked;
  } catch (esErr: any) {
    // ── Fail-soft: ES unavailable → fall back to Prisma ──────────────────────
    console.warn(
      "[Search] Elasticsearch unavailable for hackathons search, falling back to Prisma:",
      esErr?.message || esErr
    );
    return prismaFallback();
  }
};

//
// JOBS — Elasticsearch-backed with Prisma enrichment
//
export const searchJobs = async (filters: SearchJobsFilters) => {
  const safeLimit = filters.limit || 20;
  const postedAfter = filters.postedWithinDays
    ? new Date(Date.now() - filters.postedWithinDays * 24 * 60 * 60 * 1000)
    : undefined;

  // ── Prisma fallback query (reused on ES failure) ────────────────────────────
  const prismaFallback = async (): Promise<{ jobs: any[]; total: number }> => {
    const where = {
      status: "OPEN" as const,
      deletedAt: null,
      ...(filters.query && {
        OR: [
          { title: { contains: filters.query, mode: "insensitive" as const } },
          { description: { contains: filters.query, mode: "insensitive" as const } },
          { company: { name: { contains: filters.query, mode: "insensitive" as const } } },
        ],
      }),
      ...(filters.companyName && {
        company: { name: { contains: filters.companyName, mode: "insensitive" as const } },
      }),
      ...(filters.workMode && { workMode: filters.workMode as any }),
      ...(filters.experienceLevel && { experienceLevel: filters.experienceLevel as any }),
      ...(filters.type && { type: filters.type as any }),
      ...(filters.location && {
        location: { contains: filters.location, mode: "insensitive" as const },
      }),
      ...(filters.salaryMin !== undefined && { salaryMin: { gte: filters.salaryMin } }),
      ...(filters.salaryMax !== undefined && { salaryMax: { lte: filters.salaryMax } }),
      ...(postedAfter && { createdAt: { gte: postedAfter } }),
      ...(filters.skills?.length && { skillsRequired: { hasSome: filters.skills } }),
    };
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        select: {
          id: true, title: true, slug: true, location: true, workMode: true,
          type: true, experienceLevel: true, salaryMin: true, salaryMax: true,
          createdAt: true, featured: true, skillsRequired: true,
          company: { select: { id: true, name: true, logoUrl: true, verified: true } },
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: safeLimit,
      }),
      prisma.job.count({ where }),
    ]);
    return { jobs, total };
  };

  // ── Build Elasticsearch bool query ─────────────────────────────────────────
  try {
    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    // Always restrict to OPEN, non-deleted jobs at the ES layer
    filterClauses.push({ term: { status: "OPEN" } });

    if (filters.query && filters.query.trim()) {
      mustClauses.push({
        multi_match: {
          query: filters.query.trim(),
          fields: ["title^3", "description^2", "companyName", "requirements"],
          fuzziness: "AUTO",
          operator: "or",
        },
      });
    }

    // companyName: fuzzy match on the indexed text field
    if (filters.companyName && filters.companyName.trim()) {
      mustClauses.push({
        match: {
          companyName: {
            query: filters.companyName.trim(),
            fuzziness: "AUTO",
          },
        },
      });
    }

    // Keyword exact filters
    if (filters.workMode) filterClauses.push({ term: { workMode: filters.workMode } });
    if (filters.experienceLevel) filterClauses.push({ term: { experienceLevel: filters.experienceLevel } });
    if (filters.type) filterClauses.push({ term: { type: filters.type } });
    if (filters.location) filterClauses.push({ term: { location: filters.location } });

    // Skills: all provided skills must appear in skillsRequired
    if (filters.skills && filters.skills.length > 0) {
      for (const skill of filters.skills) {
        filterClauses.push({ term: { skillsRequired: skill } });
      }
    }

    // Salary range filters
    if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
      const rangeClause: any = {};
      if (filters.salaryMin !== undefined) rangeClause.gte = filters.salaryMin;
      if (filters.salaryMax !== undefined) rangeClause.lte = filters.salaryMax;
      filterClauses.push({ range: { salaryMin: rangeClause } });
    }

    // Posted-within-days date filter
    if (postedAfter) {
      filterClauses.push({ range: { createdAt: { gte: postedAfter.toISOString() } } });
    }

    const boolQuery: any = {};
    if (mustClauses.length > 0) boolQuery.must = mustClauses;
    if (filterClauses.length > 0) boolQuery.filter = filterClauses;

    // Inner bool/match_all forms the relevance base
    const innerQuery = Object.keys(boolQuery).length === 0
      ? { match_all: {} }
      : { bool: boolQuery };

    // ── function_score: boost promoted companies and active ad placements ──
    // score_mode: 'multiply' — if both filters match, weights multiply (2.0 × 1.5 = 3.0)
    // boost_mode: 'multiply' — final score = original_relevance_score × combined_weight
    // This ensures promoted/paid jobs float to the top without completely overriding
    // text-relevance for highly-specific keyword searches.
    const esQuery = {
      function_score: {
        query: innerQuery,
        functions: [
          {
            filter: { term: { isPromoted: true } },
            weight: 2.0,
          },
          {
            filter: { term: { hasActiveAd: true } },
            weight: 1.5,
          },
        ],
        score_mode: "multiply" as const,
        boost_mode: "multiply" as const,
      },
    };

    const esResponse = await elasticClient.search({
      index: "jobs",
      size: safeLimit,
      query: esQuery,
      // Sort: featured jobs first (boolean desc), then by ES relevance score
      sort: [
        { featured: { order: "desc" } },
        "_score",
      ],
      _source: false, // IDs only — Prisma will enrich
    });

    const hits = esResponse.hits?.hits ?? [];
    // Extract the filtered total count from ES (hits.total can be a number or { value, relation })
    const total = typeof esResponse.hits.total === "number"
      ? esResponse.hits.total
      : ((esResponse.hits.total as any)?.value ?? hits.length);

    if (hits.length === 0) return { jobs: [], total };

    const esIds = hits.map((h) => h._id as string);

    // ── Prisma enrichment pass ─────────────────────────────────────────────────
    const jobs = await prisma.job.findMany({
      where: { id: { in: esIds }, deletedAt: null },
      select: {
        id: true, title: true, slug: true, location: true, workMode: true,
        type: true, experienceLevel: true, salaryMin: true, salaryMax: true,
        createdAt: true, featured: true, skillsRequired: true,
        company: { select: { id: true, name: true, logoUrl: true, verified: true } },
      },
    });

    // Re-order Prisma results to match ES relevance ranking
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    return {
      jobs: esIds.map((id) => jobMap.get(id)).filter((j): j is NonNullable<typeof j> => j !== undefined),
      total,
    };
  } catch (esErr: any) {
    // ── Fail-soft: ES unavailable → fall back to Prisma ──────────────────────
    console.warn(
      "[Search] Elasticsearch unavailable for jobs search, falling back to Prisma:",
      esErr?.message || esErr
    );
    return prismaFallback();
  }
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
export const globalSearch = async (query: string, omniMode = false) => {
  const limit = omniMode ? 3 : 6;
  const [users, projects, hackathons, jobs, companies, communities] = await Promise.all([
    searchUsers({ query, limit }),
    searchProjects({ query, limit }),
    searchHackathons({ query, limit }),
    searchJobs({ query, limit }),
    searchCompanies({ query, limit }),
    searchCommunities({ query, limit }),
  ]);

  // Omni mode: return slim per-entity slices only (no merged topResults).
  // Used by GET /search/global?omni=true — the SearchResultsPage preview grid.
  if (omniMode) {
    return {
      users,
      projects,
      hackathons,
      jobs: jobs.jobs,
      companies,
      communities,
    };
  }

  const topResults = [
    ...users
      .filter((u): u is NonNullable<typeof u> => u !== null && u !== undefined)
      .map((u) => ({ type: "USER", score: u.relevanceScore, data: u.user })),
    ...projects.map((p) => ({ type: "PROJECT", score: p.relevanceScore, data: p.project })),
    ...hackathons.map((h) => ({ type: "HACKATHON", score: h.relevanceScore, data: h.hackathon })),
    ...jobs.jobs.map((j) => ({ type: "JOB", score: j.featured ? 200 : 100, data: j })),
    ...companies.map((c) => ({ type: "COMPANY", score: c.verified ? 200 : 100, data: c })),
    ...communities.map((c) => ({ type: "COMMUNITY", score: Math.round((c.trendingScore || 0) * 10), data: c })),
  ];

  topResults.sort((a, b) => b.score - a.score);

  return {
    users,
    projects,
    hackathons,
    jobs: jobs.jobs,
    jobsTotal: jobs.total,
    companies,
    communities,
    topResults: topResults.slice(0, 15),
  };
};
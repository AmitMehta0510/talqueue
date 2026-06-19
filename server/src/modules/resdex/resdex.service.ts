import elasticClient from "services/elasticClient";
import AppError from "shared/errors/AppError";

export interface ResdexSearchFilters {
  /** Free-text fuzzy search on fullName and about */
  query?: string;
  /** Exact-match skills (keyword) — all must be present */
  skills?: string[];
  /** Minimum CGPA threshold (float range gte) */
  minCgpa?: number;
  /** Exact graduation year to match (integer term) */
  graduationYear?: number;
  /** Fuzzy college name match inside nested education array */
  collegeName?: string;
  /** Fuzzy company name match inside nested experience array */
  companyName?: string;
  /** Result page size, default 20 */
  size?: number;
  /** Zero-indexed page offset, default 0 */
  from?: number;
}

export interface ResdexCandidate {
  id: string;
  fullName: string;
  about: string;
  verified_skills: string[];
  cgpa: number;
  graduationYear: number | null;
  experienceYears: number;
  education: { collegeName: string }[];
  experience: { companyName: string }[];
  score: number;
}

export interface ResdexSearchResult {
  total: number;
  candidates: ResdexCandidate[];
}

/**
 * Builds and executes an Elasticsearch bool query against the users_resdex index.
 * Uses:
 *  - multi_match with fuzziness for fullName/about text fields
 *  - nested queries for education.collegeName and experience.companyName
 *  - terms query for verified_skills (all provided skills must be present)
 *  - range query for cgpa (gte) and term query for exact graduationYear
 */
export async function searchResdexCandidates(
  filters: ResdexSearchFilters
): Promise<ResdexSearchResult> {
  const {
    query,
    skills,
    minCgpa,
    graduationYear,
    collegeName,
    companyName,
    size = 20,
    from = 0,
  } = filters;

  const safeSize = Math.min(size, 50);
  if (from + safeSize > 10000) {
    throw new AppError("Result window is too large, from + size must be less than or equal to 10000.", 400);
  }

  // must[] — hard filters that all matched docs must satisfy
  const mustClauses: any[] = [];
  // should[] — soft boosts for relevance scoring
  const shouldClauses: any[] = [];

  // ── Free-text fuzzy search ──────────────────────────────────────────────────
  if (query && query.trim()) {
    shouldClauses.push({
      multi_match: {
        query: query.trim(),
        fields: ["fullName^3", "about"],
        fuzziness: "AUTO",
        operator: "or",
      },
    });
  }

  // ── Verified skills — ALL provided skills must be present (terms subset) ────
  if (skills && skills.length > 0) {
    for (const skill of skills) {
      mustClauses.push({
        term: { verified_skills: skill },
      });
    }
  }

  // ── CGPA range filter ────────────────────────────────────────────────────────
  if (minCgpa !== undefined && minCgpa !== null) {
    mustClauses.push({
      range: { cgpa: { gte: minCgpa } },
    });
  }

  // ── Graduation year exact filter ─────────────────────────────────────────────
  if (graduationYear !== undefined && graduationYear !== null) {
    mustClauses.push({
      term: { graduationYear },
    });
  }

  // ── Nested: education.collegeName fuzzy match ────────────────────────────────
  if (collegeName && collegeName.trim()) {
    mustClauses.push({
      nested: {
        path: "education",
        query: {
          match: {
            "education.collegeName": {
              query: collegeName.trim(),
              fuzziness: "AUTO",
            },
          },
        },
      },
    });
  }

  // ── Nested: experience.companyName fuzzy match ───────────────────────────────
  if (companyName && companyName.trim()) {
    mustClauses.push({
      nested: {
        path: "experience",
        query: {
          match: {
            "experience.companyName": {
              query: companyName.trim(),
              fuzziness: "AUTO",
            },
          },
        },
      },
    });
  }

  // If no filters at all, match everything
  const boolQuery: any = {};
  if (mustClauses.length > 0) {
    boolQuery.must = mustClauses;
  }
  if (shouldClauses.length > 0) {
    boolQuery.should = shouldClauses;
  }

  const esQuery =
    mustClauses.length === 0 && shouldClauses.length === 0
      ? { match_all: {} }
      : { bool: boolQuery };

  let response;
  try {
    response = await elasticClient.search({
      index: "users_resdex",
      from,
      size: safeSize,
      query: esQuery,
      _source: true,
    });
  } catch (error: any) {
    console.error("Elasticsearch search query failed:", error);
    throw new AppError("Candidate search service is temporarily unavailable", 500);
  }

  const hits = response.hits?.hits ?? [];
  const total =
    typeof response.hits?.total === "number"
      ? response.hits.total
      : (response.hits?.total as any)?.value ?? 0;

  const candidates: ResdexCandidate[] = hits.map((hit: any) => ({
    id: hit._id as string,
    score: hit._score ?? 0,
    ...(hit._source as Omit<ResdexCandidate, "id" | "score">),
  }));

  return { total, candidates };
}

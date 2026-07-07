/**
 * Natural Language Query Parser for Resdex candidate sourcing.
 *
 * Converts a plain English recruiter query such as:
 *   "Find React developers from IIT with CGPA above 8.5 graduating in 2026"
 * into a structured ResdexSearchFilters object that Elasticsearch can execute.
 *
 * Approach: regex-based pattern extraction — no external LLM dependency,
 * instant response, zero API cost.
 */

import type { ResdexSearchFilters } from "./resdex.service";

// ─── Known tech skills to extract from free-text ─────────────────────────────
const KNOWN_SKILLS = [
  "react", "angular", "vue", "svelte", "next.js", "nextjs", "nuxt",
  "node.js", "nodejs", "express", "fastapi", "django", "flask", "spring",
  "typescript", "javascript", "python", "java", "golang", "go", "rust", "c++",
  "kotlin", "swift", "flutter", "react native",
  "postgresql", "mysql", "mongodb", "redis", "sqlite", "elasticsearch",
  "docker", "kubernetes", "aws", "gcp", "azure", "terraform",
  "graphql", "rest", "grpc", "websocket", "webrtc",
  "machine learning", "deep learning", "tensorflow", "pytorch",
  "nlp", "computer vision", "data science",
  "git", "linux", "devops", "ci/cd", "kafka", "rabbitmq",
];

// ─── College tier keywords → college name prefix ──────────────────────────────
const TIER_COLLEGES: Record<string, string> = {
  "tier 1": "IIT",
  "tier-1": "IIT",
  "iit": "IIT",
  "nit": "NIT",
  "iim": "IIM",
  "bits": "BITS",
  "tier 2": "NIT",
};

/**
 * Parses a plain English recruiter query into structured ResdexSearchFilters.
 *
 * @param rawQuery  - Free-form recruiter query string.
 * @returns Partial ResdexSearchFilters extracted from the query.
 */
export function parseNaturalLanguageQuery(rawQuery: string): ResdexSearchFilters {
  const q = rawQuery.toLowerCase().trim();
  const filters: ResdexSearchFilters = {};

  // ── Remaining free-text (pass original query for fuzzy name/about search) ──
  filters.query = rawQuery.trim();

  // ── CGPA / GPA extraction ──────────────────────────────────────────────────
  // Patterns: "cgpa > 8.5", "gpa above 8", "minimum cgpa of 9", "cgpa 8+"
  const cgpaMatch = q.match(
    /(?:cgpa|gpa|cpi)\s*(?:above|>|>=|of|:|\s)\s*(\d+(?:\.\d+)?)/,
  ) || q.match(/minimum\s+(?:cgpa|gpa)\s+(?:of\s+)?(\d+(?:\.\d+)?)/) 
    || q.match(/(\d+(?:\.\d+)?)\s*\+\s*(?:cgpa|gpa)/);

  if (cgpaMatch) {
    const parsed = parseFloat(cgpaMatch[1]);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
      filters.minCgpa = parsed;
    }
  }

  // ── Graduation year extraction ─────────────────────────────────────────────
  // Patterns: "2026 batch", "graduating in 2025", "final year 2026", "batch of 2025"
  const yearMatch = q.match(
    /(?:batch(?:\s+of)?|graduating(?:\s+in)?|final\s+year|graduation\s+year|class\s+of)\s+(\d{4})/,
  ) || q.match(/\b(202[0-9])\s+batch\b/);

  if (yearMatch) {
    const yr = parseInt(yearMatch[1], 10);
    if (yr >= 2020 && yr <= 2030) {
      filters.graduationYear = yr;
    }
  }

  // ── College tier / name extraction ───────────────────────────────────────
  for (const [pattern, collegeName] of Object.entries(TIER_COLLEGES)) {
    if (q.includes(pattern)) {
      filters.collegeName = collegeName;
      break;
    }
  }

  // Direct college name pattern: "from VIT", "at IIIT Hyderabad"
  if (!filters.collegeName) {
    const collegeMatch = q.match(/(?:from|at|in)\s+([a-z]{2,}(?:\s+[a-z]+){0,3})\s+(?:college|university|institute|iit|nit|bits)/i);
    if (collegeMatch) {
      filters.collegeName = collegeMatch[1].trim();
    }
  }

  // ── Skill extraction ───────────────────────────────────────────────────────
  const detectedSkills: string[] = [];
  for (const skill of KNOWN_SKILLS) {
    // Use word-boundary matching for single-word skills
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (pattern.test(q)) {
      // Store the canonical casing
      detectedSkills.push(
        KNOWN_SKILLS.find((s) => s.toLowerCase() === skill) || skill,
      );
    }
  }
  if (detectedSkills.length > 0) {
    filters.skills = detectedSkills;
  }

  // ── Experience at company extraction ─────────────────────────────────────
  // Pattern: "worked at Google", "from Microsoft", "ex-Amazon"
  const companyMatch = q.match(
    /(?:worked\s+at|ex[-\s]|from\s+company\s+|experience\s+at)\s+([a-z][a-z0-9\s]+?)(?:\s+with|\s+and|\s+having|\.|,|$)/i,
  );
  if (companyMatch) {
    filters.companyName = companyMatch[1].trim();
  }

  return filters;
}

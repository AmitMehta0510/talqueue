/**
 * Role filter utility — shared by all ATS adapters.
 * Determines whether a job title is relevant to this platform
 * (engineering, tech, or internship roles).
 */

const TECH_ROLE_KEYWORDS = [
  "engineer", "developer", "software", "backend", "frontend", "fullstack",
  "product manager", "designer", "data scientist", "data analyst", "devops",
  "sre", "architect", "machine learning", "ui/ux", "product design", "qa",
  "test engineer", "technical", "engineering", "programmer", "ml", "ai",
  "cloud", "infrastructure", "platform", "security", "research", "analytics",
  "database", "data engineer", "mobile", "android", "ios", "flutter",
  "embedded", "firmware", "hardware", "nlp", "computer vision",
  "site reliability", "solutions architect", "technical program manager",
  "tpm", "scrum", "agile", "release engineer",
];

/**
 * Returns true if the job title is a tech/engineering role OR an internship.
 * Internships are always included regardless of tech keywords.
 */
export function isTechOrInternRole(title: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();

  // Fast-pass: all internship/trainee/entry-level patterns
  if (
    t.includes("intern") ||
    t.includes("co-op") || t.includes("coop") ||
    t.includes("trainee") || t.includes("traineeship") ||
    t.includes("apprentice") ||
    t.includes("fresher") ||
    t.includes("new grad") || t.includes("new graduate") ||
    t.includes("campus hire") || t.includes("campus recruit") ||
    t.includes("summer program") || t.includes("winter program") ||
    t.includes("graduate engineer") || t.includes("graduate hire")
  ) return true;

  return TECH_ROLE_KEYWORDS.some((keyword) => t.includes(keyword));
}

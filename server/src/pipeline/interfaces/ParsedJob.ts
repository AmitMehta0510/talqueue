import type { Extracted } from "./ExtractionResult";
import type { SectionMap } from "./SectionMap";

// ─── Skill Types ──────────────────────────────────────────────────────────────

/**
 * All supported skill categories.
 * Skills are always categorized to enable structured faceted search.
 */
export type SkillCategory =
  | "Languages"
  | "Frameworks"
  | "Cloud"
  | "Databases"
  | "Messaging"
  | "Caching"
  | "Infrastructure"
  | "DevOps"
  | "Frontend"
  | "Backend"
  | "Testing"
  | "AI_ML"
  | "Observability"
  | "Security"
  | "OperatingSystems"
  | "VersionControl"
  | "PackageManagers"
  | "CI_CD"
  | "Tools"
  | "Other";

/** A skill with its canonical name, source text, category, and confidence. */
export interface CategorizedSkill {
  /** Canonical (normalized) skill name, e.g. "PostgreSQL", "Node.js", "LangGraph". */
  name: string;

  /** As it appeared in the source text, e.g. "postgres", "nodejs", "langgraph". */
  raw: string;

  /** Skill category for structured faceting and tech stack decomposition. */
  category: SkillCategory;

  /** Whether this skill was in a "required" section (vs. "preferred"). */
  isRequired: boolean;

  /** Confidence that this is a real technology skill (0-1). */
  confidence: number;
}

/**
 * Decomposed tech stack extracted from all sections.
 * Provides structured data for Elasticsearch multi-category filtering.
 */
export interface TechStack {
  languages: string[];
  frameworks: string[];
  cloud: string[];
  databases: string[];
  devops: string[];
  ai_ml: string[];
  observability: string[];
  testing: string[];
  other: string[];
}

// ─── Experience Types ─────────────────────────────────────────────────────────

/** Structured experience requirement extracted from a job description. */
export interface ExperienceRequirement {
  /** Minimum years required. null = not specified or entry-level. */
  minYears: number | null;

  /** Maximum years for a range (e.g., "3-5 years"). null if open-ended. */
  maxYears: number | null;

  /**
   * Human-readable level label.
   * One of: "Internship" | "Entry Level" | "Mid Level" | "Senior" | "Staff / Principal" | "Director+" | "Unknown"
   */
  label: string;

  /** Raw text signals that drove the extraction, e.g. ["5+ years", "Senior IC"]. */
  signals: string[];
}

// ─── Salary Types ─────────────────────────────────────────────────────────────

/** Structured salary range. null if not mentioned in the job description. */
export interface SalaryRange {
  min: number;
  max: number | null;

  /** ISO 4217 currency code: "USD", "INR", "EUR", "GBP", etc. */
  currency: string;

  /** Pay period. "annual" is the default assumption when not specified. */
  period: "annual" | "monthly" | "hourly";

  /** Whether this includes equity/RSUs. */
  isEquity?: boolean;
}

// ─── Location Types ───────────────────────────────────────────────────────────

/** Structured location data parsed from raw location strings and job text. */
export interface StructuredLocation {
  /** Original raw location string from the ATS, e.g. "Bengaluru, KA, India (Hybrid)". */
  raw: string;

  city: string | null;
  state: string | null;
  country: string | null;

  /** ISO 3166-1 alpha-2 country code: "IN", "US", "DE", etc. */
  countryCode: string | null;

  isRemote: boolean;
  isHybrid: boolean;
  isOnsite: boolean;

  /**
   * Countries eligible for remote work, if specified.
   * e.g. ["US", "CA"] for "Remote - US/Canada only".
   */
  remoteCountries: string[];

  /** null = not mentioned. */
  visaSponsorship: boolean | null;
  relocationAssistance: boolean | null;
}

// ─── Education Types ──────────────────────────────────────────────────────────

/** Education requirement parsed from the job description. */
export interface EducationRequirement {
  /** Minimum degree level required or preferred. */
  degree: "bachelors" | "masters" | "phd" | "any" | null;

  /** Fields of study mentioned, e.g. ["Computer Science", "Engineering"]. */
  fields: string[];

  /** true = required, false = preferred/nice-to-have. */
  isRequired: boolean;
}

// ─── ParsedJob — Full Structured Pipeline Output ──────────────────────────────

/**
 * Full structured output of the parsing pipeline.
 * Every field (except identity fields) is wrapped in Extracted<T> to carry confidence metadata.
 */
export interface ParsedJob {
  // ── Identity ─────────────────────────────────────────────────────────────────
  /** ATS-assigned job identifier, e.g. "greenhouse-12345678". */
  externalId: string;

  /** Which ATS produced this job. */
  atsSource: string;

  /** Direct application URL from the ATS. */
  applyUrl: string;

  /** ATS-provided publication timestamp. */
  postedAt: Date | null;

  // ── Raw Preservation ─────────────────────────────────────────────────────────
  /** Original raw HTML from the ATS — never modified. Stored for future re-parsing. */
  rawHtml: string;

  /** Cleaned, tag-free plain text. */
  plainText: string;

  /** Whitespace-normalized, contraction-expanded plain text. */
  normalizedText: string;

  /** Fully parsed section map. Serialized to JSON in the database. */
  parsedSections: SectionMap;

  // ── Core ─────────────────────────────────────────────────────────────────────
  title: string;
  description: string;

  jobType: Extracted<string>;
  workMode: Extracted<string>;

  // ── Skills ───────────────────────────────────────────────────────────────────
  requiredSkills: Extracted<CategorizedSkill[]>;
  preferredSkills: Extracted<CategorizedSkill[]>;
  techStack: TechStack;

  // ── Experience ───────────────────────────────────────────────────────────────
  experience: Extracted<ExperienceRequirement>;

  // ── Compensation ─────────────────────────────────────────────────────────────
  salary: Extracted<SalaryRange | null>;

  // ── Location ─────────────────────────────────────────────────────────────────
  location: Extracted<StructuredLocation>;

  // ── Qualifications ───────────────────────────────────────────────────────────
  education: Extracted<EducationRequirement | null>;

  // ── Content Sections ─────────────────────────────────────────────────────────
  responsibilities: Extracted<string[]>;
  requirements: Extracted<string[]>;
  preferredQuals: Extracted<string[]>;
  benefits: Extracted<string[]>;

  // ── Pipeline Metadata ────────────────────────────────────────────────────────
  /** Weighted average of all field confidence scores. */
  overallConfidence: number;

  /** True if the job needs LLM enrichment but the LLM gate was closed (budget limit). */
  needsLLMReview: boolean;

  /** Milliseconds taken to parse this job through the full pipeline. */
  processingMs: number;

  /** Semantic version of the pipeline that produced this output. */
  pipelineVersion: string;
}

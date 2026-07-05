/**
 * job-payload.interface.ts
 *
 * Consumer-facing unified job contract.
 *
 * This is the "public shape" of a job as seen by the REST API, frontend, and
 * Elasticsearch index. It is intentionally flatter than ParsedJob (which carries
 * pipeline metadata, confidence scores, and SectionMap internals that callers
 * don't need).
 *
 * Conversion: use `toUnifiedJob(parsed, company, slug)` to map a ParsedJob →
 * IUnifiedJob after the pipeline run completes.
 */

import type { ParsedJob } from "../../../pipeline/interfaces/ParsedJob";
import type { CompanyRow } from "../../../pipeline/interfaces/ATSAdapter";

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * Canonical employment type for a job posting.
 * Mirrors the Prisma `JobType` enum but adds `UNKNOWN` for unclassified postings.
 */
export enum JobType {
  FULL_TIME  = "FULL_TIME",
  PART_TIME  = "PART_TIME",
  INTERNSHIP = "INTERNSHIP",
  CONTRACT   = "CONTRACT",
  ENTRY_LEVEL = "ENTRY_LEVEL",
  FREELANCE  = "FREELANCE",
  UNKNOWN    = "UNKNOWN",
}

/**
 * Work arrangement for a job posting.
 */
export enum WorkMode {
  REMOTE = "REMOTE",
  HYBRID = "HYBRID",
  ONSITE = "ONSITE",
}

// ─── Sub-shapes ───────────────────────────────────────────────────────────────

/** Salary information extracted from the job description. */
export interface IJobSalary {
  min: number;
  max: number | null;
  /** ISO 4217 currency code: "USD", "INR", "EUR", etc. */
  currency: string;
  /** Pay period. "annual" is the default. */
  period: "annual" | "monthly" | "hourly";
}

/** Structured tech stack, decomposed by category. */
export interface IJobTechStack {
  languages: string[];
  frameworks: string[];
  cloud: string[];
  databases: string[];
  devops: string[];
  ai_ml: string[];
  testing: string[];
  other: string[];
}

/** Structured location data for a job. */
export interface IJobLocation {
  /** Original raw location string from the ATS (e.g. "Bengaluru, KA, India (Hybrid)"). */
  raw: string;
  city: string | null;
  state: string | null;
  country: string | null;
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string | null;
  isRemote: boolean;
  isHybrid: boolean;
  isOnsite: boolean;
  /** Countries eligible for remote work, e.g. ["US", "CA"]. */
  remoteCountries: string[];
  /** null = not mentioned. */
  visaSponsorship: boolean | null;
  relocationAssistance: boolean | null;
}

/** Company info embedded in a job payload. */
export interface IJobCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  verified: boolean;
}

// ─── IUnifiedJob ──────────────────────────────────────────────────────────────

/**
 * The unified, consumer-ready job payload.
 *
 * Fields are always present with their zero-value (empty string, empty array,
 * etc.) rather than null/undefined, to simplify frontend rendering logic.
 *
 * The only nullable fields are those that are genuinely optional and meaningful
 * when absent (salary, experienceYears, applicationDeadline).
 */
export interface IUnifiedJob {
  // ── Identity ───────────────────────────────────────────────────────────────
  id: string;
  slug: string;
  /** ATS-namespaced external ID, e.g. "greenhouse-12345678". */
  externalId: string;
  /** Which ATS platform produced this job: "greenhouse" | "lever" | "ashby" | ... */
  sourcePlatform: string;

  // ── Core ───────────────────────────────────────────────────────────────────
  title: string;
  companyName: string;
  company: IJobCompany;

  // ── Classification ─────────────────────────────────────────────────────────
  jobType: JobType;
  workMode: WorkMode;

  /**
   * Confidence score that jobType and workMode were correctly classified (0–1).
   * Values ≥ 0.9 = ATS structured field. 0.7–0.9 = title/desc regex. < 0.7 = fallback.
   */
  classificationConfidence: number;

  // ── Description & Sections ─────────────────────────────────────────────────
  /** Intro / overview paragraph. Empty string if not available. */
  description: string;
  /** Bullet-list array of job responsibilities. */
  responsibilities: string[];
  /** Bullet-list array of hard requirements / qualifications. */
  requirements: string[];
  /** Bullet-list array of nice-to-have / preferred qualifications. */
  preferredQualifications: string[];
  /** Benefits / perks bullet list. */
  benefits: string[];

  // ── Skills ─────────────────────────────────────────────────────────────────
  /** Required skills as a flat string array for filters/badges. */
  skills: string[];
  /** Preferred / nice-to-have skills. */
  preferredSkills: string[];
  /** Decomposed tech stack for category-based filtering. */
  techStack: IJobTechStack;

  // ── Location ───────────────────────────────────────────────────────────────
  /** Raw location string from ATS for display. */
  rawLocation: string;
  /** Fully structured location. */
  location: IJobLocation;
  /** Convenience flag — true if isRemote === true in location. */
  isRemote: boolean;

  // ── Experience ─────────────────────────────────────────────────────────────
  /** Human-readable level: "Internship" | "Entry Level" | "Mid Level" | "Senior" | ... */
  experienceLevel: string;
  experienceMinYears: number | null;
  experienceMaxYears: number | null;

  // ── Compensation ───────────────────────────────────────────────────────────
  salary: IJobSalary | null;

  // ── URLs ───────────────────────────────────────────────────────────────────
  applyUrl: string;
  sourceUrl: string;

  // ── Meta ───────────────────────────────────────────────────────────────────
  /** When the job was first posted on the ATS platform. */
  postedAt: Date | null;
  /** When the pipeline extracted/processed this job. */
  extractedAt: Date;
  /** Overall confidence score of this extraction run (0–1). */
  parserConfidence: number;
  /** True if this job still needs LLM enrichment for low-confidence fields. */
  needsEnrichment: boolean;
  /** Semantic version of the pipeline that produced this job. */
  pipelineVersion: string;
}

// ─── Converter ────────────────────────────────────────────────────────────────

/**
 * Maps a fully-parsed `ParsedJob` + company metadata into an `IUnifiedJob`.
 * Call this after `JobPipeline.process()` returns.
 *
 * @param parsed    Fully-processed ParsedJob from the pipeline
 * @param company   Company row from the DB
 * @param slug      Pre-computed slug from the ATS adapter
 * @param jobId     DB-assigned job ID (after upsert)
 */
export function toUnifiedJob(
  parsed: ParsedJob,
  company: CompanyRow & { logoUrl?: string | null; verified?: boolean },
  slug: string,
  jobId: string,
): IUnifiedJob {
  const loc = parsed.location?.value;
  const salary = parsed.salary?.value;
  const exp = parsed.experience?.value;

  // Map pipeline JobType string → IUnifiedJob JobType enum
  const jobTypeMap: Record<string, JobType> = {
    FULL_TIME:   JobType.FULL_TIME,
    PART_TIME:   JobType.PART_TIME,
    INTERNSHIP:  JobType.INTERNSHIP,
    CONTRACT:    JobType.CONTRACT,
    ENTRY_LEVEL: JobType.ENTRY_LEVEL,
    FREELANCE:   JobType.FREELANCE,
  };
  const jobType = jobTypeMap[parsed.jobType?.value ?? ""] ?? JobType.UNKNOWN;

  // Map WorkMode string → enum
  const workModeMap: Record<string, WorkMode> = {
    REMOTE: WorkMode.REMOTE,
    HYBRID: WorkMode.HYBRID,
    ONSITE: WorkMode.ONSITE,
  };
  const workMode = workModeMap[parsed.workMode?.value ?? ""] ?? WorkMode.ONSITE;

  const location: IJobLocation = loc
    ? {
        raw: loc.raw || "",
        city: loc.city,
        state: loc.state,
        country: loc.country,
        countryCode: loc.countryCode,
        isRemote: loc.isRemote,
        isHybrid: loc.isHybrid,
        isOnsite: loc.isOnsite,
        remoteCountries: loc.remoteCountries ?? [],
        visaSponsorship: loc.visaSponsorship ?? null,
        relocationAssistance: loc.relocationAssistance ?? null,
      }
    : {
        raw: "",
        city: null,
        state: null,
        country: null,
        countryCode: null,
        isRemote: workMode === WorkMode.REMOTE,
        isHybrid: workMode === WorkMode.HYBRID,
        isOnsite: workMode === WorkMode.ONSITE,
        remoteCountries: [],
        visaSponsorship: null,
        relocationAssistance: null,
      };

  const techStack: IJobTechStack = parsed.techStack ?? {
    languages: [],
    frameworks: [],
    cloud: [],
    databases: [],
    devops: [],
    ai_ml: [],
    testing: [],
    other: [],
  };

  return {
    // Identity
    id: jobId,
    slug,
    externalId: parsed.externalId,
    sourcePlatform: parsed.atsSource,

    // Core
    title: parsed.title,
    companyName: company.name,
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl ?? null,
      verified: company.verified ?? false,
    },

    // Classification
    jobType,
    workMode,
    classificationConfidence: Math.min(
      parsed.jobType?.confidence ?? 0.5,
      parsed.workMode?.confidence ?? 0.5,
    ),

    // Description & Sections
    description: parsed.description ?? "",
    responsibilities: parsed.responsibilities?.value ?? [],
    requirements: parsed.requirements?.value ?? [],
    preferredQualifications: parsed.preferredQuals?.value ?? [],
    benefits: parsed.benefits?.value ?? [],

    // Skills
    skills: parsed.requiredSkills?.value?.map((s) => s.name) ?? [],
    preferredSkills: parsed.preferredSkills?.value?.map((s) => s.name) ?? [],
    techStack,

    // Location
    rawLocation: loc?.raw ?? "",
    location,
    isRemote: location.isRemote,

    // Experience
    experienceLevel: exp?.label ?? "Unknown",
    experienceMinYears: exp?.minYears ?? null,
    experienceMaxYears: exp?.maxYears ?? null,

    // Compensation
    salary: salary
      ? {
          min: salary.min,
          max: salary.max ?? null,
          currency: salary.currency,
          period: salary.period,
        }
      : null,

    // URLs
    applyUrl: parsed.applyUrl ?? "",
    sourceUrl: parsed.applyUrl ?? "",

    // Meta
    postedAt: parsed.postedAt,
    extractedAt: new Date(),
    parserConfidence: parsed.overallConfidence,
    needsEnrichment: parsed.needsLLMReview,
    pipelineVersion: parsed.pipelineVersion,
  };
}

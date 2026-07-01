/**
 * ATS Adapter Interface — Plugin Architecture
 *
 * Each ATS provider implements this interface. The ATSAdapterRegistry maps
 * an atsSource string to its adapter at startup. Adding a new ATS provider
 * means creating one new file that implements ATSAdapter — zero changes to
 * the pipeline orchestrator or any other module.
 */

/** All supported ATS sources. Extend this union when adding new ATS providers. */
export type ATSSource =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "bamboohr"
  | "icims"
  | "paylocity"
  | "mock";

/**
 * Normalized raw job input — common shape produced by every ATS adapter.
 * The pipeline only ever sees this shape, never raw ATS payloads.
 */
export interface RawJobInput {
  /** ATS-namespaced unique ID, e.g. "greenhouse-12345678". */
  externalId: string;

  /** Job title from the ATS. */
  title: string;

  /** Raw HTML from the ATS description field. The pipeline will clean this. */
  rawHtml: string;

  /**
   * Pre-cleaned plain text if the ATS provides it (e.g. Lever's descriptionPlain).
   * If provided, used as a fallback when HTML cleaning yields poor results.
   */
  descriptionPlain?: string;

  /** ATS-structured employment type string — Tier-1 job type classification signal. */
  atsEmploymentType?: string | null; // "Intern" | "FullTime" | "Contract" etc.

  /** ATS-provided location string. */
  atsLocation?: string | null;

  /** ATS-provided workplace type. */
  atsWorkplaceType?: string | null; // "remote" | "hybrid" | "on-site"

  /** ATS-provided remote flag (Ashby exposes this as a boolean). */
  atsIsRemote?: boolean | null;

  /** ATS-provided publication/creation timestamp. */
  atsPublishedAt?: Date | null;

  /**
   * Lever-specific: structured list sections from job.lists[].
   * Each entry has a heading (e.g. "Requirements") and HTML content.
   */
  atsLists?: Array<{ heading: string; content: string }>;
}

/**
 * Company data passed to adapters for building slugs and applying fallbacks.
 * Mirrors the CompanyRow shape from the existing scraper.
 */
export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  headquarters: string | null;
  country: string | null;
  websiteUrl: string | null;
  careersPageUrl?: string | null;
  atsToken?: string | null;
  atsSource?: string | null;
}

/**
 * Contract that every ATS adapter must implement.
 * Adapters are responsible for:
 *   1. Fetching raw job listings from the ATS API
 *   2. Filtering to tech/relevant roles
 *   3. Normalizing to RawJobInput[]
 *
 * Adapters must NOT perform any NLP or DB operations.
 */
export interface ATSAdapter {
  /** Discriminator — must match the atsSource column value for this provider. */
  readonly source: ATSSource;

  /**
   * Fetch and normalize raw job listings from this ATS.
   *
   * @param token    The ATS board token/slug for the company.
   * @param company  Company metadata for slug generation and location fallbacks.
   * @returns        Array of normalized RawJobInput objects ready for the pipeline.
   */
  fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]>;
}

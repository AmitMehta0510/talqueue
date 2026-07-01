/**
 * SectionMap — Result of semantic section parsing.
 *
 * A job description is parsed into typed sections.
 * Each section has its original heading text, classified type, confidence
 * score, and decomposed content (bullets + paragraphs).
 */

/** All recognised section types. "unknown" is the catch-all for unclassified headings. */
export type SectionType =
  | "intro"
  | "responsibilities"
  | "requirements"
  | "preferred_qualifications"
  | "benefits"
  | "about_company"
  | "compensation"
  | "about_role"
  | "first_90_days"
  | "tech_stack"
  | "education"
  | "interview_process"
  | "unknown";

/** A single parsed section of a job description. */
export interface Section {
  /** Semantic classification of this section. */
  type: SectionType;

  /** Original heading text (e.g., "What You'll Build", "Your Impact"). */
  heading: string;

  /** Full plain-text body of the section. */
  body: string;

  /**
   * Confidence that the heading was correctly classified.
   * 1.0 = exact keyword match; 0.3-0.7 = token-overlap match; 0.0 = unclassified.
   */
  confidence: number;

  /** All bullet point strings extracted from the section body. */
  bullets: string[];

  /** All paragraph strings extracted from the section body. */
  paragraphs: string[];
}

/**
 * A map from section type to the list of sections that were classified as that type.
 * Multiple sections can share the same type (e.g., two "requirements" blocks).
 */
export type SectionMap = Map<SectionType, Section[]>;

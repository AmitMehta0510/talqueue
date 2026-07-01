import type { ParsedJob } from "../interfaces/ParsedJob";
import type { ExtractionSource } from "../interfaces/ExtractionResult";

export interface FieldScore {
  confidence: number;
  source: ExtractionSource;
  isLowConfidence: boolean;
}

export interface ConfidenceReport {
  /** Weighted aggregate of all field confidence scores (0-1). */
  overall: number;

  /** Per-field breakdown. */
  fields: Record<string, FieldScore>;

  /** True if this job should be routed to the LLM fallback for enrichment. */
  needsLLMReview: boolean;

  /** List of field names that are below their individual thresholds. */
  lowConfidenceFields: string[];
}

// Per-field low-confidence thresholds.
// A field below its threshold counts towards LLM trigger.
const FIELD_THRESHOLDS: Record<string, number> = {
  sections:         0.5, // < 2 distinct sections identified
  skills:           0.4, // < 2 required skills extracted
  experience:       0.45,
  responsibilities: 0.4, // < 3 responsibility bullets
  location:         0.5,
};

// Weights for the weighted-average overall score.
const FIELD_WEIGHTS: Record<string, number> = {
  sections:         0.25,
  skills:           0.35,
  experience:       0.20,
  responsibilities: 0.15,
  location:         0.05,
};

/**
 * ConfidenceScorer — Stage 4 of the extraction pipeline.
 *
 * Aggregates per-field confidence scores into an overall confidence score
 * and determines whether the LLM fallback should be invoked.
 *
 * LLM is triggered when:
 *   - 2 or more fields are below their individual thresholds, OR
 *   - overall weighted confidence is below 0.40
 */
export class ConfidenceScorer {
  score(parsed: Partial<ParsedJob>): ConfidenceReport {
    const fields: Record<string, FieldScore> = {};

    // ── Section detection quality ─────────────────────────────────────────
    const sectionCount = parsed.parsedSections?.size ?? 0;
    const sectionConf = sectionCount === 0 ? 0.05
      : sectionCount >= 4 ? 0.95
      : 0.3 + sectionCount * 0.15;
    fields.sections = {
      confidence: sectionConf,
      source: "semantic",
      isLowConfidence: sectionConf < FIELD_THRESHOLDS.sections,
    };

    // ── Skill extraction quality ──────────────────────────────────────────
    const skillCount = parsed.requiredSkills?.value?.length ?? 0;
    const skillConf = parsed.requiredSkills?.confidence
      ?? (skillCount === 0 ? 0.05 : Math.min(0.95, 0.4 + skillCount * 0.07));
    fields.skills = {
      confidence: skillConf,
      source: parsed.requiredSkills?.source ?? "fallback",
      isLowConfidence: skillConf < FIELD_THRESHOLDS.skills,
    };

    // ── Experience extraction quality ─────────────────────────────────────
    const expConf = parsed.experience?.confidence ?? 0.05;
    fields.experience = {
      confidence: expConf,
      source: parsed.experience?.source ?? "fallback",
      isLowConfidence: expConf < FIELD_THRESHOLDS.experience,
    };

    // ── Responsibilities extraction quality ───────────────────────────────
    const respCount = parsed.responsibilities?.value?.length ?? 0;
    const respConf = respCount === 0 ? 0.05
      : respCount >= 3 ? parsed.responsibilities?.confidence ?? 0.85
      : 0.3 + respCount * 0.1;
    fields.responsibilities = {
      confidence: respConf,
      source: parsed.responsibilities?.source ?? "fallback",
      isLowConfidence: respConf < FIELD_THRESHOLDS.responsibilities,
    };

    // ── Location quality ─────────────────────────────────────────────────
    const locConf = parsed.location?.confidence ?? 0.3;
    fields.location = {
      confidence: locConf,
      source: parsed.location?.source ?? "fallback",
      isLowConfidence: locConf < FIELD_THRESHOLDS.location,
    };

    // ── Overall weighted score ────────────────────────────────────────────
    const overall = Object.entries(FIELD_WEIGHTS).reduce(
      (sum, [field, weight]) => sum + (fields[field]?.confidence ?? 0) * weight,
      0,
    );

    const lowConfidenceFields = Object.entries(fields)
      .filter(([_, score]) => score.isLowConfidence)
      .map(([field]) => field);

    // LLM trigger: 2+ low-confidence fields OR very low overall
    const needsLLMReview =
      lowConfidenceFields.length >= 2 || overall < 0.40;

    return {
      overall: Math.round(overall * 1000) / 1000,
      fields,
      needsLLMReview,
      lowConfidenceFields,
    };
  }
}

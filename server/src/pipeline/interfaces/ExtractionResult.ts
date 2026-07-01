/**
 * Extraction source indicates HOW a value was obtained.
 * Used to drive confidence scoring and audit trails.
 *
 * Priority order (highest → lowest trust):
 *   ats_structured > regex > dictionary > ner > semantic > llm > fallback
 */
export type ExtractionSource =
  | "ats_structured" // Came directly from a structured ATS API field — highest trust
  | "regex" // Deterministic regex match against known patterns
  | "dictionary" // Keyword/dictionary lookup
  | "ner" // NLP entity recognition (pattern-based NER)
  | "semantic" // Embedding-based classification
  | "llm" // LLM-extracted (most expensive, highest accuracy for edge cases)
  | "fallback"; // Default/inferred value — lowest trust

/**
 * Generic wrapper for any extracted field.
 * Every extracted value carries a confidence score (0-1) and provenance.
 *
 * @template T  The type of the extracted value
 */
export interface Extracted<T> {
  /** The extracted value. */
  value: T;

  /**
   * Confidence level: 0.0 (no confidence) to 1.0 (certain).
   * Thresholds:
   *   ≥ 0.9  → High confidence, publish as-is
   *   0.6-0.9 → Medium confidence, acceptable for production
   *   < 0.6  → Low confidence, flag for LLM review
   */
  confidence: number;

  /** How the value was produced. */
  source: ExtractionSource;

  /** The raw substring(s) from the source text that triggered this extraction. */
  raw?: string;
}

import type { SectionMap } from "../interfaces/SectionMap";
import type { EducationRequirement } from "../interfaces/ParsedJob";
import type { Extracted } from "../interfaces/ExtractionResult";

/**
 * EducationExtractor — Stage 3e of the extraction pipeline.
 *
 * Extracts education requirements (degree level + fields) from job descriptions.
 * Most tech jobs have optional or "equivalent experience" education requirements.
 */
export class EducationExtractor {
  private readonly DEGREE_PATTERNS: Array<{
    pattern: RegExp;
    degree: EducationRequirement["degree"];
    isRequired: boolean;
    confidence: number;
  }> = [
    // PhD required
    {
      pattern: /\bph\.?d\.?\s+(?:required|required\s+in|in\s+computer|degree)\b/i,
      degree: "phd",
      isRequired: true,
      confidence: 0.95,
    },
    // PhD preferred
    {
      pattern: /\bph\.?d\.?\s+(?:preferred|desired|is\s+a\s+plus)\b/i,
      degree: "phd",
      isRequired: false,
      confidence: 0.9,
    },
    // Master's required
    {
      pattern:
        /\bmaster(?:'s|s)?\s+degree\s+(?:required|in\s+computer|in\s+engineering)\b/i,
      degree: "masters",
      isRequired: true,
      confidence: 0.9,
    },
    // Master's preferred
    {
      pattern:
        /\bmaster(?:'s|s)?\s+degree\s+(?:preferred|desired|is\s+a\s+plus)\b/i,
      degree: "masters",
      isRequired: false,
      confidence: 0.85,
    },
    // Bachelor's required
    {
      pattern:
        /\b(?:bachelor(?:'s|s)?|b\.?s\.?|b\.?e\.?|b\.?tech\.?)\s+(?:degree\s+)?(?:required|in\s+computer|in\s+engineering|in\s+information)\b/i,
      degree: "bachelors",
      isRequired: true,
      confidence: 0.9,
    },
    // Bachelor's preferred/acceptable
    {
      pattern:
        /\b(?:bachelor(?:'s|s)?|b\.?s\.?|b\.?e\.?|b\.?tech\.?)\s+degree\b/i,
      degree: "bachelors",
      isRequired: false,
      confidence: 0.8,
    },
    // "or equivalent experience" → any degree / experience accepted
    {
      pattern:
        /\b(?:degree\s+or\s+equivalent|or\s+equivalent\s+(?:work\s+)?experience|equivalent\s+practical\s+experience)\b/i,
      degree: "any",
      isRequired: false,
      confidence: 0.85,
    },
    // No degree required
    {
      pattern: /\bno\s+degree\s+(?:required|necessary)\b/i,
      degree: null,
      isRequired: false,
      confidence: 0.95,
    },
  ];

  private readonly FIELDS_PATTERNS = [
    /\b(?:degree|b\.?s\.?|m\.?s\.?|ph\.?d\.?)\s+in\s+((?:computer\s+science|software\s+engineering|computer\s+engineering|information\s+technology|mathematics|physics|electrical\s+engineering|data\s+science|statistics|machine\s+learning|artificial\s+intelligence)(?:\s*,\s*(?:or\s+)?(?:related\s+field|similar\s+field))?)/gi,
    /\b(computer\s+science|software\s+engineering|computer\s+engineering|information\s+technology|electrical\s+engineering|data\s+science|statistics|mathematics|physics)\s+(?:degree|background|major)\b/gi,
  ];

  extract(sections: SectionMap): Extracted<EducationRequirement | null> {
    const reqText = [
      ...(sections.get("requirements") ?? []),
      ...(sections.get("education") ?? []),
    ]
      .map((s) => s.body)
      .join("\n");

    if (!reqText) return { value: null, confidence: 0.5, source: "regex" };

    // Scan for degree patterns
    for (const { pattern, degree, isRequired, confidence } of this.DEGREE_PATTERNS) {
      const m = reqText.match(pattern);
      if (!m) continue;

      // Extract fields of study
      const fields: string[] = [];
      for (const fp of this.FIELDS_PATTERNS) {
        fp.lastIndex = 0;
        let fm: RegExpExecArray | null;
        while ((fm = fp.exec(reqText)) !== null) {
          const field = fm[1].trim().replace(/\s+/g, " ");
          if (field && !fields.includes(field)) fields.push(field);
        }
      }

      return {
        value: { degree, fields, isRequired },
        confidence,
        source: "regex",
        raw: m[0],
      };
    }

    return { value: null, confidence: 0.7, source: "regex" };
  }
}

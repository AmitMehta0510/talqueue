import type { SectionMap } from "../interfaces/SectionMap";
import type { ExperienceRequirement } from "../interfaces/ParsedJob";
import type { Extracted } from "../interfaces/ExtractionResult";

/**
 * ExperienceExtractor — Stage 3b of the extraction pipeline.
 *
 * 3-tier extraction strategy:
 *
 *   Tier 1 — Title signals (confidence 0.95): "Senior", "Staff", "Intern", "Junior"
 *   Tier 2 — Numeric year-range patterns (confidence 0.85): "5+ years", "3-5 years"
 *   Tier 3 — Semantic qualitative signals (confidence 0.55-0.80):
 *             "Strong commercial experience", "Seasoned developer", "Principal IC"
 *
 * Returns a fully-typed ExperienceRequirement with minYears, maxYears, label, and
 * the raw signal strings that drove the classification.
 */
export class ExperienceExtractor {
  // ── Tier 1: Title-level patterns (highest precision) ──────────────────────
  private readonly TITLE_PATTERNS: Array<{
    pattern: RegExp;
    result: Omit<ExperienceRequirement, "signals">;
    confidence: number;
  }> = [
    {
      pattern: /\b(intern|co[-\s]?op|coop|trainee|apprentice|fresher)\b/i,
      result: { minYears: 0, maxYears: 1, label: "Internship" },
      confidence: 0.98,
    },
    {
      pattern: /\b(principal\s+engineer|staff\s+engineer|distinguished\s+engineer|principal\s+IC)\b/i,
      result: { minYears: 8, maxYears: null, label: "Staff / Principal" },
      confidence: 0.97,
    },
    {
      pattern: /\b(director|vp\s+of|head\s+of|chief\s+\w+\s+officer|cto|ceo)\b/i,
      result: { minYears: 10, maxYears: null, label: "Director+" },
      confidence: 0.97,
    },
    {
      pattern:
        /\b(senior\b|lead\s+engineer|lead\s+developer|sse\b|tech\s+lead|sr\.?\s+engineer|senior\s+IC)\b/i,
      result: { minYears: 5, maxYears: null, label: "Senior" },
      confidence: 0.95,
    },
    {
      pattern: /\b(engineer\s+(ii|iii|iv|2|3)|software\s+engineer\s+[234])\b/i,
      result: { minYears: 3, maxYears: 6, label: "Mid Level" },
      confidence: 0.9,
    },
    {
      pattern: /\b(new\s+grad(uate)?|entry[-\s]level|junior\b|associate\s+engineer|graduate\s+(engineer|hire))\b/i,
      result: { minYears: 0, maxYears: 2, label: "Entry Level" },
      confidence: 0.95,
    },
  ];

  // ── Tier 2: Numeric year-range patterns ─────────────────────────────────
  private readonly NUMERIC_PATTERNS: Array<{
    pattern: RegExp;
    extract: (m: RegExpMatchArray) => Omit<ExperienceRequirement, "signals">;
    confidence: number;
  }> = [
    // "5+ years of experience"
    {
      pattern:
        /\b(\d+)\s*\+\s*years?\s+(?:of\s+)?(?:relevant\s+|proven\s+|professional\s+)?(?:experience|exp)\b/i,
      extract: (m) => ({
        minYears: parseInt(m[1]),
        maxYears: null,
        label: this.labelFromMin(parseInt(m[1])),
      }),
      confidence: 0.9,
    },
    // "3-5 years" or "3 to 5 years"
    {
      pattern:
        /\b(\d+)\s*[-–to]\s*(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:experience|exp)\b/i,
      extract: (m) => ({
        minYears: parseInt(m[1]),
        maxYears: parseInt(m[2]),
        label: this.labelFromRange(parseInt(m[1]), parseInt(m[2])),
      }),
      confidence: 0.9,
    },
    // "at least 3 years"
    {
      pattern: /\bat\s+least\s+(\d+)\s+years?\b/i,
      extract: (m) => ({
        minYears: parseInt(m[1]),
        maxYears: null,
        label: this.labelFromMin(parseInt(m[1])),
      }),
      confidence: 0.85,
    },
    // "minimum 5 years"
    {
      pattern: /\bminimum\s+(?:of\s+)?(\d+)\s+years?\b/i,
      extract: (m) => ({
        minYears: parseInt(m[1]),
        maxYears: null,
        label: this.labelFromMin(parseInt(m[1])),
      }),
      confidence: 0.85,
    },
    // "5 years of experience" (no + sign)
    {
      pattern:
        /\b(\d+)\s+years?\s+(?:of\s+)?(?:relevant\s+|professional\s+)?(?:experience|exp)\b/i,
      extract: (m) => ({
        minYears: parseInt(m[1]),
        maxYears: null,
        label: this.labelFromMin(parseInt(m[1])),
      }),
      confidence: 0.8,
    },
    // Written-out: "five years"
    {
      pattern:
        /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\s+(?:of\s+)?experience\b/i,
      extract: (m) => {
        const wordMap: Record<string, number> = {
          one: 1, two: 2, three: 3, four: 4, five: 5,
          six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        };
        const years = wordMap[m[1].toLowerCase()] ?? 3;
        return { minYears: years, maxYears: null, label: this.labelFromMin(years) };
      },
      confidence: 0.8,
    },
    // "0-1 years / 0-2 years"
    {
      pattern: /\b(0|zero)\s*[-–]\s*([12])\s+years?\b/i,
      extract: (m) => ({
        minYears: 0,
        maxYears: parseInt(m[2]),
        label: "Entry Level",
      }),
      confidence: 0.9,
    },
  ];

  // ── Tier 3: Semantic qualitative signals ──────────────────────────────────
  private readonly SEMANTIC_SIGNALS: Array<{
    pattern: RegExp;
    result: Omit<ExperienceRequirement, "signals">;
    confidence: number;
  }> = [
    {
      pattern:
        /\b(strong\s+commercial|extensive|seasoned|proven|deep)\s+(?:\w+\s+)?(?:backend|frontend|engineering|software|technical)\s+experience\b/i,
      result: { minYears: 4, maxYears: null, label: "Mid Level" },
      confidence: 0.7,
    },
    {
      pattern: /\bsenior\s+(?:individual\s+contributor|IC)\b/i,
      result: { minYears: 5, maxYears: null, label: "Senior" },
      confidence: 0.85,
    },
    {
      pattern: /\bprincipal\s+(?:individual\s+contributor|IC|engineer)\b/i,
      result: { minYears: 8, maxYears: null, label: "Staff / Principal" },
      confidence: 0.9,
    },
    {
      pattern: /\bindustry\s+experience\b/i,
      result: { minYears: 2, maxYears: null, label: "Mid Level" },
      confidence: 0.55,
    },
    {
      pattern:
        /\bno\s+(?:prior\s+)?(?:work\s+)?experience\s+(?:required|needed|necessary)\b/i,
      result: { minYears: 0, maxYears: 0, label: "Entry Level" },
      confidence: 0.95,
    },
    {
      pattern: /\bfreshers?\s+(?:welcome|encouraged|eligible|may\s+apply)\b/i,
      result: { minYears: 0, maxYears: 1, label: "Entry Level" },
      confidence: 0.95,
    },
    {
      pattern: /\brecent\s+graduate(?:s)?\b/i,
      result: { minYears: 0, maxYears: 1, label: "Entry Level" },
      confidence: 0.9,
    },
    {
      pattern: /\bexperienced\s+(?:engineer|developer|professional)\b/i,
      result: { minYears: 3, maxYears: null, label: "Mid Level" },
      confidence: 0.6,
    },
    {
      pattern: /\bseasoned\s+(?:engineer|developer|professional|veteran)\b/i,
      result: { minYears: 7, maxYears: null, label: "Senior" },
      confidence: 0.75,
    },
  ];

  /**
   * Extract experience requirement from title + parsed sections.
   * Returns the highest-confidence match found across all tiers.
   */
  extract(title: string, sections: SectionMap): Extracted<ExperienceRequirement> {
    const signals: string[] = [];
    let best: Omit<ExperienceRequirement, "signals"> | null = null;
    let confidence = 0;

    // ── Tier 1: Title patterns ─────────────────────────────────────────────
    for (const { pattern, result, confidence: c } of this.TITLE_PATTERNS) {
      const m = title.match(pattern);
      if (m) {
        signals.push(m[0]);
        if (c > confidence) { best = result; confidence = c; }
        break; // Title is unambiguous — first match wins
      }
    }

    // Build search corpus from requirements section (most reliable)
    const reqText = this.getSectionText(sections, ["requirements", "about_role"]);
    const fullSearchText = `${reqText}\n${title}`;

    // ── Tier 2: Numeric year patterns ─────────────────────────────────────
    for (const { pattern, extract, confidence: c } of this.NUMERIC_PATTERNS) {
      const m = fullSearchText.match(pattern);
      if (m) {
        const extracted = extract(m);
        signals.push(m[0]);
        // Only override Tier 1 if numeric confidence is higher
        if (c > confidence) { best = extracted; confidence = c; }
      }
    }

    // ── Tier 3: Semantic qualitative signals ──────────────────────────────
    if (confidence < 0.6) {
      for (const { pattern, result, confidence: c } of this.SEMANTIC_SIGNALS) {
        const m = fullSearchText.match(pattern);
        if (m) {
          signals.push(m[0]);
          if (c > confidence) { best = result; confidence = c; }
        }
      }
    }

    if (!best) {
      return {
        value: { minYears: null, maxYears: null, label: "Unknown", signals: [] },
        confidence: 0,
        source: "fallback",
      };
    }

    return {
      value: { ...best, signals },
      confidence,
      source: confidence >= 0.85 ? "regex"
        : confidence >= 0.6 ? "semantic"
        : "fallback",
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private labelFromMin(years: number): string {
    if (years === 0) return "Entry Level";
    if (years <= 2) return "Entry Level";
    if (years <= 4) return "Mid Level";
    if (years <= 7) return "Senior";
    return "Staff / Principal";
  }

  private labelFromRange(min: number, max: number): string {
    return this.labelFromMin(Math.round((min + max) / 2));
  }

  private getSectionText(sections: SectionMap, types: string[]): string {
    return types
      .flatMap((t) => sections.get(t as any)?.map((s) => s.body) ?? [])
      .join("\n");
  }
}

import type { SectionMap } from "../interfaces/SectionMap";
import type { Extracted } from "../interfaces/ExtractionResult";

/**
 * BenefitsExtractor — Stage 3f of the extraction pipeline.
 *
 * Extracts benefits and perks as a structured list of strings.
 * Sources: benefits/perks sections → bullet extraction + paragraph parsing.
 */
export class BenefitsExtractor {
  extract(sections: SectionMap): Extracted<string[]> {
    const benefitSections = [
      ...(sections.get("benefits") ?? []),
    ];

    if (!benefitSections.length) {
      return { value: [], confidence: 0.5, source: "semantic" };
    }

    const bullets: string[] = [];
    for (const section of benefitSections) {
      bullets.push(...section.bullets);
      // Also pull from paragraphs when no bullets
      if (section.bullets.length === 0) {
        bullets.push(...section.paragraphs.slice(0, 5));
      }
    }

    // Clean and deduplicate
    const cleaned = [...new Set(
      bullets
        .map((b) => b.trim().replace(/^[•\-\*▸▶◆○●]\s*/, ""))
        .filter((b) => b.length >= 5 && b.length <= 200),
    )];

    return {
      value: cleaned.slice(0, 20),
      confidence: cleaned.length > 0 ? 0.85 : 0.3,
      source: "semantic",
    };
  }
}

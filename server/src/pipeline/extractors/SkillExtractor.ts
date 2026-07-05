import type { SectionMap } from "../interfaces/SectionMap";
import type { CategorizedSkill, TechStack, SkillCategory } from "../interfaces/ParsedJob";
import type { Extracted } from "../interfaces/ExtractionResult";
import { normalizeSkill, SKILL_CATEGORIES } from "./SkillNormalizer";
import { HtmlCleaner } from "../cleaner/HtmlCleaner";
import { BoundarySkillMatcher } from "./BoundarySkillMatcher";

/**
 * SkillExtractor — Stage 3a of the extraction pipeline.
 *
 * Extracts skills using NER-style pattern matching (not dictionary-first lookup).
 * Skills are discovered dynamically from text context patterns, then normalized
 * to canonical names via SkillNormalizer. This allows detection of technologies
 * not in the dictionary (they are preserved as-is from the source text).
 *
 * Priority order:
 *   1. Structured ATS lists (Lever atsLists)
 *   2. Requirements section → required skills
 *   3. Tech stack / preferred sections → preferred skills
 *   4. Title corpus for always-relevant skills
 *   5. Full description as fallback
 *
 * De-duplication: a skill appearing in both required and preferred is promoted to required only.
 */
export class SkillExtractor {
  private readonly boundaryMatcher = new BoundarySkillMatcher();
  // ── Context-based NER patterns ──────────────────────────────────────────────
  // These match "experience with X", "proficient in X", "knowledge of X" etc.
  // The capture group is the candidate technology name.
  private readonly CONTEXT_PATTERNS = [
    // "experience with React, Node.js"
    /\bexperience\s+(?:with|in|using)\s+([\w\s.+#\-/]{2,35}?)(?:\s*[,;\n]|$)/gi,
    // "proficient in TypeScript"
    /\bprofici(?:ent|ency)\s+in\s+([\w\s.+#\-/]{2,35}?)(?:\s*[,;\n]|$)/gi,
    // "knowledge of Kubernetes"
    /\bknowledge\s+of\s+([\w\s.+#\-/]{2,35}?)(?:\s*[,;\n]|$)/gi,
    // "familiarity with gRPC"
    /\bfamiliarity\s+with\s+([\w\s.+#\-/]{2,35}?)(?:\s*[,;\n]|$)/gi,
    // "expertise in LangGraph"
    /\bexpertise\s+in\s+([\w\s.+#\-/]{2,35}?)(?:\s*[,;\n]|$)/gi,
    // "understanding of Kafka"
    /\bunderstanding\s+of\s+([\w\s.+#\-/]{2,35}?)(?:\s*[,;\n]|$)/gi,
    // "working with Terraform"
    /\bworking\s+with\s+([\w\s.+#\-/]{2,35}?)(?:\s*[,;\n]|$)/gi,
    // "hands-on X experience"
    /\bhands[-\s]on\s+([\w\s.+#\-/]{2,35?}?)\s+experience\b/gi,
    // "using X" in context
    /\busing\s+([\w\s.+#\-/]{2,35}?)(?:\s*(?:to|for|and|,|\n)|$)/gi,
  ];

  // ── Comma-list extraction patterns ─────────────────────────────────────────
  // Matches "React, Node.js, TypeScript" style inline tech lists
  private readonly LIST_PATTERN =
    /(?:^|\n)\s*[•\-\*▸▶◆○●]\s*([\w\s.+#\-/,]{3,120}?)(?:\n|$)/gm;

  // ── Technologies with word-boundary safe mentions ─────────────────────────
  // These need special handling because they're common words that could false-positive.
  // Only match these if they appear in a clearly technical context.
  private readonly EXACT_TECH_PATTERNS: Array<{
    pattern: RegExp;
    canonical: string;
    category: SkillCategory;
  }> = [
    // "Go" — must be preceded by "written in" or "using" to avoid false positives
    {
      pattern: /\b(?:written in|using|with|knowledge of)\s+Go\b/i,
      canonical: "Go",
      category: "Languages",
    },
    // "R" language — very ambiguous, only match "R programming" or "R language"
    {
      pattern: /\bR\s+(?:programming|language)\b/i,
      canonical: "R",
      category: "Languages",
    },
    // "C" language
    {
      pattern: /\bC\s+(?:programming|language)\b|\bprogramming\s+in\s+C\b/i,
      canonical: "C",
      category: "Languages",
    },
  ];

  // ── Skills that should never be included (soft skills, non-tech terms) ─────
  private readonly EXCLUDE_LIST = new Set([
    "communication", "leadership", "teamwork", "collaboration", "problem solving",
    "analytical", "critical thinking", "attention to detail", "time management",
    "ownership", "initiative", "adaptability", "motivated", "passionate",
    "experience", "skills", "years", "ability", "knowledge", "background",
    "development", "engineering", "software", "systems", "services",
    "team player", "self starter", "fast learner",
  ]);

  /**
   * Extract required and preferred skills from parsed sections + title.
   */
  extract(
    sections: SectionMap,
    title: string,
    atsLists?: Array<{ heading: string; content: string }>,
  ): {
    required: Extracted<CategorizedSkill[]>;
    preferred: Extracted<CategorizedSkill[]>;
    techStack: TechStack;
  } {
    // ── Collect text corpora per bucket ──────────────────────────────────────
    const reqText = this.getSectionText(sections, [
      "requirements",
      "tech_stack",
    ]);
    const prefText = this.getSectionText(sections, ["preferred_qualifications"]);
    const respText = this.getSectionText(sections, ["responsibilities"]);
    const introText = this.getSectionText(sections, ["intro", "about_role"]);

    // ── ATS-structured lists override section parsing (highest confidence) ─
    let structuredRequired: string[] = [];
    let structuredPreferred: string[] = [];
    if (atsLists?.length) {
      for (const item of atsLists) {
        const h = item.heading.toLowerCase();
        const content = item.content;
        if (h.includes("require") || h.includes("qualif") || h.includes("skill")) {
          structuredRequired.push(content);
        } else if (h.includes("prefer") || h.includes("nice") || h.includes("bonus")) {
          structuredPreferred.push(content);
        }
      }
    }

    // ── Extract candidates from each corpus ──────────────────────────────────
    const requiredCandidates = this.extractFromText(
      [structuredRequired.join("\n"), reqText, title].join("\n"),
    );
    const preferredCandidates = this.extractFromText(
      [structuredPreferred.join("\n"), prefText].join("\n"),
    );
    const contextCandidates = this.extractFromText([respText, introText].join("\n"));

    // ── Build required set (deduplicated) ────────────────────────────────────
    const requiredMap = new Map<string, CategorizedSkill>();
    for (const skill of [...requiredCandidates, ...contextCandidates]) {
      if (!requiredMap.has(skill.name)) {
        requiredMap.set(skill.name, { ...skill, isRequired: true });
      }
    }

    // ── Build preferred set (skills not in required) ─────────────────────────
    const preferredMap = new Map<string, CategorizedSkill>();
    for (const skill of preferredCandidates) {
      if (!requiredMap.has(skill.name)) {
        preferredMap.set(skill.name, { ...skill, isRequired: false });
      }
    }

    // ── Apply exact-match tech patterns on full text ──────────────────────────
    const fullText = [reqText, prefText, respText, introText, title].join(" ");
    for (const { pattern, canonical, category } of this.EXACT_TECH_PATTERNS) {
      if (pattern.test(fullText) && !requiredMap.has(canonical)) {
        requiredMap.set(canonical, {
          name: canonical,
          raw: canonical,
          category,
          isRequired: true,
          confidence: 0.8,
        });
      }
    }

    // ── BoundarySkillMatcher: fast-path regex pass ──────────────────────────
    // Catches skills mentioned as bare bullets / comma lists without context verbs.
    // Results are merged into required (not preferred) with high confidence.
    const boundaryMatches = this.boundaryMatcher.match(fullText);
    for (const match of boundaryMatches) {
      if (!requiredMap.has(match.canonical)) {
        requiredMap.set(match.canonical, {
          name: match.canonical,
          raw: match.raw,
          category: match.category,
          isRequired: true,
          confidence: match.confidence,
        });
      }
    }

    const required = [...requiredMap.values()];
    const preferred = [...preferredMap.values()];

    // ── Confidence for the overall extraction ────────────────────────────────
    const reqConfidence = required.length === 0 ? 0.1
      : required.length >= 5 ? 0.9
      : 0.5 + required.length * 0.08;

    const prefConfidence = preferred.length === 0 ? 0.5 : 0.8;

    return {
      required: {
        value: required,
        confidence: reqConfidence,
        source: structuredRequired.length ? "ats_structured" : "ner",
      },
      preferred: {
        value: preferred,
        confidence: prefConfidence,
        source: structuredPreferred.length ? "ats_structured" : "ner",
      },
      techStack: this.buildTechStack([...required, ...preferred]),
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  private extractFromText(text: string): CategorizedSkill[] {
    if (!text?.trim()) return [];

    const candidates = new Set<string>();

    // 1. Context-based NER patterns
    for (const pattern of this.CONTEXT_PATTERNS) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const raw = m[1].trim();
        // Split comma-separated items within a single match
        for (const part of raw.split(/[,/]+/)) {
          const trimmed = part.trim();
          if (trimmed.length >= 2 && trimmed.length <= 40) {
            candidates.add(trimmed);
          }
        }
      }
    }

    // 2. Bullet-point list extraction (• React, Node.js, TypeScript)
    this.LIST_PATTERN.lastIndex = 0;
    let listMatch: RegExpExecArray | null;
    while ((listMatch = this.LIST_PATTERN.exec(text)) !== null) {
      const listContent = listMatch[1];
      // If bullet contains commas, it's likely a technology list
      if (listContent.includes(",")) {
        for (const part of listContent.split(/[,;]+/)) {
          const trimmed = part.trim();
          if (trimmed.length >= 2 && trimmed.length <= 40) {
            candidates.add(trimmed);
          }
        }
      } else {
        candidates.add(listContent.trim());
      }
    }

    // 3. Normalize and categorize candidates
    const skills: CategorizedSkill[] = [];
    const seen = new Set<string>();

    for (const raw of candidates) {
      const canonical = normalizeSkill(raw);
      if (!canonical) continue;

      const lowerCanonical = canonical.toLowerCase();
      if (seen.has(lowerCanonical)) continue;
      if (this.EXCLUDE_LIST.has(lowerCanonical)) continue;

      seen.add(lowerCanonical);

      const category: SkillCategory = SKILL_CATEGORIES[canonical] || "Other";
      const isKnown = Boolean(SKILL_CATEGORIES[canonical]);

      skills.push({
        name: canonical,
        raw,
        category,
        isRequired: true, // caller overrides
        confidence: isKnown ? 0.9 : 0.65,
      });
    }

    return skills;
  }

  private getSectionText(sections: SectionMap, types: string[]): string {
    const parts: string[] = [];
    for (const type of types) {
      const sectionList = sections.get(type as any);
      if (sectionList) {
        for (const section of sectionList) {
          parts.push(section.body);
        }
      }
    }
    return parts.join("\n");
  }

  private buildTechStack(skills: CategorizedSkill[]): TechStack {
    const stack: TechStack = {
      languages: [],
      frameworks: [],
      cloud: [],
      databases: [],
      devops: [],
      ai_ml: [],
      observability: [],
      testing: [],
      other: [],
    };

    for (const skill of skills) {
      switch (skill.category) {
        case "Languages": stack.languages.push(skill.name); break;
        case "Frameworks":
        case "Frontend":
        case "Backend": stack.frameworks.push(skill.name); break;
        case "Cloud": stack.cloud.push(skill.name); break;
        case "Databases":
        case "Caching": stack.databases.push(skill.name); break;
        case "DevOps":
        case "Infrastructure":
        case "CI_CD": stack.devops.push(skill.name); break;
        case "AI_ML": stack.ai_ml.push(skill.name); break;
        case "Observability": stack.observability.push(skill.name); break;
        case "Testing": stack.testing.push(skill.name); break;
        default: stack.other.push(skill.name); break;
      }
    }

    // Deduplicate each category
    for (const key of Object.keys(stack) as (keyof TechStack)[]) {
      stack[key] = [...new Set(stack[key])];
    }

    return stack;
  }
}

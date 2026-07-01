import type { ParsedJob, TechStack } from "./interfaces/ParsedJob";
import type { RawJobInput } from "./interfaces/ATSAdapter";
import type { SectionMap } from "./interfaces/SectionMap";

import { HtmlCleaner } from "./cleaner/HtmlCleaner";
import { SemanticSectionParser } from "./section-parser/SemanticSectionParser";
import { SkillExtractor } from "./extractors/SkillExtractor";
import { ExperienceExtractor } from "./extractors/ExperienceExtractor";
import { SalaryExtractor } from "./extractors/SalaryExtractor";
import { LocationExtractor } from "./extractors/LocationExtractor";
import { EducationExtractor } from "./extractors/EducationExtractor";
import { BenefitsExtractor } from "./extractors/BenefitsExtractor";
import { ConfidenceScorer } from "./confidence/ConfidenceScorer";
import { LLMFallbackGate } from "./llm/LLMFallbackGate";

export interface JobPipelineOptions {
  /** Enable LLM fallback. Default: true if OPENAI_API_KEY or ANTHROPIC_API_KEY is set. */
  enableLLM?: boolean;

  /** Daily LLM call limit. Default: 500 */
  llmDailyLimit?: number;

  /** Pipeline version string. Default: "2.0.0" */
  version?: string;
}

/**
 * JobPipeline — Main orchestrator for the extraction pipeline.
 *
 * Composes all extraction modules into a single sequential pipeline:
 *
 *   RawJobInput
 *     → HtmlCleaner          (DOM-based HTML cleaning)
 *     → SemanticSectionParser (Tier-A/B heading classification)
 *     → [parallel extractors]
 *         SkillExtractor      (NER + normalization)
 *         ExperienceExtractor (3-tier: title / numeric / semantic)
 *         SalaryExtractor     (multi-currency regex)
 *         LocationExtractor   (structured city/state/country)
 *         EducationExtractor  (degree + fields)
 *         BenefitsExtractor   (bullet list extraction)
 *     → ConfidenceScorer      (per-field + overall score)
 *     → LLMFallbackGate       (cost-gated enhancement)
 *     → ParsedJob
 */
export class JobPipeline {
  private readonly cleaner: HtmlCleaner;
  private readonly sectionParser: SemanticSectionParser;
  private readonly skillExtractor: SkillExtractor;
  private readonly experienceExtractor: ExperienceExtractor;
  private readonly salaryExtractor: SalaryExtractor;
  private readonly locationExtractor: LocationExtractor;
  private readonly educationExtractor: EducationExtractor;
  private readonly benefitsExtractor: BenefitsExtractor;
  private readonly confidenceScorer: ConfidenceScorer;
  private readonly llmGate: LLMFallbackGate;
  private readonly version: string;

  constructor(options: JobPipelineOptions = {}) {
    this.cleaner = new HtmlCleaner();
    this.sectionParser = new SemanticSectionParser();
    this.skillExtractor = new SkillExtractor();
    this.experienceExtractor = new ExperienceExtractor();
    this.salaryExtractor = new SalaryExtractor();
    this.locationExtractor = new LocationExtractor();
    this.educationExtractor = new EducationExtractor();
    this.benefitsExtractor = new BenefitsExtractor();
    this.confidenceScorer = new ConfidenceScorer();
    this.version = options.version ?? "2.0.0";

    const enableLLM =
      options.enableLLM ??
      Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

    this.llmGate = new LLMFallbackGate({
      dailyLimit: options.llmDailyLimit ?? 500,
      apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
      provider: process.env.OPENAI_API_KEY ? "openai" : "anthropic",
    });

    if (!enableLLM) {
      // Seal the gate — always returns false from isOpen()
      Object.defineProperty(this.llmGate, "isOpen", { value: () => false });
    }
  }

  /**
   * Process a single RawJobInput through the full extraction pipeline.
   * Returns a ParsedJob with all structured fields and confidence scores.
   */
  async process(input: RawJobInput): Promise<ParsedJob> {
    const start = Date.now();

    // ── Stage 1: HTML Cleaning ───────────────────────────────────────────────
    const { plainText, normalizedText, $ } = this.cleaner.clean(input.rawHtml);

    // Use ATS-provided plain text as corpus supplement if available and richer
    const enrichedText =
      input.descriptionPlain && input.descriptionPlain.length > plainText.length
        ? input.descriptionPlain
        : plainText;

    // ── Stage 2: Semantic Section Parsing ────────────────────────────────────
    const parsedSections: SectionMap = this.sectionParser.parse($, enrichedText);

    // ── Stage 3: Parallel Extraction ─────────────────────────────────────────
    const [skills, experience, salary, location, education, benefits] = await Promise.all([
      Promise.resolve(
        this.skillExtractor.extract(parsedSections, input.title, input.atsLists),
      ),
      Promise.resolve(this.experienceExtractor.extract(input.title, parsedSections)),
      Promise.resolve(this.salaryExtractor.extract(parsedSections, enrichedText)),
      Promise.resolve(
        this.locationExtractor.extract(input.atsLocation, enrichedText),
      ),
      Promise.resolve(this.educationExtractor.extract(parsedSections)),
      Promise.resolve(this.benefitsExtractor.extract(parsedSections)),
    ]);

    // ── Extract responsibilities + requirements as string arrays ──────────────
    const responsibilitiesList = this.extractBulletList(parsedSections, [
      "responsibilities",
    ]);
    const requirementsList = this.extractBulletList(parsedSections, [
      "requirements",
    ]);
    const preferredQualsList = this.extractBulletList(parsedSections, [
      "preferred_qualifications",
    ]);

    // ── Job type classification ───────────────────────────────────────────────
    const jobType = this.classifyJobType(
      input.title,
      enrichedText,
      input.atsEmploymentType,
    );

    // ── Work mode resolution ─────────────────────────────────────────────────
    const workMode = this.resolveWorkMode(
      input.atsWorkplaceType,
      input.atsIsRemote,
      location.value,
    );

    // ── Build intro/description ───────────────────────────────────────────────
    const description = this.buildDescription(parsedSections, enrichedText);

    // ── Assemble partial result ───────────────────────────────────────────────
    const partial: Partial<ParsedJob> = {
      externalId: input.externalId,
      atsSource: (input as any)._atsSource || "",
      applyUrl: (input as any)._applyUrl || "",
      postedAt: input.atsPublishedAt,
      rawHtml: input.rawHtml,
      plainText,
      normalizedText,
      parsedSections,
      title: input.title,
      description,
      jobType,
      workMode: {
        value: workMode,
        confidence: input.atsWorkplaceType || input.atsIsRemote !== null ? 0.95 : 0.75,
        source:
          input.atsWorkplaceType || input.atsIsRemote !== null
            ? "ats_structured"
            : "regex",
      },
      requiredSkills: skills.required,
      preferredSkills: skills.preferred,
      techStack: skills.techStack,
      experience,
      salary,
      location,
      education,
      responsibilities: {
        value: responsibilitiesList,
        confidence: responsibilitiesList.length >= 3 ? 0.85 : 0.3,
        source: "semantic",
      },
      requirements: {
        value: requirementsList,
        confidence: requirementsList.length >= 2 ? 0.85 : 0.3,
        source: "semantic",
      },
      preferredQuals: {
        value: preferredQualsList,
        confidence: preferredQualsList.length > 0 ? 0.8 : 0.5,
        source: "semantic",
      },
      benefits: {
        value: benefits.value,
        confidence: benefits.confidence,
        source: benefits.source,
      },
    };

    // ── Stage 4: Confidence Scoring ──────────────────────────────────────────
    const report = this.confidenceScorer.score(partial);

    // ── Stage 5: LLM Fallback (cost-gated) ───────────────────────────────────
    const enhanced = await this.llmGate.enhance(partial, report, enrichedText);

    // ── Stage 6: Re-score after LLM enhancement ───────────────────────────────
    const finalReport = this.confidenceScorer.score(enhanced);

    const processingMs = Date.now() - start;

    return {
      ...enhanced,
      overallConfidence: finalReport.overall,
      needsLLMReview: report.needsLLMReview && !this.llmGate.isOpen(report),
      processingMs,
      pipelineVersion: this.version,
    } as ParsedJob;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private extractBulletList(sections: SectionMap, types: string[]): string[] {
    const bullets: string[] = [];
    for (const type of types) {
      const sectionList = sections.get(type as any);
      if (!sectionList) continue;
      for (const section of sectionList) {
        bullets.push(...section.bullets);
        // Fallback to paragraphs when no bullets
        if (section.bullets.length === 0) {
          bullets.push(
            ...section.paragraphs
              .filter((p) => p.length >= 20 && p.length <= 300)
              .slice(0, 5),
          );
        }
      }
    }
    return [...new Set(bullets)].slice(0, 20);
  }

  private buildDescription(sections: SectionMap, plainText: string): string {
    const introSections = sections.get("intro") || sections.get("about_role") || [];
    if (introSections.length) {
      return introSections[0].body.slice(0, 1500);
    }
    return plainText.slice(0, 800);
  }

  private classifyJobType(
    title: string,
    description: string,
    atsEmploymentType?: string | null,
  ): { value: string; confidence: number; source: any } {
    // Tier 1: ATS structured field
    if (atsEmploymentType) {
      const e = atsEmploymentType.toLowerCase();
      if (e === "internship" || e === "intern")
        return { value: "INTERNSHIP", confidence: 1.0, source: "ats_structured" };
      if (e === "part-time" || e === "parttime")
        return { value: "PART_TIME", confidence: 1.0, source: "ats_structured" };
      if (e === "contract" || e === "temporary")
        return { value: "CONTRACT", confidence: 1.0, source: "ats_structured" };
      if (e === "full-time" || e === "fulltime")
        return { value: "FULL_TIME", confidence: 1.0, source: "ats_structured" };
    }

    const t = title.toLowerCase();

    // Tier 2: title regex
    if (/\bintern(ship)?\b/i.test(t)) return { value: "INTERNSHIP", confidence: 0.97, source: "regex" };
    if (/\bco[-\s]?op\b/i.test(t))   return { value: "INTERNSHIP", confidence: 0.97, source: "regex" };
    if (/\btraineeship\b/i.test(t))   return { value: "INTERNSHIP", confidence: 0.95, source: "regex" };
    if (/\bapprentice(ship)?\b/i.test(t)) return { value: "INTERNSHIP", confidence: 0.95, source: "regex" };
    if (/\bfresher\b/i.test(t))       return { value: "ENTRY_LEVEL", confidence: 0.95, source: "regex" };
    if (/\bnew\s+grad(uate)?\b/i.test(t)) return { value: "ENTRY_LEVEL", confidence: 0.95, source: "regex" };
    if (/\bentry[-\s]level\b/i.test(t)) return { value: "ENTRY_LEVEL", confidence: 0.95, source: "regex" };
    if (/\bcontract(or)?\b/i.test(t)) return { value: "CONTRACT", confidence: 0.9, source: "regex" };
    if (/\bpart[-\s]time\b/i.test(t)) return { value: "PART_TIME", confidence: 0.95, source: "regex" };
    if (/\bfreelance\b/i.test(t))     return { value: "FREELANCE", confidence: 0.95, source: "regex" };

    // Tier 3: description scan
    const descSample = description.slice(0, 800);
    if (/\b(stipend|paid\s+intern|summer\s+internship|internship\s+program)\b/i.test(descSample)) {
      return { value: "INTERNSHIP", confidence: 0.8, source: "regex" };
    }

    return { value: "FULL_TIME", confidence: 0.7, source: "fallback" };
  }

  private resolveWorkMode(
    atsWorkplaceType?: string | null,
    atsIsRemote?: boolean | null,
    location?: { isRemote: boolean; isHybrid: boolean },
  ): string {
    // ATS-structured signals (highest trust)
    if (atsIsRemote === true) return "REMOTE";
    if (atsWorkplaceType) {
      const w = atsWorkplaceType.toLowerCase();
      if (w.includes("remote")) return "REMOTE";
      if (w.includes("hybrid")) return "HYBRID";
      if (w.includes("on-site") || w.includes("onsite") || w.includes("office")) return "ONSITE";
    }
    // Location-derived
    if (location?.isRemote) return "REMOTE";
    if (location?.isHybrid) return "HYBRID";
    return "ONSITE";
  }

  /** Current LLM usage for monitoring. */
  get llmDailyUsage(): number {
    return this.llmGate.currentDailyUsage;
  }
}

// ── Singleton factory ──────────────────────────────────────────────────────────
// Use this to share a single pipeline instance across the scraper.
let _pipeline: JobPipeline | null = null;

export function getJobPipeline(options?: JobPipelineOptions): JobPipeline {
  if (!_pipeline) {
    _pipeline = new JobPipeline(options);
  }
  return _pipeline;
}

/**
 * Pipeline barrel export.
 * Import everything from "@/pipeline" for clean usage.
 */

// Orchestrator
export { JobPipeline, getJobPipeline } from "./JobPipeline";
export type { JobPipelineOptions } from "./JobPipeline";

// Interfaces
export type { ParsedJob, CategorizedSkill, TechStack, SkillCategory, ExperienceRequirement, SalaryRange, StructuredLocation, EducationRequirement } from "./interfaces/ParsedJob";
export type { SectionMap, Section, SectionType } from "./interfaces/SectionMap";
export type { Extracted, ExtractionSource } from "./interfaces/ExtractionResult";
export type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "./interfaces/ATSAdapter";

// Adapters
export { ATSAdapterRegistry } from "./adapters/ATSAdapterRegistry";
export { GreenhouseAdapter } from "./adapters/GreenhouseAdapter";
export { LeverAdapter } from "./adapters/LeverAdapter";
export { AshbyAdapter } from "./adapters/AshbyAdapter";
export { WorkdayAdapter } from "./adapters/WorkdayAdapter";
export { BambooHRAdapter } from "./adapters/BambooHRAdapter";
export { ICIMSAdapter } from "./adapters/ICIMSAdapter";
export { PaylocityAdapter } from "./adapters/PaylocityAdapter";

// Extractors (for unit testing)
export { SkillExtractor } from "./extractors/SkillExtractor";
export { ExperienceExtractor } from "./extractors/ExperienceExtractor";
export { SalaryExtractor } from "./extractors/SalaryExtractor";
export { LocationExtractor } from "./extractors/LocationExtractor";
export { EducationExtractor } from "./extractors/EducationExtractor";
export { BenefitsExtractor } from "./extractors/BenefitsExtractor";
export { normalizeSkill } from "./extractors/SkillNormalizer";

// Confidence
export { ConfidenceScorer } from "./confidence/ConfidenceScorer";
export type { ConfidenceReport, FieldScore } from "./confidence/ConfidenceScorer";

// LLM Gate
export { LLMFallbackGate } from "./llm/LLMFallbackGate";

// Utilities
export { isTechOrInternRole } from "./utils/roleFilter";

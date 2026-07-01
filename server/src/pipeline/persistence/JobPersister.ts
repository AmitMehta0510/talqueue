import type { ParsedJob } from "../interfaces/ParsedJob";
import type { CompanyRow } from "../interfaces/ATSAdapter";
import prisma from "shared/database/prisma";
import { Prisma } from "@prisma/client";
import { syncJobToElastic } from "../../services/elasticSync";

/**
 * JobPersister — Stage 7 of the extraction pipeline.
 *
 * Maps a ParsedJob to a Prisma upsert call.
 * Preserves backward-compatible v1 fields while adding all v2 structured fields.
 * Triggers Elasticsearch sync after successful persistence.
 */
export class JobPersister {
  /**
   * Upsert a ParsedJob to the database and sync to Elasticsearch.
   * Uses the job slug (stored in _slug on the adapter output) as the upsert key.
   *
   * @param parsed    - Fully parsed job from JobPipeline
   * @param company   - Company row for FK association
   * @param slug      - Pre-computed slug from the ATS adapter
   * @returns The upserted job ID and whether it was created or updated
   */
  async upsert(
    parsed: ParsedJob,
    company: CompanyRow,
    slug: string,
  ): Promise<{ id: string; isNew: boolean }> {
    // Serialize SectionMap to plain JSON for storage
    // Prisma requires Prisma.JsonNull (not null) for nullable Json fields
    const parsedSectionsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull = parsed.parsedSections
      ? (Object.fromEntries(parsed.parsedSections) as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    // Serialize TechStack
    const techStackJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      parsed.techStack ? (parsed.techStack as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;

    // Flat skill arrays for v1 backward compat + ES keyword fields
    const skillsRequired = parsed.requiredSkills?.value?.map((s) => s.name) ?? [];
    const preferredSkills = parsed.preferredSkills?.value?.map((s) => s.name) ?? [];

    // Map Extracted<ExperienceRequirement> to flat DB columns
    const exp = parsed.experience?.value;

    // Map Extracted<StructuredLocation> to flat columns
    const loc = parsed.location?.value;

    // Map Extracted<SalaryRange> to flat columns
    const salary = parsed.salary?.value;

    // Map Extracted<EducationRequirement> to flat columns
    const edu = parsed.education?.value;

    const sharedData = {
      // ── v1 core fields (backward compat) ──────────────────────────────────
      title: parsed.title,
      description: parsed.description,
      requirements: parsed.requirements?.value?.join("\n") ?? "",
      responsibilities: parsed.responsibilities?.value?.join("\n") ?? "",
      benefits: parsed.benefits?.value?.join("\n") ?? "",
      location: loc?.raw || parsed.location?.value?.city || "Not specified",
      type: (parsed.jobType?.value || "FULL_TIME") as any,
      workMode: (parsed.workMode?.value || "ONSITE") as any,
      applyUrl: parsed.applyUrl,
      skillsRequired,
      experienceLevel: exp?.label || "Unknown",
      salaryMin: salary?.min || null,
      salaryMax: salary?.max || null,
      currency: salary?.currency || null,
      status: "OPEN" as const,
      externalJobId: parsed.externalId,
      atsSource: parsed.atsSource,
      postedAt: parsed.postedAt,

      // ── v2 structured fields ───────────────────────────────────────────────
      // Raw preservation
      rawHtml: parsed.rawHtml?.slice(0, 200_000) || "", // Safety cap: 200KB
      normalizedText: parsed.normalizedText?.slice(0, 50_000) || "",
      parsedSectionsJson,
      techStackJson,

      // Structured skills
      preferredSkills,

      // Structured experience
      experienceMinYears: exp?.minYears ?? null,
      experienceMaxYears: exp?.maxYears ?? null,

      // Salary period
      salaryPeriod: salary?.period || "annual",

      // Structured location
      locationCity: loc?.city || null,
      locationState: loc?.state || null,
      locationCountry: loc?.country || null,
      locationCountryCode: loc?.countryCode || null,
      visaSponsorship: loc?.visaSponsorship ?? null,
      relocationAssistance: loc?.relocationAssistance ?? null,

      // Education
      educationDegree: edu?.degree || null,
      educationRequired: edu?.isRequired ?? null,

      // Pipeline provenance
      parserConfidence: parsed.overallConfidence,
      needsLLMReview: parsed.needsLLMReview,
      pipelineVersion: parsed.pipelineVersion,
      lastParsedAt: new Date(),
    };

    const upserted = await prisma.job.upsert({
      where: { slug },
      create: {
        companyId: company.id,
        slug,
        ...sharedData,
      },
      update: {
        ...sharedData,
        // Intentionally NOT updating slug or companyId on updates
        // postedAt intentionally NOT updated on updates — preserve original date
        postedAt: undefined,
      },
      select: { id: true, createdAt: true, updatedAt: true },
    });

    const isNew = upserted.createdAt.getTime() === upserted.updatedAt.getTime();

    // Fire-and-forget Elasticsearch sync (fail-soft, does not throw)
    syncJobToElastic(upserted.id);

    return { id: upserted.id, isNew };
  }
}

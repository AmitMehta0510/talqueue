import slugify from "slugify";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { resilientGet } from "shared/services/network/resilientHttp";
import { isTechOrInternRole } from "../utils/roleFilter";

/**
 * AshbyAdapter — fetches and normalizes jobs from the Ashby posting API.
 *
 * API: GET https://api.ashbyhq.com/posting-api/job-board/{token}
 * - Returns `jobs[]` with `id`, `title`, `descriptionPlain`, `requirementsPlain`,
 *   `responsibilitiesPlain`, `employmentType` (Tier-1), `location`, `isRemote`,
 *   `workplaceType`, `jobUrl`, `publishedAt`
 */
export class AshbyAdapter implements ATSAdapter {
  readonly source: ATSSource = "ashby";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    const response = await resilientGet(
      `https://api.ashbyhq.com/posting-api/job-board/${token}`,
    );

    const rawJobs: any[] = response.data?.jobs ?? [];
    const techJobs = rawJobs
      .filter((job: any) => isTechOrInternRole(job.title))
      .slice(0, 20);

    return techJobs.map((job: any): RawJobInput => {
      const externalId = `ashby-${job.id}`;
      const slug = slugify(
        `${company.slug}-${job.title}-${job.id}`,
        { lower: true, strict: true },
      ) || `job-${job.id}`;

      // Ashby provides plain text directly — combine into HTML-like structure
      // for consistent processing through HtmlCleaner
      const combinedHtml = [
        job.descriptionPlain ? `<p>${job.descriptionPlain}</p>` : "",
        job.requirementsPlain
          ? `<h3>Requirements</h3><p>${job.requirementsPlain}</p>`
          : "",
        job.responsibilitiesPlain
          ? `<h3>Responsibilities</h3><p>${job.responsibilitiesPlain}</p>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        externalId,
        title: job.title,
        rawHtml: combinedHtml || "",
        descriptionPlain: job.descriptionPlain || undefined,
        // Ashby Tier-1 structured employment type
        atsEmploymentType: job.employmentType || null,
        atsLocation: job.location || company.headquarters || null,
        atsWorkplaceType: job.workplaceType || null,
        atsIsRemote: job.isRemote ?? null,
        atsPublishedAt: job.publishedAt ? new Date(job.publishedAt) : null,
        _slug: slug,
        _applyUrl: job.jobUrl || `https://jobs.ashbyhq.com/${token}/${job.id}`,
      } as RawJobInput & { _slug: string; _applyUrl: string };
    });
  }
}

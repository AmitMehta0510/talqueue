import slugify from "slugify";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { resilientGet } from "shared/services/network/resilientHttp";
import { isTechOrInternRole } from "../utils/roleFilter";

/**
 * GreenhouseAdapter — fetches and normalizes jobs from the Greenhouse public board API.
 *
 * API: GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
 * - Returns `jobs[]` with `id`, `title`, `absolute_url`, `location`, `content` (HTML), `updated_at`
 * - `?content=true` is REQUIRED — without it, `job.content` is null for all jobs
 * - No structured employment type field on the public board API — falls through to Tier 2/3 classification
 */
export class GreenhouseAdapter implements ATSAdapter {
  readonly source: ATSSource = "greenhouse";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    const response = await resilientGet(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
    );

    const rawJobs: any[] = response.data?.jobs ?? [];
    const techJobs = rawJobs
      .filter((job: any) => isTechOrInternRole(job.title))
      .slice(0, 30);

    return techJobs.map((job: any): RawJobInput => {
      const externalId = `greenhouse-${job.id}`;
      const slug = slugify(
        `${company.slug}-${job.title}-${job.id}`,
        { lower: true, strict: true },
      ) || `job-${job.id}`;

      return {
        externalId,
        title: job.title,
        rawHtml: job.content || "",
        // Greenhouse public board API does not expose structured employment type
        atsEmploymentType: null,
        atsLocation: job.location?.name || company.headquarters || null,
        atsWorkplaceType: null,
        atsIsRemote: null,
        atsPublishedAt: job.updated_at ? new Date(job.updated_at) : null,
        // Store slug for persistence layer
        _slug: slug,
        _applyUrl: job.absolute_url || `https://boards.greenhouse.io/${token}/jobs/${job.id}`,
      } as RawJobInput & { _slug: string; _applyUrl: string };
    });
  }
}

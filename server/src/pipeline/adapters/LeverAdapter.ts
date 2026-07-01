import slugify from "slugify";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { resilientGet } from "shared/services/network/resilientHttp";
import { isTechOrInternRole } from "../utils/roleFilter";

/**
 * LeverAdapter — fetches and normalizes jobs from the Lever public API.
 *
 * API: GET https://api.lever.co/v0/postings/{token}?mode=json
 * - Returns job[] with `id`, `text` (title), `description` (HTML), `descriptionPlain`,
 *   `lists[]` (structured sections), `categories.commitment` (employment type — Tier 1),
 *   `categories.location`, `workplaceType`, `hostedUrl`, `createdAt`
 */
export class LeverAdapter implements ATSAdapter {
  readonly source: ATSSource = "lever";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    const response = await resilientGet(
      `https://api.lever.co/v0/postings/${token}?mode=json`,
    );

    const rawJobs: any[] = Array.isArray(response.data) ? response.data : [];
    const techJobs = rawJobs
      .filter((job: any) => isTechOrInternRole(job.text))
      .slice(0, 20);

    return techJobs.map((job: any): RawJobInput => {
      const externalId = `lever-${job.id}`;
      const slug = slugify(
        `${company.slug}-${job.text}-${job.id}`,
        { lower: true, strict: true },
      ) || `job-${job.id}`;

      // Extract structured sections from Lever lists[]
      const atsLists: Array<{ heading: string; content: string }> = [];
      if (Array.isArray(job.lists)) {
        for (const item of job.lists) {
          if (item.text && item.content) {
            atsLists.push({ heading: item.text, content: item.content });
          }
        }
      }

      return {
        externalId,
        title: job.text,
        rawHtml: job.description || "",
        descriptionPlain: job.descriptionPlain?.trim() || undefined,
        // Lever Tier-1 structured employment type
        atsEmploymentType: job.categories?.commitment || null,
        atsLocation: job.categories?.location || company.headquarters || null,
        atsWorkplaceType: job.workplaceType || null,
        atsIsRemote: null,
        atsPublishedAt: job.createdAt ? new Date(job.createdAt) : null,
        atsLists,
        _slug: slug,
        _applyUrl: job.hostedUrl || `https://jobs.lever.co/${token}/${job.id}`,
      } as RawJobInput & { _slug: string; _applyUrl: string };
    });
  }
}

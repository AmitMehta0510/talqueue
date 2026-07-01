import slugify from "slugify";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { resilientGet } from "shared/services/network/resilientHttp";
import { isTechOrInternRole } from "../utils/roleFilter";

export class PaylocityAdapter implements ATSAdapter {
  readonly source: ATSSource = "paylocity";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    const response = await resilientGet(
      `https://recruiting.paylocity.com/recruiting/jobs/All/${token}`,
    );

    const rawJobs: any[] = response.data?.Jobs ?? response.data?.jobs ?? [];
    if (!Array.isArray(rawJobs)) return [];

    const techJobs = rawJobs.filter((j: any) => isTechOrInternRole(j?.JobTitle ?? "")).slice(0, 20);
    const inputs: RawJobInput[] = [];

    for (const job of techJobs) {
      const jobTitle = job.JobTitle || "Engineering Role";
      const jobId = job.JobId || job.RequisitionId || "";
      if (!jobId) continue;

      const slug = slugify(`${company.slug}-${jobTitle}-${jobId}`, { lower: true, strict: true }) || `job-paylocity-${jobId}`;
      const locationParts = [job.City, job.State, job.Country].filter(Boolean);
      const locationName = locationParts.join(", ") || company.headquarters || "Not specified";

      inputs.push({
        externalId: `paylocity-${token}-${jobId}`,
        title: jobTitle,
        rawHtml: job.JobDescription || job.Description || "",
        atsEmploymentType: job.EmploymentType || null,
        atsLocation: locationName,
        atsWorkplaceType: null,
        atsIsRemote: job.IsRemote ?? null,
        atsPublishedAt: job.PostedDate ? new Date(job.PostedDate) : null,
        _slug: slug,
        _applyUrl: `https://recruiting.paylocity.com/recruiting/jobs/Details/${token}/${jobId}`,
      } as RawJobInput & { _slug: string; _applyUrl: string });
    }

    return inputs;
  }
}

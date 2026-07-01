import slugify from "slugify";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { resilientGet } from "shared/services/network/resilientHttp";
import { isTechOrInternRole } from "../utils/roleFilter";

export class BambooHRAdapter implements ATSAdapter {
  readonly source: ATSSource = "bamboohr";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    const response = await resilientGet(`https://${token}.bamboohr.com/careers/list`);
    const rawJobs: any[] = response.data?.result ?? response.data ?? [];
    if (!Array.isArray(rawJobs)) return [];

    const techJobs = rawJobs.filter((j: any) => isTechOrInternRole(j?.jobOpeningName ?? ""));
    const inputs: RawJobInput[] = [];

    for (const job of techJobs) {
      const jobTitle = job.jobOpeningName || "Engineering Role";
      const jobId = job.id;
      if (!jobId) continue;

      // Location parsing
      const loc = job.location;
      let locationName = "Not specified";
      if (loc && typeof loc === "object") {
        const parts = [loc.city, loc.state].filter(Boolean);
        locationName = parts.join(", ") || "Not specified";
      } else if (typeof loc === "string") {
        locationName = loc;
      }

      // Fetch per-job detail for real description HTML
      let rawHtml = "";
      try {
        const detail = await resilientGet(`https://${token}.bamboohr.com/careers/${jobId}/detail`);
        rawHtml = detail.data?.description || detail.data?.content || "";
      } catch { /* Use empty — pipeline will fall back to generated template */ }

      const slug = slugify(`${company.slug}-${jobTitle}-${jobId}`, { lower: true, strict: true }) || `job-bamboohr-${jobId}`;

      inputs.push({
        externalId: `bamboohr-${token}-${jobId}`,
        title: jobTitle,
        rawHtml,
        atsEmploymentType: job.employmentType || null,
        atsLocation: locationName,
        atsWorkplaceType: null,
        atsIsRemote: null,
        atsPublishedAt: job.datePosted ? new Date(job.datePosted) : null,
        _slug: slug,
        _applyUrl: `https://${token}.bamboohr.com/careers/${jobId}`,
      } as RawJobInput & { _slug: string; _applyUrl: string });
    }

    return inputs;
  }
}

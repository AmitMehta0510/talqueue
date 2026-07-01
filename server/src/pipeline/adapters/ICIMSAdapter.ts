import slugify from "slugify";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { resilientGet } from "shared/services/network/resilientHttp";
import { isTechOrInternRole } from "../utils/roleFilter";

export class ICIMSAdapter implements ATSAdapter {
  readonly source: ATSSource = "icims";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    const response = await resilientGet(
      `https://careers.icims.com/jobs/search?ss=1&in_iframe=1&hashed=-435773&mobile=false&width=970&height=200&bga=true&needsRedirect=false&jan1offset=-330&jun1offset=-330&company=${token}&format=json`,
    );

    const rawJobs: any[] = response.data?.searchResults ?? [];
    if (!Array.isArray(rawJobs)) return [];

    const techJobs = rawJobs.filter((j: any) => isTechOrInternRole(j?.jobtitle ?? "")).slice(0, 20);
    const inputs: RawJobInput[] = [];

    for (const job of techJobs) {
      const jobTitle = job.jobtitle || "Engineering Role";
      const jobId = job.jobId || job.id || "";
      if (!jobId) continue;

      const slug = slugify(`${company.slug}-${jobTitle}-${jobId}`, { lower: true, strict: true }) || `job-icims-${jobId}`;
      const locationName = [job.joblocation, company.headquarters].find(Boolean) || "Not specified";

      // Fetch job detail page for HTML description
      let rawHtml = "";
      const detailUrl = job.detailUrl || job.jobUrl || "";
      if (detailUrl) {
        try {
          const detail = await resilientGet(detailUrl);
          rawHtml = typeof detail.data === "string" ? detail.data : "";
        } catch { /* skip detail */ }
      }

      inputs.push({
        externalId: `icims-${token}-${jobId}`,
        title: jobTitle,
        rawHtml,
        atsEmploymentType: job.jobtype || null,
        atsLocation: locationName,
        atsWorkplaceType: null,
        atsIsRemote: null,
        atsPublishedAt: null,
        _slug: slug,
        _applyUrl: detailUrl || `https://careers.icims.com/jobs/${jobId}/job`,
      } as RawJobInput & { _slug: string; _applyUrl: string });
    }

    return inputs;
  }
}

import slugify from "slugify";
import axios from "axios";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { isTechOrInternRole } from "../utils/roleFilter";

const WORKDAY_TIERS = ["wd1", "wd2", "wd3", "wd4", "wd5"] as const;
const WORKDAY_MAX_JOBS = 50;
const WORKDAY_PAGE_SIZE = 20;

/**
 * WorkdayAdapter — scrapes jobs from Workday career sites via the CXS public API.
 *
 * Strategy:
 *  1. Probe wd1 → wd5 to find the working tier for this company's subdomain.
 *  2. POST to the Workday CXS search endpoint with pagination.
 *  3. No structured employment type — falls through to Tier 2/3 classification.
 */
export class WorkdayAdapter implements ATSAdapter {
  readonly source: ATSSource = "workday";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    // Tier discovery
    let workingTier: string | null = null;
    for (const tier of WORKDAY_TIERS) {
      const probeUrl = `https://${token}.${tier}.myworkdayjobs.com/wday/cxs/${token}/External_Career_Site/jobs`;
      try {
        const probe = await axios.post(
          probeUrl,
          { limit: 1, offset: 0, searchText: "", appliedFacets: {} },
          { timeout: 8000, validateStatus: (s) => s < 500 },
        );
        if (probe.status === 200) { workingTier = tier; break; }
      } catch { /* try next tier */ }
    }

    if (!workingTier) return [];

    const baseUrl = `https://${token}.${workingTier}.myworkdayjobs.com/wday/cxs/${token}/External_Career_Site/jobs`;
    const inputs: RawJobInput[] = [];
    let offset = 0;

    while (inputs.length < WORKDAY_MAX_JOBS) {
      const remaining = WORKDAY_MAX_JOBS - inputs.length;
      const pageSize = Math.min(WORKDAY_PAGE_SIZE, remaining);

      let rawJobs: any[] = [];
      try {
        const response = await axios.post(
          baseUrl,
          { limit: pageSize, offset, searchText: "", appliedFacets: {} },
          { timeout: 12000 },
        );
        const body = response.data ?? {};
        rawJobs = body.jobPostings ?? body.jobPosting ?? body.jobs ?? [];
        if (!Array.isArray(rawJobs) || rawJobs.length === 0) break;
      } catch { break; }

      const techJobs = rawJobs
        .filter((j: any) => isTechOrInternRole(j?.title ?? j?.jobPosting?.title ?? ""))
        .slice(0, remaining);

      for (const rawJob of techJobs) {
        const jobTitle: string = rawJob?.title ?? rawJob?.jobPosting?.title ?? "Engineering Role";
        const externalPath: string = rawJob?.externalPath ?? rawJob?.id ?? `${token}-${offset}-${inputs.length}`;
        const externalId = `workday-${token}-${externalPath.replace(/\//g, "-")}`;
        const slug = slugify(`${company.slug}-${jobTitle}-wd-${externalPath.slice(-8)}`, { lower: true, strict: true }) || `job-wd-${Date.now()}`;

        const locationName: string =
          rawJob?.locationsText ??
          (Array.isArray(rawJob?.jobLocation) ? rawJob.jobLocation[0]?.descriptor : null) ??
          company.headquarters ??
          "Remote";

        const applyUrl = rawJob?.externalPath
          ? `https://${token}.${workingTier}.myworkdayjobs.com${rawJob.externalPath}`
          : `https://${token}.${workingTier}.myworkdayjobs.com/en-US/External_Career_Site`;

        inputs.push({
          externalId,
          title: jobTitle,
          rawHtml: "",
          atsEmploymentType: null,
          atsLocation: locationName,
          atsWorkplaceType: null,
          atsIsRemote: null,
          atsPublishedAt: rawJob?.startDate ? new Date(rawJob.startDate) : null,
          _slug: slug,
          _applyUrl: applyUrl,
        } as RawJobInput & { _slug: string; _applyUrl: string });
      }

      if (rawJobs.length < pageSize) break;
      offset += pageSize;
    }

    return inputs;
  }
}

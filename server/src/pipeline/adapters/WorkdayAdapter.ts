import slugify from "slugify";
import axios from "axios";
import * as cheerio from "cheerio";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { isTechOrInternRole } from "../utils/roleFilter";

const WORKDAY_TIERS = ["wd1", "wd2", "wd3", "wd4", "wd5"] as const;
const WORKDAY_MAX_JOBS = 50;
const WORKDAY_PAGE_SIZE = 20;

/**
 * Maximum concurrent detail-fetch requests per company run.
 * Keeps Workday from rate-limiting us (429) during the secondary phase.
 */
const WORKDAY_DETAIL_CONCURRENCY = 5;
const WORKDAY_DETAIL_TIMEOUT_MS  = 10_000;
const WORKDAY_RETRY_BACKOFF_MS   = 600;

// ── Semaphore helper ──────────────────────────────────────────────────────────

/** Minimal async semaphore — limits concurrent async operations to `n`. */
class Semaphore {
  private _queue: Array<() => void> = [];
  private _running = 0;
  constructor(private readonly n: number) {}

  async acquire(): Promise<void> {
    if (this._running < this.n) {
      this._running++;
      return;
    }
    await new Promise<void>((resolve) => this._queue.push(resolve));
    this._running++;
  }

  release(): void {
    this._running--;
    const next = this._queue.shift();
    if (next) next();
  }
}

// ── Workday detail response shape (CXS internal endpoint) ────────────────────

interface WorkdayDetailPayload {
  jobPostingInfo?: {
    jobDescription?: string;          // Raw HTML blob
    jobRequisitionSummary?: string;
    employmentType?: { descriptor?: string };
    primaryLocation?: { descriptor?: string };
    timeType?: { descriptor?: string }; // "Full time" | "Part time"
    remoteType?: { descriptor?: string };
    startDate?: string;
  };
  bulletFields?: string[];            // Flat summary bullets (title, location, type)
}

// ── WorkdayAdapter ────────────────────────────────────────────────────────────

/**
 * WorkdayAdapter — scrapes jobs from Workday career sites via the CXS public API.
 *
 * Two-phase ingestion strategy:
 *
 *  Phase 1 (List): POST to the CXS search endpoint with pagination.
 *    Yields: title, externalPath, locationsText, startDate.
 *    Missing: description, requirements, skills, employment type.
 *
 *  Phase 2 (Detail): For each externalPath, POST to the per-job CXS detail
 *    endpoint:
 *      https://{token}.{tier}.myworkdayjobs.com/wday/cxs/{token}/External_Career_Site/job/{externalPath}
 *    Yields: jobDescription (HTML), employmentType, timeType, primaryLocation.
 *
 *  Concurrency: detail fetches are rate-limited to WORKDAY_DETAIL_CONCURRENCY=5
 *  simultaneous requests to avoid HTTP 429 responses from Workday.
 *  On a 429, the adapter backs off WORKDAY_RETRY_BACKOFF_MS and tries once more.
 *
 *  If the detail fetch fails (network error, 404, timeout), the job is still
 *  ingested — rawHtml is left empty and the pipeline will extract what it can
 *  from the title alone (no synthetic fallback generated).
 */
export class WorkdayAdapter implements ATSAdapter {
  readonly source: ATSSource = "workday";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    // ── Phase 1: Tier discovery ─────────────────────────────────────────────
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

    const listBaseUrl = `https://${token}.${workingTier}.myworkdayjobs.com/wday/cxs/${token}/External_Career_Site/jobs`;
    const detailBaseUrl = `https://${token}.${workingTier}.myworkdayjobs.com/wday/cxs/${token}/External_Career_Site/job`;

    // ── Phase 1: Paginated list fetch ─────────────────────────────────────
    const listItems: Array<{
      title: string;
      externalPath: string;
      externalId: string;
      slug: string;
      locationName: string;
      applyUrl: string;
      startDate: Date | null;
    }> = [];

    let offset = 0;

    while (listItems.length < WORKDAY_MAX_JOBS) {
      const remaining = WORKDAY_MAX_JOBS - listItems.length;
      const pageSize = Math.min(WORKDAY_PAGE_SIZE, remaining);

      let rawJobs: any[] = [];
      try {
        const response = await axios.post(
          listBaseUrl,
          { limit: pageSize, offset, searchText: "", appliedFacets: {} },
          { timeout: 12_000 },
        );
        const body = response.data ?? {};
        rawJobs = body.jobPostings ?? body.jobPosting ?? body.jobs ?? [];
        if (!Array.isArray(rawJobs) || rawJobs.length === 0) break;
      } catch { break; }

      const techJobs = rawJobs
        .filter((j: any) => isTechOrInternRole(j?.title ?? j?.jobPosting?.title ?? ""))
        .slice(0, remaining);

      for (const rawJob of techJobs) {
        const jobTitle: string =
          rawJob?.title ?? rawJob?.jobPosting?.title ?? "Engineering Role";
        const externalPath: string =
          rawJob?.externalPath ?? rawJob?.id ?? `${token}-${offset}-${listItems.length}`;
        const externalId = `workday-${token}-${externalPath.replace(/\//g, "-")}`;
        const slug =
          slugify(`${company.slug}-${jobTitle}-wd-${externalPath.slice(-8)}`, {
            lower: true,
            strict: true,
          }) || `job-wd-${Date.now()}`;

        const locationName: string =
          rawJob?.locationsText ??
          (Array.isArray(rawJob?.jobLocation) ? rawJob.jobLocation[0]?.descriptor : null) ??
          company.headquarters ??
          "Remote";

        const applyUrl = rawJob?.externalPath
          ? `https://${token}.${workingTier}.myworkdayjobs.com${rawJob.externalPath}`
          : `https://${token}.${workingTier}.myworkdayjobs.com/en-US/External_Career_Site`;

        listItems.push({
          title: jobTitle,
          externalPath,
          externalId,
          slug,
          locationName,
          applyUrl,
          startDate: rawJob?.startDate ? new Date(rawJob.startDate) : null,
        });
      }

      if (rawJobs.length < pageSize) break;
      offset += pageSize;
    }

    if (listItems.length === 0) return [];

    // ── Phase 2: Detail fetch with concurrency limit ──────────────────────
    const sem = new Semaphore(WORKDAY_DETAIL_CONCURRENCY);
    const inputs: RawJobInput[] = [];

    await Promise.all(
      listItems.map(async (item) => {
        await sem.acquire();
        let rawHtml = "";
        let atsEmploymentType: string | null = null;
        let atsWorkplaceType: string | null = null;

        try {
          // The per-job detail CXS endpoint uses the externalPath as the suffix
          const detailPath = item.externalPath.startsWith("/")
            ? item.externalPath
            : `/${item.externalPath}`;
          const detailUrl = `${detailBaseUrl}${detailPath}`;

          let detailRes: any;
          try {
            detailRes = await axios.post(
              detailUrl,
              {},
              { timeout: WORKDAY_DETAIL_TIMEOUT_MS, validateStatus: (s) => s < 500 },
            );
          } catch {
            // Retry once after backoff on timeout/connection error
            await new Promise((r) => setTimeout(r, WORKDAY_RETRY_BACKOFF_MS));
            detailRes = await axios.post(
              detailUrl,
              {},
              { timeout: WORKDAY_DETAIL_TIMEOUT_MS, validateStatus: (s) => s < 500 },
            );
          }

          if (detailRes.status === 429) {
            // Rate limited — back off and skip this job (will be picked up next scrape)
            await new Promise((r) => setTimeout(r, WORKDAY_RETRY_BACKOFF_MS * 3));
          } else if (detailRes.status === 200) {
            const detail: WorkdayDetailPayload = detailRes.data ?? {};
            const info = detail.jobPostingInfo ?? {};

            // Primary content: jobDescription HTML blob
            rawHtml = info.jobDescription ?? "";

            // Employment type from structured fields
            const empDescriptor = info.employmentType?.descriptor ?? info.timeType?.descriptor ?? "";
            if (empDescriptor) {
              const emp = empDescriptor.toLowerCase();
              if (emp.includes("intern")) atsEmploymentType = "Intern";
              else if (emp.includes("part")) atsEmploymentType = "Part-time";
              else if (emp.includes("contract") || emp.includes("temp")) atsEmploymentType = "Contract";
              else if (emp.includes("full")) atsEmploymentType = "Full-time";
              else atsEmploymentType = empDescriptor;
            }

            // Remote type
            const remoteDescriptor = info.remoteType?.descriptor ?? "";
            if (remoteDescriptor) {
              atsWorkplaceType = remoteDescriptor.toLowerCase().includes("remote") ? "Remote" : null;
            }
          }
        } catch {
          // Detail fetch failed silently — job still ingested with empty rawHtml
        } finally {
          sem.release();
        }

        inputs.push({
          externalId: item.externalId,
          title: item.title,
          rawHtml,
          atsEmploymentType,
          atsLocation: item.locationName,
          atsWorkplaceType,
          atsIsRemote: atsWorkplaceType?.toLowerCase().includes("remote") ?? null,
          atsPublishedAt: item.startDate,
          _slug: item.slug,
          _applyUrl: item.applyUrl,
        } as RawJobInput & { _slug: string; _applyUrl: string });
      }),
    );

    return inputs;
  }
}

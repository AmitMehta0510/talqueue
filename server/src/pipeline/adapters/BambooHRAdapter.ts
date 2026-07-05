import slugify from "slugify";
import * as cheerio from "cheerio";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { resilientGet } from "shared/services/network/resilientHttp";
import { isTechOrInternRole } from "../utils/roleFilter";

// ── BambooHR container selectors ─────────────────────────────────────────────
// BambooHR renders the job description inside known container elements.
// We probe these in priority order.
const BAMBOOHR_DESCRIPTION_SELECTORS = [
  ".BambooHR-ATS-Jobs-Item__description",
  "#job_desc",
  ".job-description",
  "[class*='JobDescription']",
  "[id*='job_description']",
  "[id*='jobDescription']",
  "section.description",
  "div[data-testid='job-description']",
];

const BAMBOOHR_REQUIREMENTS_SELECTORS = [
  ".BambooHR-ATS-Jobs-Item__requirements",
  "#job_requirements",
  "[class*='Requirements']",
  "[id*='requirements']",
];

/**
 * BambooHRAdapter — fetches and normalizes jobs from BambooHR career sites.
 *
 * Strategy:
 *  1. Fetch the careers list JSON from `/{token}.bamboohr.com/careers/list`.
 *  2. For each tech role, fetch the per-job detail page.
 *  3. Use Cheerio to isolate the job description from known BambooHR container
 *     classes (`.BambooHR-ATS-Jobs-Item__description`, `#job_desc`, etc.).
 *  4. Combine description + requirements HTML blocks and pass the merged blob
 *     to the pipeline. If no container matches, fall back to the full page body.
 *
 * If the detail API returns a JSON object with a `description` field (HTML),
 * that takes priority over the full-page Cheerio parse.
 */
export class BambooHRAdapter implements ATSAdapter {
  readonly source: ATSSource = "bamboohr";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    // ── Step 1: Fetch career listing ──────────────────────────────────────
    const response = await resilientGet(`https://${token}.bamboohr.com/careers/list`);
    const rawJobs: any[] = response.data?.result ?? response.data ?? [];
    if (!Array.isArray(rawJobs)) return [];

    const techJobs = rawJobs.filter((j: any) =>
      isTechOrInternRole(j?.jobOpeningName ?? ""),
    );
    const inputs: RawJobInput[] = [];

    for (const job of techJobs) {
      const jobTitle = (job.jobOpeningName as string | undefined)?.trim() || "Engineering Role";
      const jobId = job.id;
      if (!jobId) continue;

      // ── Location parsing ───────────────────────────────────────────────
      const loc = job.location;
      let locationName = "Not specified";
      if (loc && typeof loc === "object") {
        const parts = [loc.city as string | undefined, loc.state as string | undefined].filter(Boolean);
        locationName = parts.join(", ") || "Not specified";
      } else if (typeof loc === "string" && loc.trim()) {
        locationName = loc.trim();
      }

      // ── Step 2: Fetch per-job detail for real HTML content ────────────
      let rawHtml = "";
      const atsPublishedAt = job.datePosted ? new Date(job.datePosted) : null;

      try {
        const detailUrl = `https://${token}.bamboohr.com/careers/${jobId}/detail`;
        const detailRes = await resilientGet(detailUrl);

        if (detailRes.data && typeof detailRes.data === "object") {
          // JSON response: check for a direct HTML description field
          const directHtml =
            detailRes.data.description ||
            detailRes.data.jobDescription ||
            detailRes.data.content ||
            "";
          if (directHtml && typeof directHtml === "string" && directHtml.length > 80) {
            // Combine with requirements if available separately
            const reqHtml =
              detailRes.data.requirements ||
              detailRes.data.jobRequirements ||
              "";
            rawHtml = reqHtml
              ? `${directHtml}\n<h3>Requirements</h3>${reqHtml}`
              : directHtml;
          }
        } else if (typeof detailRes.data === "string" && detailRes.data.length > 80) {
          // ── Step 3: Full HTML page — use Cheerio to isolate containers ─
          rawHtml = this.extractJobHtml(detailRes.data);
        }
      } catch { /* detail fetch failed — rawHtml stays empty */ }

      const slug =
        slugify(`${company.slug}-${jobTitle}-${jobId}`, { lower: true, strict: true }) ||
        `job-bamboohr-${jobId}`;

      inputs.push({
        externalId: `bamboohr-${token}-${jobId}`,
        title: jobTitle,
        rawHtml,
        atsEmploymentType: (job.employmentType as string | undefined) || null,
        atsLocation: locationName,
        atsWorkplaceType: null,
        atsIsRemote: null,
        atsPublishedAt,
        _slug: slug,
        _applyUrl: `https://${token}.bamboohr.com/careers/${jobId}`,
      } as RawJobInput & { _slug: string; _applyUrl: string });
    }

    return inputs;
  }

  // ── Private: Cheerio container extraction ────────────────────────────────

  /**
   * Extract the job body HTML from a full BambooHR page using known selectors.
   * Falls back to the full `<body>` content if no known container matches.
   */
  private extractJobHtml(pageHtml: string): string {
    const $ = cheerio.load(pageHtml);

    // Remove navigation / chrome noise
    $(
      "nav, header, footer, aside, .BambooHR-ATS-header, .BambooHR-ATS-footer, " +
      ".BambooHR-ATS-nav, .BambooHR-ATS-body-nav, script, style, noscript, " +
      "[class*='cookie'], [class*='modal'], [class*='overlay'], [class*='CookieConsent']",
    ).remove();

    // Try known description containers
    for (const selector of BAMBOOHR_DESCRIPTION_SELECTORS) {
      const el = $(selector).first();
      if (el.length && el.text().trim().length > 80) {
        let combinedHtml = $.html(el);

        // Also grab requirements block if it is outside the description element
        for (const reqSel of BAMBOOHR_REQUIREMENTS_SELECTORS) {
          const reqEl = $(reqSel).first();
          if (reqEl.length && !el.find(reqSel).length) {
            combinedHtml += "\n" + $.html(reqEl);
          }
        }

        return combinedHtml;
      }
    }

    // Fallback to entire body
    return $("body").html() || "";
  }
}

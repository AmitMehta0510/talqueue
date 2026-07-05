import slugify from "slugify";
import * as cheerio from "cheerio";
import type { ATSAdapter, ATSSource, RawJobInput, CompanyRow } from "../interfaces/ATSAdapter";
import { resilientGet } from "shared/services/network/resilientHttp";
import { isTechOrInternRole } from "../utils/roleFilter";

// ── iCIMS container selectors ─────────────────────────────────────────────────
// iCIMS render jobs inside consistent CSS container classes regardless of tenant.
// We probe these in priority order — first match wins.
const ICIMS_DESCRIPTION_SELECTORS = [
  ".iCIMS_JobDescription",
  "#job-description",
  ".iCIMS_JobBody",
  ".col-xs-12.col-sm-8",      // Generic iCIMS layout column
  "#iCIMS_Content_iFrame",
  "[class*='JobDescription']",
  "[id*='job-description']",
  "[id*='jobBody']",
  "article.job-description",
];

const ICIMS_REQUIREMENTS_SELECTORS = [
  ".iCIMS_Requirements",
  "[class*='Requirements']",
  "[id*='requirements']",
];

const ICIMS_HEADER_SELECTORS = [
  ".iCIMS_JobHeader",
  ".job-header",
  "h1.job-title",
];

/**
 * ICIMSAdapter — fetches and normalizes jobs from an iCIMS career site.
 *
 * Strategy:
 *  1. Query the iCIMS Search JSON API to get a list of jobs with metadata.
 *  2. For each tech role, fetch the detail page HTML.
 *  3. Use Cheerio to isolate the job description from known iCIMS container
 *     classes (`.iCIMS_JobDescription`, `#job-description`, etc.) rather than
 *     scraping the full page or guessing from URL slugs.
 *  4. Pass the isolated HTML blob to the pipeline — the SemanticSectionParser
 *     will handle heading-based section classification from there.
 *
 * Fallback: if no known container matches, the full page body is passed.
 * The pipeline will still extract what it can from plaintext.
 */
export class ICIMSAdapter implements ATSAdapter {
  readonly source: ATSSource = "icims";

  async fetchJobs(token: string, company: CompanyRow): Promise<RawJobInput[]> {
    // ── Step 1: Fetch job listing via iCIMS Search JSON API ──────────────
    const response = await resilientGet(
      `https://careers.icims.com/jobs/search?ss=1&in_iframe=1&hashed=-435773&mobile=false&width=970&height=200&bga=true&needsRedirect=false&jan1offset=-330&jun1offset=-330&company=${token}&format=json`,
    );

    const rawJobs: any[] = response.data?.searchResults ?? [];
    if (!Array.isArray(rawJobs)) return [];

    const techJobs = rawJobs
      .filter((j: any) => isTechOrInternRole(j?.jobtitle ?? ""))
      .slice(0, 20);

    const inputs: RawJobInput[] = [];

    for (const job of techJobs) {
      const jobTitle = (job.jobtitle as string | undefined)?.trim() || "Engineering Role";
      const jobId = job.jobId || job.id || "";
      if (!jobId) continue;

      const slug =
        slugify(`${company.slug}-${jobTitle}-${jobId}`, { lower: true, strict: true }) ||
        `job-icims-${jobId}`;

      // Location: prefer structured field from search result, fall back to HQ
      const locationName =
        [job.joblocation as string | undefined]
          .filter(Boolean)
          .join(", ") || company.headquarters || "Not specified";

      // ── Step 2: Fetch per-job detail HTML page ──────────────────────────
      let rawHtml = "";
      const detailUrl =
        (job.detailUrl as string | undefined) ||
        (job.jobUrl as string | undefined) ||
        `https://careers.icims.com/jobs/${jobId}/job`;

      try {
        const detailRes = await resilientGet(detailUrl);
        const pageHtml = typeof detailRes.data === "string" ? detailRes.data : "";
        if (pageHtml) {
          // ── Step 3: Cheerio isolation of known iCIMS containers ─────────
          rawHtml = this.extractJobHtml(pageHtml);
        }
      } catch { /* detail fetch failed — rawHtml stays empty */ }

      // Employment type from iCIMS search result (sometimes present)
      const atsEmploymentType =
        (job.jobtype as string | undefined) || null;

      inputs.push({
        externalId: `icims-${token}-${jobId}`,
        title: jobTitle,
        rawHtml,
        atsEmploymentType,
        atsLocation: locationName,
        atsWorkplaceType: null,
        atsIsRemote: null,
        atsPublishedAt: null,
        _slug: slug,
        _applyUrl: detailUrl,
      } as RawJobInput & { _slug: string; _applyUrl: string });
    }

    return inputs;
  }

  // ── Private: Cheerio container extraction ────────────────────────────────

  /**
   * Given a full iCIMS job page HTML, extract only the relevant job body HTML.
   *
   * Probes a priority-ordered list of container selectors.
   * If none match, falls back to the full `<body>` content (pipeline handles noise).
   */
  private extractJobHtml(pageHtml: string): string {
    const $ = cheerio.load(pageHtml);

    // Remove navigation, header, footer, sidebar noise first
    $(
      "nav, header, footer, aside, .navbar, .site-header, .site-footer, " +
      ".breadcrumb, .pagination, [class*='cookie'], [class*='modal'], " +
      "[class*='overlay'], script, style, noscript",
    ).remove();

    // Try known description containers in priority order
    for (const selector of ICIMS_DESCRIPTION_SELECTORS) {
      const el = $(selector).first();
      if (el.length && (el.text().trim().length > 80)) {
        // Also grab requirements section if it's outside the description container
        let combinedHtml = $.html(el);

        for (const reqSel of ICIMS_REQUIREMENTS_SELECTORS) {
          const reqEl = $(reqSel).first();
          if (reqEl.length && !el.find(reqSel).length) {
            combinedHtml += "\n" + $.html(reqEl);
          }
        }

        return combinedHtml;
      }
    }

    // Fallback: get body content (noisy but better than nothing)
    const bodyHtml = $("body").html() || "";
    return bodyHtml;
  }
}

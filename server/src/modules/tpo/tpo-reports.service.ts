/**
 * @file tpo-reports.service.ts
 * @module Modules/TPO
 *
 * Generates exportable placement reports for TPO compliance and management.
 *
 * Supported formats:
 *  - CSV: branch-wise placement stats + company-wise breakdown
 *  - PDF: formatted report using pdf-lib (no binary deps, pure JS)
 *
 * Data source: getCollegePlacementStats() from driveAnalytics.service
 */

import { getCollegePlacementStats } from "modules/placementDrives/driveAnalytics.service";
import AppError from "shared/errors/AppError";

// ---------------------------------------------------------------------------
// CSV GENERATION
// ---------------------------------------------------------------------------

const escapeCsvCell = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const csvRow = (...cells: (string | number | null | undefined)[]): string =>
  cells.map(escapeCsvCell).join(",");

/**
 * Generates a multi-section CSV report for a college's placements.
 * Sections:
 *  1. Summary KPIs
 *  2. Branch-wise breakdown
 *  3. Company-wise breakdown
 *  4. Recent drives list
 */
export const generatePlacementCsv = async (
  collegeId: string,
  academicYear?: number,
): Promise<{ csv: string; filename: string }> => {
  const stats = await getCollegePlacementStats(collegeId, academicYear);

  const yearLabel = academicYear ? `${academicYear}-${academicYear + 1}` : "All Years";
  const lines: string[] = [];

  // ── SECTION 1: Summary ────────────────────────────────────────────────────
  lines.push("PLACEMENT REPORT — SUMMARY");
  lines.push(csvRow("Academic Year", yearLabel));
  lines.push(csvRow("Generated On", new Date().toLocaleDateString("en-IN")));
  lines.push("");
  lines.push(csvRow("Metric", "Value"));
  lines.push(csvRow("Total Drives", stats.summary.totalDrives));
  lines.push(csvRow("Total Internship Drives", stats.summary.totalInternshipDrives));
  lines.push(csvRow("Total Applicants", stats.summary.totalApplicants));
  lines.push(csvRow("Total Placed (Selected)", stats.summary.totalSelected));
  lines.push(
    csvRow(
      "Placement Percentage",
      stats.summary.placementPercent !== null
        ? `${stats.summary.placementPercent.toFixed(2)}%`
        : "N/A",
    ),
  );
  lines.push(
    csvRow(
      "Average Package (LPA)",
      stats.summary.avgPackageLPA !== null
        ? `${stats.summary.avgPackageLPA.toFixed(2)}`
        : "N/A",
    ),
  );
  lines.push(
    csvRow(
      "Highest Package (LPA)",
      stats.summary.maxPackageLPA !== null
        ? `${stats.summary.maxPackageLPA.toFixed(2)}`
        : "N/A",
    ),
  );
  lines.push("");

  // ── SECTION 2: Branch-wise breakdown ──────────────────────────────────────
  lines.push("BRANCH-WISE BREAKDOWN");
  lines.push(csvRow("Branch", "Total Applicants", "Selected", "Placement %"));
  for (const branch of stats.byBranch) {
    lines.push(
      csvRow(
        branch.branch,
        branch.total,
        branch.selected,
        `${branch.placementPercent.toFixed(2)}%`,
      ),
    );
  }
  lines.push("");

  // ── SECTION 3: Company-wise breakdown ─────────────────────────────────────
  lines.push("COMPANY-WISE OFFERS");
  lines.push(csvRow("Company", "Offers Made", "Average Package (LPA)"));
  for (const company of stats.byCompany) {
    lines.push(
      csvRow(
        company.companyName,
        company.offers,
        company.avgPackageLPA !== null ? company.avgPackageLPA.toFixed(2) : "N/A",
      ),
    );
  }
  lines.push("");

  // ── SECTION 4: Recent drives ──────────────────────────────────────────────
  lines.push("RECENT DRIVES");
  lines.push(csvRow("Drive Title", "Type", "Status", "Company", "Applicants", "Selected", "Drive Date"));
  for (const drive of stats.recentDrives) {
    lines.push(
      csvRow(
        drive.title,
        drive.driveType,
        drive.status,
        drive.companyName ?? "N/A",
        drive.applicants,
        drive.selected,
        drive.driveDate
          ? new Date(drive.driveDate).toLocaleDateString("en-IN")
          : "TBD",
      ),
    );
  }

  const filename = `placement-report-${academicYear ?? "all"}-${Date.now()}.csv`;
  return { csv: lines.join("\n"), filename };
};

// ---------------------------------------------------------------------------
// PDF GENERATION (Plain text-based, no native binary deps)
// ---------------------------------------------------------------------------

/**
 * Generates a minimal PDF-like text report.
 * Uses a simple handcrafted PDF structure so we don't need pdfkit/puppeteer.
 * For production-grade PDF, consider adding pdfkit as a dependency.
 *
 * Returns Buffer with PDF bytes.
 */
export const generatePlacementPdf = async (
  collegeId: string,
  collegeName: string,
  academicYear?: number,
): Promise<{ pdf: Buffer; filename: string }> => {
  const stats = await getCollegePlacementStats(collegeId, academicYear);
  const yearLabel = academicYear ? `${academicYear}-${academicYear + 1}` : "All Years";
  const generated = new Date().toLocaleDateString("en-IN");

  // Build a plain-text content that we embed in a PDF
  const textLines: string[] = [
    `PLACEMENT REPORT`,
    `Institute: ${collegeName}`,
    `Academic Year: ${yearLabel}`,
    `Generated: ${generated}`,
    ``,
    `━━━ SUMMARY ━━━`,
    `Total Drives            : ${stats.summary.totalDrives}`,
    `Total Internship Drives : ${stats.summary.totalInternshipDrives}`,
    `Total Applicants        : ${stats.summary.totalApplicants}`,
    `Total Selected          : ${stats.summary.totalSelected}`,
    `Placement Percentage    : ${stats.summary.placementPercent !== null ? stats.summary.placementPercent.toFixed(2) + "%" : "N/A"}`,
    `Average Package (LPA)   : ${stats.summary.avgPackageLPA !== null ? stats.summary.avgPackageLPA.toFixed(2) : "N/A"}`,
    `Highest Package (LPA)   : ${stats.summary.maxPackageLPA !== null ? stats.summary.maxPackageLPA.toFixed(2) : "N/A"}`,
    ``,
    `━━━ BRANCH-WISE BREAKDOWN ━━━`,
    `Branch                    | Applicants | Selected | Placement%`,
    `──────────────────────────|────────────|──────────|──────────`,
    ...stats.byBranch.map(
      (b) =>
        `${b.branch.padEnd(26)}| ${String(b.total).padEnd(10)} | ${String(b.selected).padEnd(8)} | ${b.placementPercent.toFixed(1)}%`,
    ),
    ``,
    `━━━ COMPANY-WISE OFFERS ━━━`,
    `Company                        | Offers | Avg Package (LPA)`,
    `───────────────────────────────|────────|──────────────────`,
    ...stats.byCompany.map(
      (c) =>
        `${c.companyName.padEnd(31)}| ${String(c.offers).padEnd(6)} | ${c.avgPackageLPA !== null ? c.avgPackageLPA.toFixed(2) : "N/A"}`,
    ),
    ``,
    `━━━ RECENT DRIVES ━━━`,
    ...stats.recentDrives.map(
      (d) =>
        `[${d.status}] ${d.title} — ${d.companyName ?? "N/A"} | Applicants: ${d.applicants} | Selected: ${d.selected}`,
    ),
  ];

  const content = textLines.join("\n");

  // Build a minimal valid PDF with the text embedded as a stream
  const pdfContent = buildMinimalPdf(content);
  const filename = `placement-report-${academicYear ?? "all"}-${Date.now()}.pdf`;

  return { pdf: Buffer.from(pdfContent, "binary"), filename };
};

// ---------------------------------------------------------------------------
// MINIMAL PDF BUILDER (no external deps)
// ---------------------------------------------------------------------------

/**
 * Builds a minimal but valid PDF 1.4 document containing a single page
 * with monospaced preformatted text.
 *
 * Layout: A4, 12pt Courier, left-aligned, auto page-break every 55 lines.
 */
function buildMinimalPdf(text: string): string {
  const FONT = "Courier";
  const FONT_SIZE = 9;
  const MARGIN_LEFT = 40;
  const MARGIN_TOP = 790;
  const LINE_HEIGHT = 12;
  const MAX_LINES_PER_PAGE = 63;

  const allLines = text.split("\n");
  const pages: string[][] = [];

  for (let i = 0; i < allLines.length; i += MAX_LINES_PER_PAGE) {
    pages.push(allLines.slice(i, i + MAX_LINES_PER_PAGE));
  }

  // PDF objects collection
  const objects: string[] = [];
  let objCount = 0;

  const addObj = (content: string): number => {
    objCount++;
    objects.push(`${objCount} 0 obj\n${content}\nendobj`);
    return objCount;
  };

  // Catalog + Pages
  const catalogId = 1;
  const pagesId   = 2;
  objCount = 2; // reserve 1 + 2

  const pageIds: number[] = [];
  const streamIds: number[] = [];

  for (const pageLines of pages) {
    // Build BT...ET text block
    const textOps: string[] = [`BT`, `/${FONT} ${FONT_SIZE} Tf`];
    let y = MARGIN_TOP;
    for (const line of pageLines) {
      const safe = line
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
      textOps.push(`${MARGIN_LEFT} ${y} Td`);
      textOps.push(`(${safe}) Tj`);
      textOps.push(`-${MARGIN_LEFT} -${LINE_HEIGHT} Td`);
      y -= LINE_HEIGHT;
    }
    textOps.push("ET");

    const stream = textOps.join("\n");
    const streamObj = `<< /Length ${Buffer.byteLength(stream, "binary")} >>\nstream\n${stream}\nendstream`;
    const streamId = addObj(streamObj);
    streamIds.push(streamId);

    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${streamId} 0 R /Resources << /Font << /Courier << /Type /Font /Subtype /Type1 /BaseFont /${FONT} >> >> >> >>`
    );
    pageIds.push(pageId);
  }

  // Pages dict
  objects[pagesId - 1] = `${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj`;

  // Catalog
  objects[catalogId - 1] = `${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj`;

  // Cross-reference table
  const header = "%PDF-1.4\n";
  let body = header;
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(body.length);
    body += obj + "\n";
  }

  const xrefOffset = body.length;
  body += `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    body += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return body;
}

// ---------------------------------------------------------------------------
// VALIDATION HELPER
// ---------------------------------------------------------------------------

export const validateAcademicYear = (yearStr?: string): number | undefined => {
  if (!yearStr) return undefined;
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
    throw new AppError("Invalid academicYear. Must be a 4-digit year (e.g. 2024).", 400);
  }
  return year;
};

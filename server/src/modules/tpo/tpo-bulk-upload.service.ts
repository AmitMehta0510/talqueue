/**
 * @file tpo-bulk-upload.service.ts
 * @module Modules/TPO
 *
 * Service for TPO-authoritative bulk student data upload.
 *
 * Accepts a CSV file with columns:
 *   email, rollNumber, cgpa, backlogs, currentYear, branchName
 *
 * Processing rules:
 *  - Email is used to look up the platform User.
 *  - If the user has an Education record for the TPO's college, that record is
 *    updated with the authoritative CGPA/backlogs values.
 *  - `tpoVerified = true` is set so the eligibility engine trusts this data.
 *  - Students receive an in-platform notification when their record is updated.
 *  - Rows with unknown emails or users not linked to the college are collected
 *    as `notFound` (soft errors, not 500s).
 */

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { createNotificationsBulk } from "modules/notifications/notifications.service";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface BulkUploadRow {
  email: string;
  rollNumber?: string;
  cgpa?: number;
  backlogs?: number;
  currentYear?: number;
  branchName?: string;
}

export interface BulkUploadResult {
  total: number;
  updated: number;
  skipped: number;         // user found but no Education record for this college
  notFound: string[];      // emails with no matching platform user
  errors: Array<{ email: string; reason: string }>;
}

// ---------------------------------------------------------------------------
// CSV PARSER
// ---------------------------------------------------------------------------

/**
 * Parses a raw CSV string into typed BulkUploadRow objects.
 * Expected header: email,rollNumber,cgpa,backlogs,currentYear,branchName
 * The header row is case-insensitive and optional columns are tolerated.
 */
export const parseCsv = (csvText: string): BulkUploadRow[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new AppError("CSV file must have at least a header row and one data row.", 400);
  }

  // Normalize header — lowercase, strip quotes
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

  const emailIdx = headers.indexOf("email");
  if (emailIdx === -1) {
    throw new AppError("CSV must contain an 'email' column.", 400);
  }

  const rollIdx      = headers.indexOf("rollnumber");
  const cgpaIdx      = headers.indexOf("cgpa");
  const backlogsIdx  = headers.indexOf("backlogs");
  const yearIdx      = headers.indexOf("currentyear");
  const branchIdx    = headers.indexOf("branchname");

  const rows: BulkUploadRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const email = cols[emailIdx]?.toLowerCase();
    if (!email || !email.includes("@")) continue;

    const cgpaRaw     = cgpaIdx      !== -1 ? parseFloat(cols[cgpaIdx])      : NaN;
    const backlogsRaw = backlogsIdx  !== -1 ? parseInt(cols[backlogsIdx], 10) : NaN;
    const yearRaw     = yearIdx      !== -1 ? parseInt(cols[yearIdx],     10) : NaN;

    rows.push({
      email,
      rollNumber: rollIdx  !== -1 && cols[rollIdx]  ? cols[rollIdx]   : undefined,
      cgpa:       !isNaN(cgpaRaw)                   ? cgpaRaw         : undefined,
      backlogs:   !isNaN(backlogsRaw)               ? backlogsRaw     : undefined,
      currentYear: !isNaN(yearRaw)                  ? yearRaw         : undefined,
      branchName: branchIdx !== -1 && cols[branchIdx] ? cols[branchIdx] : undefined,
    });
  }

  if (rows.length === 0) {
    throw new AppError("No valid data rows found in the CSV.", 400);
  }

  if (rows.length > 1000) {
    throw new AppError("CSV exceeds the maximum of 1,000 rows per upload. Split into smaller files.", 400);
  }

  return rows;
};

// ---------------------------------------------------------------------------
// MAIN SERVICE
// ---------------------------------------------------------------------------

/**
 * Processes a parsed CSV and bulk-updates student Education records.
 *
 * @param tpoUserId   - The authenticated TPO's user ID (used as tpoVerifiedById)
 * @param collegeIds  - Array of college IDs the TPO manages
 * @param rows        - Parsed CSV rows
 */
export const bulkUpsertStudentData = async (
  tpoUserId: string,
  collegeIds: string[],
  rows: BulkUploadRow[],
): Promise<BulkUploadResult> => {
  if (collegeIds.length === 0) {
    throw new AppError("No college assigned to this TPO account.", 403);
  }

  // Use the first college as the primary one for this upload
  // (future: accept collegeId param for multi-college TPOs)
  const collegeId = collegeIds[0];

  const result: BulkUploadResult = {
    total: rows.length,
    updated: 0,
    skipped: 0,
    notFound: [],
    errors: [],
  };

  // ── Batch look up all emails at once ──────────────────────────────────────
  const emails = rows.map((r) => r.email);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: {
      id: true,
      email: true,
      educations: {
        where: { collegeId },
        select: { id: true },
        take: 1,
      },
    },
  });

  const emailToUser = new Map(users.map((u) => [u.email!.toLowerCase(), u]));

  // ── Process each row ───────────────────────────────────────────────────────
  const notifiedUserIds: string[] = [];
  const now = new Date();

  for (const row of rows) {
    const user = emailToUser.get(row.email);

    if (!user) {
      result.notFound.push(row.email);
      continue;
    }

    const educationId = user.educations[0]?.id;

    if (!educationId) {
      // User exists but has no Education record linked to this college
      result.skipped++;
      continue;
    }

    try {
      // Build only the fields actually present in the row (don't null-out missing)
      const updateData: Record<string, unknown> = {
        tpoVerified: true,
        tpoVerifiedAt: now,
        tpoVerifiedById: tpoUserId,
      };

      if (row.rollNumber  !== undefined) updateData.rollNumber  = row.rollNumber;
      if (row.cgpa        !== undefined) updateData.cgpa        = row.cgpa;
      if (row.backlogs    !== undefined) updateData.backlogs    = row.backlogs;
      if (row.currentYear !== undefined) updateData.currentYear = row.currentYear;

      await prisma.education.update({
        where: { id: educationId },
        data: updateData,
      });

      notifiedUserIds.push(user.id);
      result.updated++;
    } catch (err: any) {
      result.errors.push({ email: row.email, reason: err?.message || "Unknown error" });
    }
  }

  // ── Bulk-notify students whose records were updated ────────────────────────
  if (notifiedUserIds.length > 0) {
    setImmediate(async () => {
      try {
        await createNotificationsBulk(
          notifiedUserIds.map((userId) => ({
            userId,
            actorId: tpoUserId,
            type: "SYSTEM" as any,
            title: "Academic Record Updated by TPO",
            message:
              "Your academic record (CGPA, backlogs, current year) has been updated by your college's Training & Placement Officer. Please review your profile.",
            actionUrl: "/profile",
          }))
        );
      } catch (err) {
        console.error("[TPO BulkUpload] Failed to send student notifications:", err);
      }
    });
  }

  return result;
};

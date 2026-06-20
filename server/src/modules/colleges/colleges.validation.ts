import { z } from "zod";

export const createCollegeSchema = z.object({
  name: z.string().min(2),

  state: z.string().max(120).optional(),

  city: z.string().max(120).optional(),

  country: z.string().max(120).optional(),

  website: z.string().url().optional(),

  logoUrl: z.string().url().optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2),

  collegeId: z.string().uuid(),

  // Head of Department name (free-text, may not be a platform user)
  hod: z.string().max(200).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONAL B2B ONBOARDING SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the institutional college onboarding submission payload.
 * Note: bankAccountNumber and bankIfscCode are stored as plain strings.
 * authorityLetterheadDoc is expected to be a pre-signed S3 URL
 * uploaded by the client before calling this endpoint.
 */
export const submitCollegeRegistrationSchema = z.object({
  collegeName: z.string().min(2).max(300),

  aisheCode: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9\-]+$/i, "AISHE code must be alphanumeric"),

  officialEmail: z.string().email("Must be a valid institutional email"),

  bankAccountNumber: z
    .string()
    .min(6, "Bank account number too short")
    .max(50, "Bank account number too long")
    .regex(/^[0-9]+$/, "Bank account number must contain only digits"),

  bankIfscCode: z
    .string()
    .regex(
      /^[A-Z]{4}0[A-Z0-9]{6}$/i,
      "Invalid IFSC code format (e.g. SBIN0001234)",
    ),

  authorityLetterheadDoc: z
    .string()
    .url("Must be a valid URL pointing to the uploaded authority letterhead"),

  // Optional catalog metadata — enriches the College record on approval
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  website: z.string().url().optional(),
});

/**
 * Validates the staff assignment / removal payload.
 * When role is "HOD", departmentId is required.
 */
export const assignStaffSchema = z
  .object({
    targetUserId: z.string().uuid("targetUserId must be a valid UUID"),
    // Zod v4: z.enum() takes a plain string as the second arg for custom error
    role: z.enum(["TPO", "HOD"]),
    departmentId: z.string().uuid().optional(),
    action: z.enum(["ASSIGN", "REMOVE"]).default("ASSIGN"),
  })
  .refine(
    (data) => data.role !== "HOD" || Boolean(data.departmentId),
    {
      message: "departmentId is required when role is HOD",
      path: ["departmentId"],
    },
  );

/**
 * Validates the CDCR assignment payload.
 * departmentId is optional — null = college-wide (TPO-assigned),
 * set = department-scoped (HOD-assigned).
 */
export const assignCdcrSchema = z.object({
  targetUserId: z.string().uuid("targetUserId must be a valid UUID"),
  departmentId: z.string().uuid().optional(),
});

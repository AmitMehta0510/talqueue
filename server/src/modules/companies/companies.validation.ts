import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(150),

  logoUrl: z.string().url().max(512).optional(),

  coverImageUrl: z.string().url().max(512).optional(),

  websiteUrl: z.string().url().max(512).optional(),

  linkedinUrl: z.string().url().max(512).optional(),

  twitterUrl: z.string().url().max(512).optional(),

  githubUrl: z.string().url().max(512).optional(),

  careersPageUrl: z.string().url().max(512).optional(),

  description: z.string().max(5000).optional(),

  tagline: z.string().max(200).optional(),

  headquarters: z.string().max(150).optional(),

  country: z.string().max(120).optional(),

  industry: z.string().max(100).optional(),

  foundedYear: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear())
    .optional(),

  type: z
    .enum([
      "STARTUP",
      "PRODUCT_BASED",
      "SERVICE_BASED",
      "ENTERPRISE",
      "MNC",
      "OTHER",
    ])
    .optional(),

  size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional(),

  hiringEnabled: z.boolean().optional(),

  referralEnabled: z.boolean().optional(),
});

export const submitCompanyClaimSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID"),
  gstin: z.string().trim().min(1, "GSTIN is required").max(15, "GSTIN must be at most 15 characters"),
  cin: z.string().trim().min(1, "CIN is required").max(21, "CIN must be at most 21 characters"),
  businessEmail: z.string().email("Invalid business email").max(254),
  corporateDoc: z.string().url("corporateDoc must be a valid URL").max(512),
});

export const submitRecruiterOnboardingSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID").optional().nullable(),
  companyName: z.string().trim().min(1, "Company name is required").max(150),
  businessEmail: z.string().email("Invalid business email").max(254),
});

export const createCompanyOfficeSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID"),
  name: z.string().trim().min(1, "Office name is required").max(150),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().min(1, "City is required").max(100),
  managerId: z.string().uuid("managerId must be a valid UUID").optional().nullable(),
});

export const createCompanyDepartmentSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID"),
  name: z.string().trim().min(1, "Department name is required").max(150),
  code: z.string().trim().max(30).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// V-07: requestCompanyRegistration — raw req.body previously unguarded
// ─────────────────────────────────────────────────────────────────────────────
export const requestCompanyRegistrationSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(150),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  headquarters: z.string().trim().max(150).optional(),
  industry: z.string().trim().max(100).optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  type: z.enum(["STARTUP", "PRODUCT_BASED", "SERVICE_BASED", "ENTERPRISE", "MNC", "OTHER"]).optional(),
  size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional(),
  websiteUrl: z.string().url().max(512).optional(),
  careersPageUrl: z.string().url().max(512).optional(),
  logoUrl: z.string().url().max(512).optional(),
  githubUrl: z.string().url().max(512).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// V-08: assignCompanyAdmin — raw req.body previously unguarded
// ─────────────────────────────────────────────────────────────────────────────
export const assignCompanyAdminSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
  officeCity: z.string().trim().max(100).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// V-10: assignCompanyRecruiter — raw req.body previously unguarded
// ─────────────────────────────────────────────────────────────────────────────
export const assignRecruiterBodySchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
  title: z.string().trim().max(150).optional(),
});

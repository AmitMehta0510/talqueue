import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().trim().min(2),

  logoUrl: z.string().url().optional(),

  coverImageUrl: z.string().url().optional(),

  websiteUrl: z.string().url().optional(),

  linkedinUrl: z.string().url().optional(),

  twitterUrl: z.string().url().optional(),

  githubUrl: z.string().url().optional(),

  careersPageUrl: z.string().url().optional(),

  description: z.string().optional(),

  tagline: z.string().optional(),

  headquarters: z.string().optional(),

  country: z.string().max(120).optional(),

  industry: z.string().optional(),

  foundedYear: z.number().int().optional(),

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
  gstin: z.string().trim().min(1, "GSTIN is required"),
  cin: z.string().trim().min(1, "CIN is required"),
  businessEmail: z.string().email("Invalid business email"),
  corporateDoc: z.string().url("corporateDoc must be a valid URL"),
});

export const submitRecruiterOnboardingSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID").optional().nullable(),
  companyName: z.string().trim().min(1, "Company name is required"),
  businessEmail: z.string().email("Invalid business email"),
});

export const createCompanyOfficeSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID"),
  name: z.string().trim().min(1, "Office name is required"),
  address: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  managerId: z.string().uuid("managerId must be a valid UUID").optional().nullable(),
});

export const createCompanyDepartmentSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID"),
  name: z.string().trim().min(1, "Department name is required"),
  code: z.string().trim().optional(),
});

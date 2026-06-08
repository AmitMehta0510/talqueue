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

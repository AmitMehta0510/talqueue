import { z } from "zod";

// Schema for posting a job against an existing company
export const createJobSchema = z.object({
  companyId: z.string().optional(),

  // For requesting a new (unverified) company
  companyName: z.string().optional(),

  title: z.string().min(2),

  description: z.string().min(10),

  requirements: z.string().optional(),

  responsibilities: z.string().optional(),

  perks: z.string().optional(),

  location: z.string().optional(),

  workMode: z
    .enum(["REMOTE", "HYBRID", "ONSITE"])
    .optional(),

  type: z.enum([
    "FULL_TIME",
    "INTERNSHIP",
    "PART_TIME",
    "CONTRACT",
    "FREELANCE",
    "ENTRY_LEVEL",
  ]),

  experienceLevel: z.string().optional(),

  salaryMin: z.number().optional(),

  salaryMax: z.number().optional(),

  // Human-readable salary display (e.g. "₹12–18 LPA")
  salaryDisplayText: z.string().max(100).optional(),

  // Whether salary is negotiable
  negotiable: z.boolean().optional(),

  currency: z.string().max(10).optional(),

  openings: z.number().optional(),

  skillsRequired: z.array(z.string()).default([]),

  applicationDeadline: z.string().optional(),

  applyUrl: z.string().optional(),
}).refine(
  (data) => data.companyId || data.companyName,
  { message: "Either companyId or companyName is required" }
);
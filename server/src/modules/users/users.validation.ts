import { z } from "zod";

// ── Profile ──────────────────────────────────────────────────────────────────
export const UpdateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores, and dots")
    .transform((v) => v.toLowerCase())
    .optional(),
  bio: z.string().trim().max(500).optional(),
  headline: z.string().trim().max(120).optional(),
  location: z.string().trim().max(100).optional(),
  avatarUrl: z.string().url().max(2048).optional().or(z.literal("")),
  bannerUrl: z.string().url().max(2048).optional().or(z.literal("")),
  resumeUrl: z.string().url().max(2048).optional().or(z.literal("")),
  availabilityText: z.string().trim().max(120).optional(),
  githubUrl: z.string().url().max(2048).optional().or(z.literal("")),
  linkedinUrl: z.string().url().max(2048).optional().or(z.literal("")),
  portfolioUrl: z.string().url().max(2048).optional().or(z.literal("")),
  leetcodeUrl: z.string().url().max(2048).optional().or(z.literal("")),
  hackerrankUrl: z.string().url().max(2048).optional().or(z.literal("")),
  gfgUrl: z.string().url().max(2048).optional().or(z.literal("")),
  graduationYear: z.number().int().min(1990).max(2040).optional(),
  collegeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  departmentName: z.string().trim().max(120).optional(),
  acceptingReferrals: z.boolean().optional(),
  openToWork: z.boolean().optional(),
  openToInternship: z.boolean().optional(),
  acceptingCollaborators: z.boolean().optional(),
  acceptingMentorship: z.boolean().optional(),
});

// ── Skills ────────────────────────────────────────────────────────────────────
export const AddSkillSchema = z.object({
  skillId: z.string().uuid(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
});

export const CreateCustomSkillSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const SearchSkillsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 12))
    .pipe(z.number().int().min(1).max(50)),
});

// ── Experience ────────────────────────────────────────────────────────────────
export const AddExperienceSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  companyWebsiteUrl: z.string().url().max(2048).optional().or(z.literal("")),
  title: z.string().trim().min(1).max(120),
  employmentType: z.enum([
    "FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP",
    "FREELANCE", "VOLUNTEER", "SELF_EMPLOYED", "OTHER",
  ]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD").optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().trim().max(2000).optional(),
  workEmail: z.string().email().optional().or(z.literal("")),
  managerName: z.string().trim().max(100).optional(),
  managerEmail: z.string().email().optional().or(z.literal("")),
  managerLinkedinUrl: z.string().url().max(2048).optional().or(z.literal("")),
  skillsUsed: z.array(z.string().uuid()).max(20).optional(),
  techStack: z.array(z.string().trim().max(50)).max(20).optional(),
  teamSize: z.number().int().min(1).max(100000).optional(),
});

export const UpdateExperienceSchema = AddExperienceSchema.partial();

// ── Education ─────────────────────────────────────────────────────────────────
export const AddEducationSchema = z.object({
  collegeId: z.string().uuid().optional(),
  customCollegeName: z.string().trim().max(120).optional(),
  departmentId: z.string().uuid().optional(),
  departmentName: z.string().trim().max(120).optional(),
  degree: z.string().trim().max(100).optional(),
  fieldOfStudy: z.string().trim().max(100).optional(),
  startYear: z.number().int().min(1980).max(2040).optional(),
  endYear: z.number().int().min(1980).max(2040).optional(),
  current: z.boolean().optional(),
});

export const UpdateEducationSchema = AddEducationSchema.partial();

// ── Backward-compatible aliases (used by users.controller.ts) ─────────────────
// The controller was written before this validation file existed and imports
// lowercase-named schemas. These aliases ensure the controller compiles without
// modification while routes can import the PascalCase names.
export const updateProfileSchema  = UpdateProfileSchema;
export const addSkillSchema       = AddSkillSchema;
export const addExperienceSchema  = AddExperienceSchema;
export const updateExperienceSchema = UpdateExperienceSchema;
export const addEducationSchema   = AddEducationSchema;
export const updateEducationSchema = UpdateEducationSchema;

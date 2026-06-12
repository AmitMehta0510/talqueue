import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  username: z.string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/)
  .optional(),
  bio: z.string().max(1000).optional(),

  headline: z.string().max(160).optional(),

  location: z.string().max(120).optional(),

  avatarUrl: z.string().optional(),

  bannerUrl: z.string().optional(),

  resumeUrl: z.string().optional(),

  availabilityText: z.string().max(240).optional(),

  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),

  graduationYear: z.number().optional(),

  collegeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  acceptingReferrals: z.boolean().optional(),
  openToWork: z.boolean().optional(),
  openToInternship: z.boolean().optional(),
  availabilityStatus: z.string().optional(),
});

export const addSkillSchema = z.object({
  skillId: z.string().uuid(),

  level: z.enum([
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "EXPERT",
  ]),
});

export const addExperienceSchema = z.object({
  companyName: z.string().min(1),
  title: z.string().min(1),

  employmentType: z.enum([
      "FULL_TIME",
      "INTERN",
      "INTERNSHIP",
      "CONTRACT",
      "FREELANCE",
  ]),

  startDate: z.string(),

  endDate: z.string().optional(),

  isCurrent: z.boolean().optional(),

  description: z.string().optional(),

  workEmail: z.string().email().optional(),

  managerName: z.string().optional(),

  managerEmail: z.string().email().optional(),

  managerLinkedinUrl: z.string().optional(),

  companyWebsiteUrl: z.string().optional(),

  documents: z.any().optional(),

  skillsUsed: z.array(z.string()).optional(),

  achievements: z.any().optional(),

  techStack: z.array(z.string()).optional(),

  teamSize: z.number().int().positive().optional(),
});

export const addEducationSchema = z
  .object({
    collegeId: z.string().uuid().optional(),

    customCollegeName: z.string().min(2).max(120).optional(),

    departmentId: z.string().uuid().optional(),

    degree: z.string().optional(),

    fieldOfStudy: z.string().optional(),

    startYear: z.number().int().optional(),

    endYear: z.number().int().optional(),

    current: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.collegeId && !val.customCollegeName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either collegeId or customCollegeName is required",
        path: ["collegeId"],
      });
    }
  });

export const updateExperienceSchema = z.object({
  title: z.string().min(1).optional(),

  employmentType: z.enum([
    "FULL_TIME",
    "INTERN",
    "INTERNSHIP",
    "CONTRACT",
    "FREELANCE",
  ]).optional(),

  startDate: z.string().optional(),

  endDate: z.string().optional(),

  isCurrent: z.boolean().optional(),

  description: z.string().optional(),

  workEmail: z.string().email().optional(),

  managerName: z.string().optional(),

  managerEmail: z.string().email().optional(),

  managerLinkedinUrl: z.string().optional(),

  companyWebsiteUrl: z.string().optional(),

  skillsUsed: z.array(z.string()).optional(),

  techStack: z.array(z.string()).optional(),

  teamSize: z.number().int().positive().optional(),
});

export const updateEducationSchema = z.object({
  collegeId: z.string().uuid().optional(),

  customCollegeName: z.string().min(2).max(120).optional(),

  departmentId: z.string().uuid().optional(),

  degree: z.string().optional(),

  fieldOfStudy: z.string().optional(),

  startYear: z.number().int().optional(),

  endYear: z.number().int().optional(),

  current: z.boolean().optional(),
});

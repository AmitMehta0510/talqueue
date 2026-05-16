import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  username: z.string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/)
  .optional(),
  bio: z.string().optional(),

  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),

  graduationYear: z.number().optional(),

  collegeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
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
  companyName: z.string(),
  title: z.string(),

  employmentType: z.enum([
      "FULL_TIME",
      "INTERNSHIP",
      "PART_TIME",
      "CONTRACT",
      "FREELANCE",
  ]),

  startDate: z.string(),

  endDate: z.string().optional(),

  isCurrent: z.boolean().optional(),

  description: z.string().optional(),
});

export const addEducationSchema = z.object({
  collegeId: z.string().uuid(),

  departmentId: z.string().uuid().optional(),

  degree: z.string().optional(),

  fieldOfStudy: z.string().optional(),

  startYear: z.number().optional(),

  endYear: z.number().optional(),

  current: z.boolean().optional(),
});
import { z } from "zod";

export const applyToJobSchema =
  z.object({
    resumeUrl:
      z.string().optional(),

    coverLetter:
      z.string().optional(),

    githubUrl:
      z.string().optional(),

    portfolioUrl:
      z.string().optional(),

    linkedinUrl:
      z.string().optional(),
  });

export const updateApplicationStatusSchema =
  z.object({
    status: z.enum([
      "SHORTLISTED",
      "INTERVIEW",
      "REJECTED",
      "HIRED",
    ]),

    recruiterNotes:
      z.string().optional(),
  });
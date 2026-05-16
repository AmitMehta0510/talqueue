import { z } from "zod";

export const createReferralRequestSchema =
  z.object({
    companyName:
      z.string().min(2),

    jobRole:
      z.string().min(2),

    jobId:
      z.string().optional(),

    jobUrl:
      z.string().optional(),

    message:
      z.string().optional(),

    githubUrl:
      z.string().optional(),

    codingProfileUrl:
      z.string().optional(),

    resumeUrl:
      z.string().optional(),

    linkedinUrl:
      z.string().optional(),

    portfolioUrl:
      z.string().optional(),
  });

export const reviewReferralSchema =
  z.object({
    status: z.enum([
      "ACCEPTED",
      "REJECTED",
      "REFERRED",
    ]),
  });
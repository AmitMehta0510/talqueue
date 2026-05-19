import { z } from "zod";

export const createReferralRequestSchema = z
  .object({
    companyId: z.string().uuid().optional(),

    companySlug: z.string().optional(),

    companyName: z.string().min(2).optional(),

    jobRole: z.string().min(2),

    jobId: z.string().optional(),

    jobUrl: z.string().optional(),

    message: z.string().optional(),

    githubUrl: z.string().optional(),

    codingProfileUrl: z.string().optional(),

    resumeUrl: z.string().optional(),

    linkedinUrl: z.string().optional(),

    portfolioUrl: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.companyId) ||
      Boolean(data.companySlug) ||
      Boolean(data.companyName),
    {
      message: "companyId, companySlug, or companyName is required",
      path: ["companyId"],
    },
  );

export const reviewReferralSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED", "REFERRED"]),
});

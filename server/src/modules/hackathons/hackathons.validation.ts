import { z } from "zod";

export const createHackathonSchema =
  z.object({
    title: z.string().min(3),

    description: z.string().min(20),

    bannerUrl: z.string().optional(),

    startDate: z.string(),

    endDate: z.string(),

    registrationDeadline:
      z.string(),

    maxTeamSize:
      z.number().min(1),

    isExternal:
      z.boolean().optional(),

    externalUrl:
      z.string().optional().nullable(),

    sourcePlatform:
      z.string().optional().nullable(),

    organizerName:
      z.string().optional().nullable(),

    organizerWebsite:
      z.string().optional().nullable(),

    mode:
      z.enum(["ONLINE", "OFFLINE", "HYBRID"]).optional().nullable(),

    location:
      z.string().optional().nullable(),

    tags:
      z.array(z.string()).optional(),
  });

export const registerTeamSchema =
  z.object({
    teamId: z.string().uuid(),
  });

export const submitProjectSchema =
  z.object({
    teamId: z.string().uuid(),

    projectId: z.string().uuid(),

    githubUrl:
      z.string().optional(),

    demoUrl:
      z.string().optional(),

    presentationUrl:
      z.string().optional(),

    description:
      z.string().optional(),
  });

  export const reviewRegistrationSchema =
  z.object({
    status: z.enum([
      "APPROVED",
      "REJECTED",
    ]),
  });

  export const assignJudgeSchema =
  z.object({
    userId: z.string().uuid(),

    expertise:
      z.any().optional(),

    bio:
      z.string().optional(),
  });

export const evaluateSubmissionSchema =
  z.object({

    innovationScore:
      z.number().min(0).max(10),

    technicalScore:
      z.number().min(0).max(10),

    scalabilityScore:
      z.number().min(0).max(10),

    designScore:
      z.number().min(0).max(10),

    businessScore:
      z.number().min(0).max(10),

    presentationScore:
      z.number().min(0).max(10),

    feedback:
      z.string().optional(),
  });
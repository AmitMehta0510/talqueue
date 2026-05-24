import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(3),
  teamId: z.string().uuid().optional(),

  description: z.string().min(10),

  shortDescription: z.string().optional(),

  githubUrl: z.string().url().optional(),

  liveUrl: z.string().url().optional(),

  videoDemoUrl: z.string().url().optional(),

  screenshots: z.any().optional(),

  techStack: z.any().optional(),

  deploymentStatus: z.enum(["LIVE", "DEVELOPMENT", "ARCHIVED"]).optional(),

  visibility: z.enum(["PUBLIC", "PRIVATE"]),

  lookingFor: z.string().optional(),
});

export const joinProjectSchema = z.object({
  message: z.string().optional(),
});

export const reviewJoinRequestSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export const inviteToProjectSchema = z.object({
  message: z.string().optional(),
});

export const reviewProjectInviteSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

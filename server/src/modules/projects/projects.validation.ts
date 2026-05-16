import { z } from "zod";

export const createProjectSchema = z.object({
    title: z.string().min(3),
    teamId: z.string().uuid().optional(),

    description: z.string().min(10),

    visibility: z.enum([
      "PUBLIC",
      "PRIVATE",
    ]),

    lookingFor: z.string().optional(),
  });

export const joinProjectSchema = z.object({
    message: z.string().optional(),
  }).optional();

  export const reviewJoinRequestSchema =
  z.object({
    status: z.enum([
      "ACCEPTED",
      "REJECTED",
    ]),
  });

  export const inviteToProjectSchema =
  z.object({
    message:
      z.string().optional(),
  });

export const reviewProjectInviteSchema =
  z.object({
    status: z.enum([
      "ACCEPTED",
      "REJECTED",
    ]),
  });
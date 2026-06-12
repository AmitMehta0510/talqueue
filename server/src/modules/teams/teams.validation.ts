import { z } from "zod";

export const createTeamSchema =
  z.object({

    name:
      z.string().min(3),

    description:
      z.string().optional(),

    members:
      z.array(
        z.string().uuid()
      ).optional(),
  });

export const updateTeamSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
});

export const inviteMemberSchema =
  z.object({

    invitedUserId:
      z.string().uuid(),

    message:
      z.string().optional(),
  });

export const reviewInviteSchema =
  z.object({

    status:
      z.enum([
        "ACCEPTED",
        "REJECTED",
      ]),
  });

export const promoteMemberSchema = z.object({
  role: z.enum(["MEMBER", "ADMIN"]),
});
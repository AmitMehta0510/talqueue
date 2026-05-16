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
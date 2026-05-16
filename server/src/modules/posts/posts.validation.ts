import { z } from "zod";

export const createPostSchema =
  z.object({
    content: z.string().min(1),

    type: z.enum([
      "GENERAL",
      "PROJECT_UPDATE",
      "EVENT",
      "HACKATHON",
      "ACHIEVEMENT",
    ]),
  });

export const createCommentSchema =
  z.object({
    content: z.string().min(1),
  });
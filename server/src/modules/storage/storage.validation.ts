import { z } from "zod";

export const getPresignedUrlSchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(255, "Filename must not exceed 255 characters"),
  contentType: z
    .string()
    .trim()
    .min(1, "Content type is required")
    .regex(/^[a-zA-Z-]+\/[a-zA-Z0-9.+-]+$/, "Invalid content type format"),
  purpose: z.enum(["avatar", "letterhead", "attachment"], {
    message: "Purpose must be one of: avatar, letterhead, attachment",
  }),
});

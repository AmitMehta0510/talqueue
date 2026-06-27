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

/**
 * Schema for `POST /storage/validate`.
 *
 * `fileBase64` — The first 4 096 bytes of the file encoded as Base64.
 *               Minimum 8 chars: a 4-byte magic sequence encodes to 8 Base64 chars.
 * `purpose`    — Reuses the same enum as the presigned-URL schema so the
 *               client sends the same value for both requests.
 */
export const validateFileSchema = z.object({
  fileBase64: z
    .string()
    .trim()
    .min(8, "fileBase64 must contain at least 4 bytes of file content (8+ base64 chars)"),
  purpose: z.enum(["avatar", "letterhead", "attachment"], {
    message: "Purpose must be one of: avatar, letterhead, attachment",
  }),
});

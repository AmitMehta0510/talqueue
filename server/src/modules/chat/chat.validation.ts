import { z } from "zod";

export const createDirectConversationSchema =
  z.object({
    userId: z.string().uuid(),
  });

export const createGroupConversationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  participantIds: z.array(z.string().uuid()).min(1).max(99),
});

export const participantSchema = z.object({
  userId: z.string().uuid(),
});

export const muteConversationSchema = z.object({
  muted: z.boolean().optional(),
});

export const attachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().url("Must be a valid URL"),
  mimeType: z.string().trim().min(1).max(150),
  size: z.number().int().nonnegative().max(25 * 1024 * 1024),
  type: z.enum(["IMAGE", "VIDEO", "FILE"]).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().nonnegative().optional(),
});

export const uploadAttachmentsSchema = z.object({
  attachments: z.array(attachmentSchema).min(1).max(10),
});

export const sendMessageSchema =
  z.object({
    content: z.string().trim().max(5000).optional(),
    type: z.enum(["TEXT", "IMAGE", "VIDEO", "FILE", "SYSTEM"]).optional(),
    attachments: z.array(attachmentSchema).max(10).optional(),
    replyToMessageId: z.string().uuid().optional(),
  }).refine(
    (data) => Boolean(data.content) || Boolean(data.attachments?.length),
    {
      message: "Message requires content or attachments",
    },
  );

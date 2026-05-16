import { z } from "zod";

export const createDirectConversationSchema =
  z.object({
    userId: z.string().uuid(),
  });

export const sendMessageSchema =
  z.object({
    content: z.string().min(1),
  });
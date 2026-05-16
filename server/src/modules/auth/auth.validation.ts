import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/)
  .optional(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.string(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
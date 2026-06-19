import { z } from "zod";

export const publicSignupRoles = [
  "STUDENT",
  "PROFESSOR",
  "PROFESSIONAL",
  "RECRUITER",
] as const;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "Username can only contain letters, numbers, underscores, and dots",
    )
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(publicSignupRoles),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const sendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().min(1),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;



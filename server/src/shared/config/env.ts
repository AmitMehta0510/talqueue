import { z } from "zod";

const envSchema = z.object({
  PORT: z.string(),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

export const env = envSchema.parse(process.env);

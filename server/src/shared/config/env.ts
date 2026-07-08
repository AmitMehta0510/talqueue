import { z } from "zod";

const envSchema = z.object({
  // Core
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  // Short-lived access token (15 min). Pairs with a 30-day refresh token
  // stored in an HttpOnly cookie — see auth.service.ts for the full flow.
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.string().default("30"),

  // Client (required in production for CORS — optional in dev/test)
  CLIENT_URL: z.string().optional(),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Elasticsearch (optional — service is skipped if unhealthy)
  ELASTICSEARCH_NODE: z.string().optional(),

  // GitHub scraper token (optional — scraper degrades gracefully if absent)
  GITHUB_TOKEN: z.string().optional(),

  // AWS S3 (optional, fallback to mock S3 in development/test if keys/bucket name are missing)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_S3_BUCKET_NAME: z.string().optional(),
});

export const env = envSchema.parse(process.env);

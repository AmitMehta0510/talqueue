import { z } from "zod";

const envSchema = z.object({
  // Core
  PORT: z.string().default("5000"),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Elasticsearch (optional — service is skipped if unhealthy)
  ELASTICSEARCH_NODE: z.string().optional(),

  // GitHub scraper token (optional — scraper degrades gracefully if absent)
  GITHUB_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);

import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

export const paginationQuerySchema = z.object({
  cursor: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid().optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const postDetailQuerySchema = z.object({
  commentsLimit: z.coerce.number().int().min(1).max(50).default(20),
  repliesLimit: z.coerce.number().int().min(1).max(20).default(3),
});

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(60),
  cursor: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid().optional(),
  ),
});

export const trendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

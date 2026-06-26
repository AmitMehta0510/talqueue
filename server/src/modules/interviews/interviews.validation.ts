import { z } from "zod";

// ─── Shared enum helpers ──────────────────────────────────────────────────────

export const interviewRoleTagEnum = z.enum([
  "SDE_1",
  "SDE_2",
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "DEVOPS",
  "DATA_ML",
  "MOBILE",
  "SYSTEM_DESIGN",
  "BEHAVIORAL",
]);

export const interviewDifficultyEnum = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

export const interviewCompanyTagEnum = z.enum([
  "FAANG",
  "STARTUP",
  "MNC",
  "ANY",
]);

export const interviewRoundTypeEnum = z.enum([
  "CODING",
  "SYSTEM_DESIGN",
  "HR_BEHAVIORAL",
  "APTITUDE",
]);

export const interviewFormatTagEnum = z.enum([
  "MOCK_INTERVIEW",
  "QA_ONLY",
  "EXPLANATION",
  "WHITEBOARD",
]);

// ─── Public listing query ─────────────────────────────────────────────────────

export const interviewQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(50).default(20),
  roleTag:    interviewRoleTagEnum.optional(),
  difficulty: interviewDifficultyEnum.optional(),
  companyTag: interviewCompanyTagEnum.optional(),
  roundType:  interviewRoundTypeEnum.optional(),
  formatTag:  interviewFormatTagEnum.optional(),
  langTag:    z.string().max(60).optional(),    // partial match against langTags[]
  search:     z.string().max(100).optional(),   // title search
});

export type InterviewQueryParams = z.infer<typeof interviewQuerySchema>;

// ─── Admin create ─────────────────────────────────────────────────────────────

export const createInterviewResourceSchema = z.object({
  title:        z.string().min(3).max(200),
  sourceUrl:    z.string().url(),
  youtubeId:    z.string().min(5).max(20),
  channelName:  z.string().max(100).optional(),
  thumbnailUrl: z.string().url().optional(),
  duration:     z.number().int().positive().optional(),
  roleTag:      interviewRoleTagEnum,
  difficulty:   interviewDifficultyEnum,
  companyTag:   interviewCompanyTagEnum.default("ANY"),
  roundType:    interviewRoundTypeEnum.optional(),
  langTags:     z.array(z.string().max(40)).max(10).default([]),
  formatTag:    interviewFormatTagEnum.optional(),
});

export type CreateInterviewResourceInput = z.infer<typeof createInterviewResourceSchema>;

// ─── Admin update (all fields optional) ──────────────────────────────────────

export const updateInterviewResourceSchema = createInterviewResourceSchema.partial();

export type UpdateInterviewResourceInput = z.infer<typeof updateInterviewResourceSchema>;

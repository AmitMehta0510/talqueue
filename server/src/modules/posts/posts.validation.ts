import { z } from "zod";

export const createPostSchema =
  z.object({
    content: z.string().min(1),

    type: z.enum([
      "GENERAL",
      "PROJECT_UPDATE",
      "EVENT",
      "HACKATHON",
      "ACHIEVEMENT",
    ]),

    media: z.any().optional(),

    images: z.array(z.string()).optional(),

    videos: z.array(z.string()).optional(),

    video: z.union([z.string(), z.array(z.string())]).optional(),

    attachments:
      z.any().optional(),

    thumbnailUrl:
      z.string().optional(),

    mediaUrl:
      z.string().url().optional(),

    mentions:
      z.array(z.string().uuid())
        .optional(),

    tags:
      z.array(z.string())
        .optional(),

    visibility: z.enum([
      "PUBLIC",
      "CONNECTIONS",
      "COLLEGE_ONLY",
      "TEAM_ONLY",
    ]).optional(),

    collegeId:
      z.string().uuid()
        .optional(),

    departmentId:
      z.string().uuid()
        .optional(),

    companyCommunityId:
      z.string().uuid()
        .optional(),

    projectId:
      z.string().uuid()
        .optional(),

    hackathonId:
      z.string().uuid()
        .optional(),
  });

export const updatePostSchema =
  z.object({
    content:
      z.string().min(1)
        .optional(),

    media:
      z.any().optional(),

    images:
      z.array(z.string()).optional(),

    videos:
      z.array(z.string()).optional(),

    video:
      z.union([z.string(), z.array(z.string())]).optional(),

    attachments:
      z.any().optional(),

    thumbnailUrl:
      z.string().optional(),

    visibility: z.enum([
      "PUBLIC",
      "CONNECTIONS",
      "COLLEGE_ONLY",
      "TEAM_ONLY",
    ]).optional(),

    tags:
      z.array(z.string())
        .optional(),
  });

export const createCommentSchema =
  z.object({
    content:
      z.string().min(1),

    attachments:
      z.any().optional(),

    mentions:
      z.array(z.string().uuid())
        .optional(),

    parentCommentId:
      z.string().uuid()
        .optional(),
  });
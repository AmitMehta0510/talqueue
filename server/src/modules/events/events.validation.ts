import { z } from "zod";
import { EventType } from "@prisma/client";

export const createEventSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().optional().nullable(),
  meetingUrl: z.string().url().optional().nullable().or(z.literal("")),
  capacity: z.number().int().positive().optional().nullable(),
  type: z.nativeEnum(EventType).default(EventType.GENERAL),
  collegeId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  communityId: z.string().uuid().optional().nullable(),
});

export const updateEventSchema = createEventSchema.partial();

import { z } from "zod";

export const createCollegeSchema = z.object({
  name: z.string().min(2),

  state: z.string().max(120).optional(),

  city: z.string().max(120).optional(),

  website: z.string().url().optional(),

  logoUrl: z.string().url().optional(),
});

export const createDepartmentSchema =
  z.object({
    name: z.string().min(2),

    collegeId: z.string().uuid(),
  });

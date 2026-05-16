import { z } from "zod";

export const createCollegeSchema = z.object({
  name: z.string().min(2),

  state: z.string().optional(),

  city: z.string().optional(),

  website: z.string().optional(),

  logoUrl: z.string().optional(),
});

export const createDepartmentSchema =
  z.object({
    name: z.string().min(2),

    collegeId: z.string().uuid(),
  });
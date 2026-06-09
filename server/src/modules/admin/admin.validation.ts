import { z } from "zod";

export const assignCollegeAdminSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

export const assignCompanyAdminSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
  // Optional: scope this admin to a specific office city.
  // If omitted, the user becomes an admin for the entire company.
  officeCity: z.string().max(120).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "BANNED"]),
});

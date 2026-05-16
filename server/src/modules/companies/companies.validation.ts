import { z } from "zod";

export const createCompanySchema =
  z.object({
    name:
      z.string().min(2),

    websiteUrl:
      z.string().optional(),

    description:
      z.string().optional(),

    tagline:
      z.string().optional(),

    headquarters:
      z.string().optional(),

    industry:
      z.string().optional(),

    foundedYear:
      z.number().optional(),

    type:
      z.enum([
        "STARTUP",
        "PRODUCT_BASED",
        "SERVICE_BASED",
        "ENTERPRISE",
        "MNC",
        "OTHER",
      ]).optional(),

    size:
      z.enum([
        "SOLO",
        "SMALL",
        "MEDIUM",
        "LARGE",
        "ENTERPRISE",
      ]).optional(),
  });
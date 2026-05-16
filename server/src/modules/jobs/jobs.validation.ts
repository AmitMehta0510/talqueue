import { z } from "zod";

export const createJobSchema =
  z.object({
    companyId:
      z.string(),

    title:
      z.string().min(2),

    description:
      z.string().min(10),

    requirements:
      z.string().optional(),

    responsibilities:
      z.string().optional(),

    perks:
      z.string().optional(),

    location:
      z.string().optional(),

    workMode:
      z.enum([
        "REMOTE",
        "HYBRID",
        "ONSITE",
      ]).optional(),

    type:
      z.enum([
        "FULL_TIME",
        "INTERNSHIP",
        "PART_TIME",
        "CONTRACT",
        "FREELANCE",
      ]),

    experienceLevel:
      z.string().optional(),

    salaryMin:
      z.number().optional(),

    salaryMax:
      z.number().optional(),

    openings:
      z.number().optional(),

    skillsRequired:
      z.array(z.string()),

    applicationDeadline:
      z.string().optional(),

    applyUrl:
      z.string().optional(),
  });
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { EmploymentType, Prisma, SkillLevel } from "@prisma/client";
import AppError from "shared/errors/AppError";
import { syncUserToResdex } from "services/resdexSyncService";
import { addReputation } from "../reputation/reputation.service";
import { createActivity } from "../activities/activity.service";
import { calculateEngineeringScore } from "../reputation/engineering-score.service";
import { autoJoinUserCommunities } from "modules/community/community.service";
import { createHash, randomBytes } from "crypto";
import slugify from "slugify";
import { verifyUserSkills } from "./skill-verification.service";
import { ensureOfficialDepartmentCommunity } from "modules/colleges/colleges.service";
import { getOrSetCache, bustCache } from "shared/database/redisCache";

export type UserWriteClient = Prisma.TransactionClient | typeof prisma;

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface UpdateProfileData {
  username?: string;
  fullName?: string;
  bio?: string;
  headline?: string;
  location?: string;
  country?: string | null;  // ISO 3166-1 alpha-2, e.g. "IN", "US" — null clears the field
  avatarUrl?: string;
  bannerUrl?: string;
  resumeUrl?: string;
  availabilityText?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  leetcodeUrl?: string | null;
  hackerrankUrl?: string | null;
  gfgUrl?: string | null;
  graduationYear?: number;
  collegeId?: string;
  departmentId?: string | null;
  acceptingReferrals?: boolean;
  openToWork?: boolean;
  openToInternship?: boolean;
  acceptingCollaborators?: boolean;
  acceptingMentorship?: boolean;
  availabilityStatus?: string;
}

export interface AddSkillData {
  skillId: string;
  level: SkillLevel;
}

export interface AddExperienceData {
  companyName: string;
  companyWebsiteUrl?: string;
  title: string;
  employmentType: string; // narrowed to EmploymentType by normalizeEmploymentType() at runtime
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  workEmail?: string;
  managerName?: string;
  managerEmail?: string;
  managerLinkedinUrl?: string;
  documents?: Prisma.InputJsonValue;
  skillsUsed?: string[];
  achievements?: Prisma.InputJsonValue;
  techStack?: string[];
  teamSize?: number;
}

export interface AddEducationData {
  collegeId?: string | null;
  customCollegeName?: string | null;
  departmentId?: string | null;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  current?: boolean;
  cgpa?: number | null;
  backlogs?: number | null;
  currentYear?: number | null;
}

export const MAX_SKILLS = 30;
export const DEFAULT_SECTION_LIMIT = 20;
export const MAX_SECTION_LIMIT = 50;

// ─── Standard Department Cache ──────────────────────────────────────────────
// StandardDepartment rows are reference data — they change only on admin
// mutations and are queried on every profile edit that involves a department
// name string. Caching them for 1 hour eliminates the full-table scan from
// the hot write path and is invalidated explicitly when data changes.
export const STANDARD_DEPT_CACHE_KEY = "ref:standardDepartments";
export const STANDARD_DEPT_CACHE_TTL = 60 * 60; // 1 hour

export type StandardDeptRow = {
  id: string;
  name: string;
  aliases: string[];
};

/**
 * Returns the full StandardDepartment list from Redis cache (1-hour TTL).
 * Falls back to a live Prisma query on cache miss. Exported so admin routes
 * can call bustCache(STANDARD_DEPT_CACHE_KEY) after create/update/delete.
 */
export const getCachedStandardDepartments = () =>
  getOrSetCache<StandardDeptRow[]>(
    STANDARD_DEPT_CACHE_KEY,
    STANDARD_DEPT_CACHE_TTL,
    () =>
      prisma.standardDepartment.findMany({
        select: { id: true, name: true, aliases: true },
      })
  );

/** Call this from admin endpoints after any StandardDepartment mutation. */
export const bustStandardDepartmentCache = () =>
  bustCache(STANDARD_DEPT_CACHE_KEY);
// ────────────────────────────────────────────────────────────────────────────

export const userProfileSelect = {
  id: true,
  email: true,
  username: true,
  status: true,
  followersCount: true,
  followingCount: true,
  connectionCount: true,
  postCount: true,
  profileCompleteness: true,
  verifiedEngineer: true,
  availabilityStatus: true,
  reputationScore: true,
  engineeringScore: true,
  trustLevel: true,
  primaryRole: true,
  openToWork: true,
  openToInternship: true,
  acceptingCollaborators: true,
  acceptingReferrals: true,
  acceptingMentorship: true,
  createdAt: true,
  updatedAt: true,

  profile: {
    include: {
      college: true,
      department: true,
    },
  },

  _count: {
    select: {
      skills: true,
      experiences: true,
      educations: true,
      roles: true,
    },
  },

  tpoMemberships: {
    select: {
      id: true,
      collegeId: true,
      college: {
        select: {
          id: true,
          name: true,
          normalizedKey: true,
          logoUrl: true,
        },
      },
    },
  },

  collegeAdminships: {
    select: {
      id: true,
      collegeId: true,
      college: {
        select: {
          id: true,
          name: true,
          normalizedKey: true,
          logoUrl: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export const userFullProfileSelect = {
  ...userProfileSelect,

  skills: {
    select: {
      id: true,
      level: true,
      verified: true,
      verificationSource: true,
      verificationProof: true,
      skill: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc" as const,
    },

    take: DEFAULT_SECTION_LIMIT,
  },

  experiences: {
    select: {
      id: true,
      title: true,
      employmentType: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      description: true,
      verified: true,
      verificationScore: true,
      verifiedAt: true,
      workEmail: true,
      workEmailVerified: true,
      managerName: true,
      managerLinkedinUrl: true,
      managerEmail: true,
      skillsUsed: true,
      techStack: true,
      teamSize: true,
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          websiteUrl: true,
          slug: true,
        },
      },
    },

    orderBy: [
      {
        isCurrent: "desc" as const,
      },

      {
        startDate: "desc" as const,
      },
    ],

    take: DEFAULT_SECTION_LIMIT,
  },

  educations: {
    select: {
      id: true,
      degree: true,
      fieldOfStudy: true,
      startYear: true,
      endYear: true,
      current: true,
      cgpa: true,
      backlogs: true,
      currentYear: true,
      isAlumni: true,
      alumniVerified: true,
      collegeEmail: true,
      collegeEmailVerified: true,
      college: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          website: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },

    orderBy: [
      {
        current: "desc" as const,
      },

      {
        startYear: "desc" as const,
      },
    ],

    take: DEFAULT_SECTION_LIMIT,
  },

  roles: {
    select: {
      id: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },

  ownedProjects: {
    where: {
      visibility: "PUBLIC",
      deletedAt: null,
      NOT: {
        status: "DELETED",
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      githubUrl: true,
      liveUrl: true,
      techStack: true,
      createdAt: true,
      owner: {
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  },
  codingProfiles: {
    select: {
      platform: true,
      url: true,
      username: true,
    },
  },
} satisfies Prisma.UserSelect;

export const compactEducationInclude = {
  college: true,
  department: true,
} satisfies Prisma.EducationInclude;

export const stripUndefined = (data: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

export const isDomainAllowed = (emailDomain: string, allowedDomain: string): boolean => {
  const domainLower = emailDomain.toLowerCase().trim();
  const allowedLower = allowedDomain.toLowerCase().trim();
  return domainLower === allowedLower || domainLower.endsWith("." + allowedLower);
};

export const toDate = (value: string, fieldName: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return date;
};

export const clampLimit = (limit: number | undefined) =>
  Math.min(MAX_SECTION_LIMIT, Math.max(1, limit || DEFAULT_SECTION_LIMIT));

export const normalizeSearchText = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

export const buildCompanySlug = (name: string) =>
  slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  }) || "company";

export const buildStableCompanySlug = (name: string) => {
  const baseSlug = buildCompanySlug(name);

  const hash = createHash("sha1").update(name).digest("hex").slice(0, 8);

  return `${baseSlug}-${hash}`;
};

export const buildFallbackCompanySlug = (name: string) => {
  const baseSlug = buildCompanySlug(name);

  return `${baseSlug}-${randomBytes(4).toString("hex")}`;
};

export const assertDepartmentBelongsToCollege = async (
  tx: UserWriteClient,

  collegeId: string | null | undefined,

  departmentId: string | null | undefined,
) => {
  if (!departmentId) {
    return;
  }

  if (!collegeId) {
    throw new AppError("College is required when department is provided", 400);
  }

  const department = await tx.department.findUnique({
    where: {
      id: departmentId,
    },

    select: {
      collegeId: true,
    },
  });

  if (!department) {
    throw new AppError("Department not found", 404);
  }

  if (department.collegeId !== collegeId) {
    throw new AppError("Department does not belong to selected college", 400);
  }
};

export const normalizeEmploymentType = (employmentType: string) => {
  if (employmentType === "INTERNSHIP") {
    return EmploymentType.INTERN;
  }

  switch (employmentType) {
    case EmploymentType.FULL_TIME:
    case EmploymentType.INTERN:
    case EmploymentType.FREELANCE:
    case EmploymentType.CONTRACT:
      return employmentType;

    default:
      throw new AppError("Invalid employment type", 400);
  }
};

export const assertNoDuplicateEducation = async (
  tx: UserWriteClient,

  userId: string,

  data: AddEducationData,
) => {
  const existingEducation = await tx.education.findFirst({
    where: {
      userId,

      collegeId: data.collegeId ?? null,

      departmentId: data.departmentId ?? null,

      degree: data.degree ?? null,

      fieldOfStudy: data.fieldOfStudy ?? null,

      startYear: data.startYear ?? null,

      endYear: data.endYear ?? null,
    },

    select: {
      id: true,
    },
  });

  if (existingEducation) {
    throw new AppError("Education already exists", 400);
  }
};

export const resolveCollegeDepartment = async (
  tx: UserWriteClient,
  userId: string,
  collegeId: string,
  departmentIdOrStandardIdOrCustomName: string | null | undefined,
  fieldOfStudy?: string | null
) => {
  const input = departmentIdOrStandardIdOrCustomName?.trim();
  if (!input) {
    return { departmentId: null, fieldOfStudy: fieldOfStudy || null };
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);

  if (isUuid) {
    // 1. Check StandardDepartment ID
    const standardDept = await tx.standardDepartment.findUnique({
      where: { id: input },
    });

    if (standardDept) {
      let collegeDept = await tx.department.findUnique({
        where: {
          collegeId_standardDepartmentId: {
            collegeId,
            standardDepartmentId: standardDept.id,
          },
        },
      });

      if (!collegeDept) {
        collegeDept = await tx.department.create({
          data: {
            name: standardDept.name,
            collegeId,
            standardDepartmentId: standardDept.id,
          },
        });

        const college = await tx.college.findUnique({
          where: { id: collegeId },
          select: { name: true },
        });

        if (college) {
          await ensureOfficialDepartmentCommunity(userId, {
            id: collegeDept.id,
            name: standardDept.name,
            collegeId,
            college: { name: college.name },
          });
        }
      }

      return { departmentId: collegeDept.id, fieldOfStudy: standardDept.name };
    }

    // 2. Check if it's already an existing college-specific department ID
    const collegeDept = await tx.department.findFirst({
      where: { id: input, collegeId },
    });

    if (collegeDept) {
      return { departmentId: collegeDept.id, fieldOfStudy: collegeDept.name };
    }
  }

  // 3. Check alias or direct match on StandardDepartment
  // Uses a Redis-cached list (1-hour TTL) to avoid a full-table scan on every
  // profile update. The cache is busted by admin endpoints on any mutation.
  const standardDepts = await getCachedStandardDepartments();
  const normalizedInput = input.toLowerCase();

  const matchedStandard = standardDepts.find((sd) =>
    sd.name.toLowerCase() === normalizedInput ||
    sd.aliases.some((alias) => alias.toLowerCase() === normalizedInput)
  );

  if (matchedStandard) {
    let collegeDept = await tx.department.findUnique({
      where: {
        collegeId_standardDepartmentId: {
          collegeId,
          standardDepartmentId: matchedStandard.id,
        },
      },
    });

    if (!collegeDept) {
      collegeDept = await tx.department.create({
        data: {
          name: matchedStandard.name,
          collegeId,
          standardDepartmentId: matchedStandard.id,
        },
      });

      const college = await tx.college.findUnique({
        where: { id: collegeId },
        select: { name: true },
      });

      if (college) {
        await ensureOfficialDepartmentCommunity(userId, {
          id: collegeDept.id,
          name: matchedStandard.name,
          collegeId,
          college: { name: college.name },
        });
      }
    }

    return { departmentId: collegeDept.id, fieldOfStudy: matchedStandard.name };
  }

  // 4. Fallback to custom college-specific department
  let collegeDept = await tx.department.findFirst({
    where: {
      collegeId,
      name: { equals: input, mode: "insensitive" },
    },
  });

  if (!collegeDept) {
    collegeDept = await tx.department.create({
      data: {
        name: input,
        collegeId,
        standardDepartmentId: null,
      },
    });

    const college = await tx.college.findUnique({
      where: { id: collegeId },
      select: { name: true },
    });

    if (college) {
      await ensureOfficialDepartmentCommunity(userId, {
        id: collegeDept.id,
        name: input,
        collegeId,
        college: { name: college.name },
      });
    }
  }

  return { departmentId: collegeDept.id, fieldOfStudy: collegeDept.name };
};


export const assertNoExperienceConflict = async (
  userId: string,

  employmentType: EmploymentType,

  startDate: Date,

  endDate: Date | null,
) => {
  if (
    employmentType !== EmploymentType.FULL_TIME &&
    employmentType !== EmploymentType.INTERN
  ) {
    return;
  }

  const existingExperiences = await prisma.experience.findMany({
    where: {
      userId,

      employmentType: {
        in: [EmploymentType.FULL_TIME, EmploymentType.INTERN],
      },
    },

    select: {
      id: true,
      title: true,
      companyName: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
    },
  });

  const newEndDate = endDate || new Date("9999-12-31");

  const overlappingExperience = existingExperiences.find((experience) => {
    const existingEndDate =
      experience.endDate ||
      (experience.isCurrent ? new Date("9999-12-31") : new Date());

    return startDate <= existingEndDate && newEndDate >= experience.startDate;
  });

  if (overlappingExperience) {
    throw new AppError(
      `Experience overlaps with ${overlappingExperience.title} at ${overlappingExperience.companyName || "another company"}`,
      400,
    );
  }
};

export const getOrCreateCompany = async (
  tx: Prisma.TransactionClient,

  rawCompanyName: string,
  websiteUrl?: string,
) => {
  const companyName = normalizeSearchText(rawCompanyName);

  if (!companyName) {
    throw new AppError("Company name is required", 400);
  }

  const existingCompany = await tx.company.findFirst({
    where: {
      name: {
        equals: companyName,
        mode: "insensitive",
      },
    },
  });

  if (existingCompany) {
    if (websiteUrl && !existingCompany.websiteUrl) {
      return tx.company.update({
        where: { id: existingCompany.id },
        data: { websiteUrl },
      });
    }
    return existingCompany;
  }

  try {
    return await tx.company.upsert({
      where: {
        name: companyName,
      },

      update: websiteUrl ? { websiteUrl } : {},

      create: {
        name: companyName,

        slug: buildStableCompanySlug(companyName),

        websiteUrl,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const company = await tx.company.findFirst({
        where: {
          name: {
            equals: companyName,
            mode: "insensitive",
          },
        },
      });

      if (company) {
        if (websiteUrl && !company.websiteUrl) {
          return tx.company.update({
            where: { id: company.id },
            data: { websiteUrl },
          });
        }
        return company;
      }

      return tx.company.create({
        data: {
          name: companyName,

          slug: buildFallbackCompanySlug(companyName),

          websiteUrl,
        },
      });
    }

    throw error;
  }
};



// ─── Update interfaces (defined here so sub-services can re-export them) ─────

export interface UpdateExperienceData {
  title?: string;
  companyWebsiteUrl?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  workEmail?: string;
  managerName?: string;
  managerEmail?: string;
  managerLinkedinUrl?: string;
  skillsUsed?: string[];
  techStack?: string[];
  teamSize?: number;
}

export interface UpdateEducationData {
  collegeId?: string;
  departmentId?: string | null;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  current?: boolean;
  cgpa?: number | null;
  backlogs?: number | null;
  currentYear?: number | null;
}

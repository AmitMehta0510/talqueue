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

type UserWriteClient = Prisma.TransactionClient | typeof prisma;

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
  employmentType: EmploymentType | "INTERNSHIP";
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
}

const MAX_SKILLS = 30;
const DEFAULT_SECTION_LIMIT = 20;
const MAX_SECTION_LIMIT = 50;

const userProfileSelect = {
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
} satisfies Prisma.UserSelect;

const userFullProfileSelect = {
  ...userProfileSelect,

  skills: {
    include: {
      skill: true,
    },

    orderBy: {
      createdAt: "desc" as const,
    },

    take: DEFAULT_SECTION_LIMIT,
  },

  experiences: {
    include: {
      company: true,
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
    include: {
      college: true,
      department: true,
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
    include: {
      role: true,
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
    include: {
      owner: {
        include: {
          profile: true,
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

const compactEducationInclude = {
  college: true,
  department: true,
} satisfies Prisma.EducationInclude;

const stripUndefined = (data: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

const isDomainAllowed = (emailDomain: string, allowedDomain: string): boolean => {
  const domainLower = emailDomain.toLowerCase().trim();
  const allowedLower = allowedDomain.toLowerCase().trim();
  return domainLower === allowedLower || domainLower.endsWith("." + allowedLower);
};

const toDate = (value: string, fieldName: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return date;
};

const clampLimit = (limit: number | undefined) =>
  Math.min(MAX_SECTION_LIMIT, Math.max(1, limit || DEFAULT_SECTION_LIMIT));

const normalizeSearchText = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

const buildCompanySlug = (name: string) =>
  slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  }) || "company";

const buildStableCompanySlug = (name: string) => {
  const baseSlug = buildCompanySlug(name);

  const hash = createHash("sha1").update(name).digest("hex").slice(0, 8);

  return `${baseSlug}-${hash}`;
};

const buildFallbackCompanySlug = (name: string) => {
  const baseSlug = buildCompanySlug(name);

  return `${baseSlug}-${randomBytes(4).toString("hex")}`;
};

const assertDepartmentBelongsToCollege = async (
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

const normalizeEmploymentType = (employmentType: string) => {
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

const assertNoDuplicateEducation = async (
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
  const standardDepts = await tx.standardDepartment.findMany();
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


const assertNoExperienceConflict = async (
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

const getOrCreateCompany = async (
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

export const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: userProfileSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const getMyFullProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: userFullProfileSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const getUserFullProfile = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userId },
        { username: userId },
      ],
    },

    select: userFullProfileSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { email: _email, ...publicUser } = user;

  return publicUser;
};

export const getMySkills = async (
  userId: string,

  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const skills = await prisma.userSkill.findMany({
    where: {
      userId,
    },

    include: {
      skill: true,
    },

    orderBy: {
      createdAt: "desc",
    },

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },

          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const hasNextPage = skills.length > limit;

  const items = hasNextPage ? skills.slice(0, limit) : skills;

  return {
    skills: items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};

export const getMyExperiences = async (
  userId: string,

  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const experiences = await prisma.experience.findMany({
    where: {
      userId,
    },

    include: {
      company: true,
    },

    orderBy: [
      {
        isCurrent: "desc",
      },

      {
        startDate: "desc",
      },
    ],

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },

          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const hasNextPage = experiences.length > limit;

  const items = hasNextPage ? experiences.slice(0, limit) : experiences;

  return {
    experiences: items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};

export const getMyEducations = async (
  userId: string,

  params: PaginationParams = {},
) => {
  const limit = clampLimit(params.limit);

  const educations = await prisma.education.findMany({
    where: {
      userId,
    },

    include: compactEducationInclude,

    orderBy: [
      {
        current: "desc",
      },

      {
        startYear: "desc",
      },
    ],

    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },

          skip: 1,
        }
      : {}),

    take: limit + 1,
  });

  const hasNextPage = educations.length > limit;

  const items = hasNextPage ? educations.slice(0, limit) : educations;

  return {
    educations: items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};

export const searchSkills = async (query: string, limit = 12) => {
  const normalizedQuery = normalizeSearchText(query);
  const safeLimit = Math.min(MAX_SECTION_LIMIT, Math.max(1, limit || 12));

  if (normalizedQuery.length < 2) {
    return [];
  }

  return prisma.skill.findMany({
    where: {
      name: {
        startsWith: normalizedQuery,
        mode: "insensitive",
      },
    },

    orderBy: [
      {
        verified: "desc",
      },

      {
        searchScore: "desc",
      },

      {
        name: "asc",
      },
    ],

    take: safeLimit,
  });
};

export const upsertSkillByName = async (rawName: string) => {
  const name = rawName.trim();
  if (!name || name.length < 2) {
    throw new AppError("Skill name must be at least 2 characters", 400);
  }

  // Check if skill already exists (case-insensitive)
  const existing = await prisma.skill.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existing) return existing;

  return prisma.skill.create({
    data: { name },
  });
};


export const updateProfile = async (
  userId: string,
  data: UpdateProfileData,
) => {
  const {
    username,
    acceptingReferrals,
    openToWork,
    openToInternship,
    availabilityStatus,
    leetcodeUrl,
    hackerrankUrl,
    gfgUrl,

    ...profileData
  } = data;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        username: true,
        profile: {
          select: {
            fullName: true,
            collegeId: true,
            departmentId: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (username && username !== user.username) {
      const existingUsername = await tx.user.findUnique({
        where: {
          username,
        },

        select: {
          id: true,
        },
      });

      if (existingUsername && existingUsername.id !== userId) {
        throw new AppError("Username already taken", 400);
      }

      await tx.user.update({
        where: {
          id: userId,
        },

        data: {
          username,
        },
      });
    }

    if (
      acceptingReferrals !== undefined ||
      openToWork !== undefined ||
      openToInternship !== undefined ||
      availabilityStatus !== undefined
    ) {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          ...(acceptingReferrals !== undefined && { acceptingReferrals }),
          ...(openToWork !== undefined && { openToWork }),
          ...(openToInternship !== undefined && { openToInternship }),
          ...(availabilityStatus !== undefined && { availabilityStatus }),
        },
      });
    }

    const cleanProfileData = stripUndefined(profileData);

    const effectiveCollegeId =
      cleanProfileData.collegeId ?? user.profile?.collegeId ?? undefined;

    if (
      cleanProfileData.collegeId &&
      cleanProfileData.collegeId !== user.profile?.collegeId &&
      cleanProfileData.departmentId === undefined &&
      user.profile?.departmentId
    ) {
      cleanProfileData.departmentId = null;
    }

    if (cleanProfileData.collegeId) {
      const college = await tx.college.findUnique({
        where: {
          id: cleanProfileData.collegeId,
        },

        select: {
          id: true,
        },
      });

      if (!college) {
        throw new AppError("College not found", 404);
      }
    }

    await assertDepartmentBelongsToCollege(
      tx,
      effectiveCollegeId,
      cleanProfileData.departmentId,
    );

    if (Object.keys(cleanProfileData).length > 0 || !user.profile) {
      await tx.profile.upsert({
        where: {
          userId,
        },

        update: cleanProfileData,

        create: {
          userId,

          fullName:
            cleanProfileData.fullName ||
            user.profile?.fullName ||
            username ||
            user.username,

          ...cleanProfileData,
        },
      });
    }

    if (cleanProfileData.collegeId || cleanProfileData.departmentId) {
      await autoJoinUserCommunities(
        userId,
        {
          collegeId: cleanProfileData.collegeId ?? user.profile?.collegeId,

          departmentId:
            cleanProfileData.departmentId ?? user.profile?.departmentId,
        },
        tx,
      );
    }

    // Sync LeetCode URL
    if (leetcodeUrl !== undefined) {
      await tx.codingProfile.deleteMany({
        where: { userId, platform: "LeetCode" },
      });
      if (leetcodeUrl) {
        const usernameLC = leetcodeUrl.replace(/\/$/, "").split("/").pop() || "";
        await tx.codingProfile.create({
          data: {
            userId,
            platform: "LeetCode",
            url: leetcodeUrl,
            username: usernameLC,
          },
        });
      }
    }

    // Sync HackerRank URL
    if (hackerrankUrl !== undefined) {
      await tx.codingProfile.deleteMany({
        where: { userId, platform: "HackerRank" },
      });
      if (hackerrankUrl) {
        const usernameHR = hackerrankUrl.replace(/\/$/, "").split("/").pop() || "";
        await tx.codingProfile.create({
          data: {
            userId,
            platform: "HackerRank",
            url: hackerrankUrl,
            username: usernameHR,
          },
        });
      }
    }

    // Sync GeeksforGeeks URL
    if (gfgUrl !== undefined) {
      await tx.codingProfile.deleteMany({
        where: { userId, platform: "GeeksforGeeks" },
      });
      if (gfgUrl) {
        const usernameGFG = gfgUrl.replace(/\/$/, "").split("/").pop() || "";
        await tx.codingProfile.create({
          data: {
            userId,
            platform: "GeeksforGeeks",
            url: gfgUrl,
            username: usernameGFG,
          },
        });
      }
    }

    return tx.user.findUnique({
      where: {
        id: userId,
      },

      select: userProfileSelect,
    });
  });

  // Trigger skill verification asynchronously in the background
  const hasProfileLinksUpdated =
    data.githubUrl !== undefined ||
    leetcodeUrl !== undefined ||
    hackerrankUrl !== undefined ||
    gfgUrl !== undefined;

  if (hasProfileLinksUpdated) {
    verifyUserSkills(userId).catch((err) => {
      console.error("Skill verification background job error:", err);
    });
  }

  // Sync user profile to Resdex
  syncUserToResdex(userId);
};

export const addSkill = async (userId: string, data: AddSkillData) => {
  const skill = await prisma.skill.findUnique({
    where: {
      id: data.skillId,
    },

    select: {
      id: true,
    },
  });

  if (!skill) {
    throw new AppError("Skill not found", 404);
  }

  // Check if this is a new skill (not an update of an existing one)
  const existingUserSkill = await prisma.userSkill.findUnique({
    where: {
      userId_skillId: {
        userId,
        skillId: data.skillId,
      },
    },
    select: { id: true },
  });

  if (!existingUserSkill) {
    const skillCount = await prisma.userSkill.count({ where: { userId } });
    if (skillCount >= MAX_SKILLS) {
      throw new AppError(`You can add a maximum of ${MAX_SKILLS} skills`, 400);
    }
  }

  const result = await prisma.userSkill.upsert({
    where: {
      userId_skillId: {
        userId,
        skillId: data.skillId,
      },
    },

    update: {
      level: data.level,
    },

    create: {
      userId,
      skillId: data.skillId,
      level: data.level,
    },

    include: {
      skill: true,
    },
  });

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  return result;
};

export const addExperience = async (
  userId: string,

  data: AddExperienceData,
) => {
  const companyName = normalizeSearchText(data.companyName);

  if (!companyName) {
    throw new AppError("Company name is required", 400);
  }

  const startDate = toDate(data.startDate, "startDate");

  const endDate =
    data.isCurrent || !data.endDate ? null : toDate(data.endDate, "endDate");

  if (endDate && endDate < startDate) {
    throw new AppError("End date cannot be before start date", 400);
  }

  const employmentType = normalizeEmploymentType(data.employmentType);

  await assertNoExperienceConflict(userId, employmentType, startDate, endDate);

  // Verification scoring
  let verificationScore = 0;

  // Work email
  if (data.workEmail) {
    verificationScore += 25;
  }

  // Manager email
  if (data.managerEmail) {
    verificationScore += 15;
  }

  // Documents
  if (
    data.documents &&
    Array.isArray(data.documents) &&
    data.documents.length > 0
  ) {
    verificationScore += 25;
  }

  // Tech stack
  if (data.techStack && Array.isArray(data.techStack)) {
    verificationScore += 10;
  }

  // Skills used
  if (data.skillsUsed && Array.isArray(data.skillsUsed)) {
    verificationScore += 10;
  }

  // Duration check
  const scoringEndDate = endDate || new Date();

  const months =
    (scoringEndDate.getTime() - startDate.getTime()) /
    (1000 * 60 * 60 * 24 * 30);

  if (months >= 3) {
    verificationScore += 15;
  }

  // Verified threshold
  const verified = verificationScore >= 60;

  const experience = await prisma.$transaction(async (tx) => {
    const company = await getOrCreateCompany(tx, companyName, data.companyWebsiteUrl);

    if (data.isCurrent) {
      await tx.experience.updateMany({
        where: {
          userId,
          isCurrent: true,
        },

        data: {
          isCurrent: false,
        },
      });
    }

    const createdExperience = await tx.experience.create({
      data: {
        userId,

        companyId: company.id,

        companyName: company.name,

        title: data.title,

        employmentType,

        startDate,

        endDate,

        isCurrent: data.isCurrent || false,

        description: data.description,

        //
        // Authenticity
        //
        verified,

        verificationScore,

        verifiedAt: verified ? new Date() : null,

        workEmail: data.workEmail,

        managerName: data.managerName,

        managerEmail: data.managerEmail,

        managerLinkedinUrl: data.managerLinkedinUrl,

        documents: data.documents,

        skillsUsed: data.skillsUsed,

        achievements: data.achievements,

        techStack: data.techStack,

        teamSize: data.teamSize,
      },

      include: {
        company: true,
      },
    });

    return createdExperience;
  });

  setImmediate(() => {
    const tasks = [
      async () => {
        await autoJoinUserCommunities(userId, { companyId: experience.companyId });
      },
      async () => {
        await addReputation(
          userId,
          "EXPERIENCE_ADDED",
          verified ? 20 : 5,
          verified ? "Added verified experience" : "Added experience",
          { experienceId: experience.id }
        );
      },
      async () => {
        await createActivity(
          userId,
          "EXPERIENCE_ADDED",
          "Added experience",
          `Added experience at "${experience.companyName || companyName}"`,
          { experienceId: experience.id }
        );
      },
      async () => {
        await calculateEngineeringScore(userId);
      },
      async () => {
        await syncUserToResdex(userId);
      }
    ];

    for (const task of tasks) {
      task().catch((err) => {
        console.error("Error in asynchronous post-experience pipeline task:", err);
      });
    }
  });

  return experience;
};

export const addEducation = async (userId: string, data: AddEducationData) => {
  // Guard: must have either a known college OR a custom name
  const hasKnownCollege = Boolean(data.collegeId);
  const hasCustomCollege = Boolean(data.customCollegeName?.trim());

  if (!hasKnownCollege && !hasCustomCollege) {
    throw new AppError(
      "Please select a college or provide a college name",
      400,
    );
  }

  if (data.startYear && data.endYear && data.endYear < data.startYear) {
    throw new AppError("End year cannot be before start year", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // ── Track A: Known college in DB ─────────────────────────────────────
    if (hasKnownCollege) {
      const college = await tx.college.findUnique({
        where: { id: data.collegeId! },
        select: { id: true },
      });

      if (!college) {
        throw new AppError("College not found", 404);
      }

      const { departmentId, fieldOfStudy } = await resolveCollegeDepartment(
        tx,
        userId,
        data.collegeId!,
        data.departmentId,
        data.fieldOfStudy
      );

      await assertNoDuplicateEducation(tx, userId, {
        ...data,
        departmentId,
        fieldOfStudy: fieldOfStudy || undefined,
      });

      if (data.current) {
        await tx.education.updateMany({
          where: { userId, current: true },
          data: { current: false },
        });
      }

      const education = await tx.education.create({
        data: {
          userId,
          collegeId: data.collegeId!,
          departmentId,
          degree: data.degree,
          fieldOfStudy: fieldOfStudy || undefined,
          startYear: data.startYear,
          endYear: data.endYear,
          current: data.current || false,
        },
        include: compactEducationInclude,
      });

      // Sync to user's profile
      await tx.profile.upsert({
        where: { userId },
        update: { collegeId: data.collegeId!, departmentId: departmentId || null },
        create: {
          userId,
          fullName: "",
          collegeId: data.collegeId!,
          departmentId: departmentId || null,
        },
      });

      return education;
    }

    // ── Track B: Custom (unlisted) college ───────────────────────────────
    const customName = data.customCollegeName!.trim();

    let resolvedFieldOfStudy = data.fieldOfStudy;
    if (data.departmentId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.departmentId);
      if (isUuid) {
        const standardDept = await tx.standardDepartment.findUnique({
          where: { id: data.departmentId },
        });
        if (standardDept) {
          resolvedFieldOfStudy = standardDept.name;
        }
      } else {
        resolvedFieldOfStudy = data.departmentId;
      }
    }

    await assertNoDuplicateEducation(tx, userId, {
      ...data,
      departmentId: null,
      fieldOfStudy: resolvedFieldOfStudy,
    });

    if (data.current) {
      await tx.education.updateMany({
        where: { userId, current: true },
        data: { current: false },
      });
    }

    const education = await tx.education.create({
      data: {
        userId,
        collegeId: null,
        customCollegeName: customName,
        departmentId: null,
        degree: data.degree,
        fieldOfStudy: resolvedFieldOfStudy,
        startYear: data.startYear,
        endYear: data.endYear,
        current: data.current || false,
      },
      include: compactEducationInclude,
    });

    // Create a CollegeRequest for admin review (deduplicate same name per user)
    const existingRequest = await tx.collegeRequest.findFirst({
      where: { userId, name: customName, status: "PENDING" },
      select: { id: true },
    });
    if (!existingRequest) {
      await tx.collegeRequest.create({
        data: { userId, name: customName },
      });
    }

    return education;
  });

  setImmediate(() => {
    const tasks = [
      async () => {
        if (hasKnownCollege && result.collegeId) {
          await autoJoinUserCommunities(userId, {
            collegeId: result.collegeId,
            departmentId: result.departmentId,
          });
        }
      },
      async () => {
        await syncUserToResdex(userId);
      }
    ];

    for (const task of tasks) {
      task().catch((err) => {
        console.error("Error in asynchronous post-education pipeline task:", err);
      });
    }
  });

  return result;
};

// ─── Remove Operations ──────────────────────────────────────────────────────

export const removeSkill = async (userId: string, skillId: string) => {
  const userSkill = await prisma.userSkill.findFirst({
    where: { userId, skillId },
    select: { id: true },
  });

  if (!userSkill) {
    throw new AppError("Skill not found on your profile", 404);
  }

  await prisma.userSkill.delete({ where: { id: userSkill.id } });

  calculateEngineeringScore(userId).catch(console.error);

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  return { id: userSkill.id };
};

export const removeExperience = async (userId: string, experienceId: string) => {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, userId },
    select: { id: true, companyName: true },
  });

  if (!experience) {
    throw new AppError("Experience not found", 404);
  }

  await prisma.experience.delete({ where: { id: experienceId } });

  Promise.all([
    addReputation(userId, "EXPERIENCE_ADDED", -5, "Removed experience", {
      experienceId,
    }),
    calculateEngineeringScore(userId),
  ]).catch(console.error);

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  return { id: experienceId };
};

export const removeEducation = async (userId: string, educationId: string) => {
  const education = await prisma.education.findFirst({
    where: { id: educationId, userId },
    select: { id: true },
  });

  if (!education) {
    throw new AppError("Education not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.education.delete({ where: { id: educationId } });

    // Find next most recent education
    const remaining = await tx.education.findFirst({
      where: { userId },
      orderBy: [
        { current: "desc" },
        { startYear: "desc" },
      ],
      select: { collegeId: true, departmentId: true },
    });

    if (remaining) {
      await tx.profile.upsert({
        where: { userId },
        update: { collegeId: remaining.collegeId, departmentId: remaining.departmentId },
        create: {
          userId,
          fullName: "",
          collegeId: remaining.collegeId,
          departmentId: remaining.departmentId,
        },
      });
    } else {
      await tx.profile.upsert({
        where: { userId },
        update: { collegeId: null, departmentId: null },
        create: {
          userId,
          fullName: "",
          collegeId: null,
          departmentId: null,
        },
      });
    }
  });

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  return { id: educationId };
};

// ─── Update Operations ──────────────────────────────────────────────────────

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

export const updateExperience = async (
  userId: string,
  experienceId: string,
  data: UpdateExperienceData,
) => {
  const existing = await prisma.experience.findFirst({
    where: { id: experienceId, userId },
    select: { id: true, startDate: true, endDate: true, isCurrent: true, companyId: true },
  });

  if (!existing) {
    throw new AppError("Experience not found", 404);
  }

  const updateData: Record<string, any> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.workEmail !== undefined) updateData.workEmail = data.workEmail;
  if (data.managerName !== undefined) updateData.managerName = data.managerName;
  if (data.managerEmail !== undefined) updateData.managerEmail = data.managerEmail;
  if (data.managerLinkedinUrl !== undefined) updateData.managerLinkedinUrl = data.managerLinkedinUrl;
  if (data.skillsUsed !== undefined) updateData.skillsUsed = data.skillsUsed;
  if (data.techStack !== undefined) updateData.techStack = data.techStack;
  if (data.teamSize !== undefined) updateData.teamSize = data.teamSize;

  if (data.employmentType !== undefined) {
    updateData.employmentType = normalizeEmploymentType(data.employmentType);
  }

  if (data.isCurrent !== undefined) {
    updateData.isCurrent = data.isCurrent;
    if (data.isCurrent) {
      updateData.endDate = null;
    }
  }

  if (data.companyWebsiteUrl !== undefined) {
    await prisma.company.update({
      where: { id: existing.companyId },
      data: { websiteUrl: data.companyWebsiteUrl },
    });
  }

  if (data.startDate !== undefined) {
    updateData.startDate = toDate(data.startDate, "startDate");
  }

  if (data.endDate !== undefined && !data.isCurrent) {
    updateData.endDate = toDate(data.endDate, "endDate");
  }

  const effectiveStart = updateData.startDate || existing.startDate;
  const effectiveEnd = updateData.endDate ?? (updateData.isCurrent ? null : existing.endDate);

  if (effectiveEnd && effectiveEnd < effectiveStart) {
    throw new AppError("End date cannot be before start date", 400);
  }

  // Recalculate verification score
  let verificationScore = 0;
  const finalData = { ...data };
  if (finalData.workEmail || (!finalData.workEmail && data.workEmail === undefined)) verificationScore += 25;
  if (finalData.managerEmail || (!finalData.managerEmail && data.managerEmail === undefined)) verificationScore += 15;
  if (finalData.techStack?.length || (!finalData.techStack && data.techStack === undefined)) verificationScore += 10;
  if (finalData.skillsUsed?.length || (!finalData.skillsUsed && data.skillsUsed === undefined)) verificationScore += 10;

  const scoringEnd = effectiveEnd || new Date();
  const months = (scoringEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months >= 3) verificationScore += 15;

  updateData.verificationScore = verificationScore;
  updateData.verified = verificationScore >= 60;
  updateData.verifiedAt = updateData.verified ? new Date() : null;

  // If marking current, unset other current experiences
  if (data.isCurrent) {
    await prisma.experience.updateMany({
      where: { userId, isCurrent: true, id: { not: experienceId } },
      data: { isCurrent: false },
    });
  }

  const updated = await prisma.experience.update({
    where: { id: experienceId },
    data: updateData,
    include: { company: true },
  });

  if (existing.isCurrent && !updated.isCurrent && updated.companyId) {
    const communities = await prisma.community.findMany({
      where: { companyId: updated.companyId },
      select: { id: true, name: true },
    });
    for (const c of communities) {
      const membership = await prisma.communityMember.findUnique({
        where: {
          communityId_userId: { communityId: c.id, userId },
        },
      });
      if (membership && membership.role !== "ALUMNI") {
        await prisma.communityMember.update({
          where: { id: membership.id },
          data: { role: "ALUMNI" },
        });
        console.log(`[AlumniTransition] User ${userId} role changed to ALUMNI in community ${c.name}`);
      }
    }
  }

  calculateEngineeringScore(userId).catch(console.error);

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  return updated;
};

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

export const updateEducation = async (
  userId: string,
  educationId: string,
  data: UpdateEducationData,
) => {
  const existing = await prisma.education.findFirst({
    where: { id: educationId, userId },
    select: { id: true, collegeId: true, departmentId: true, cgpa: true },
  });

  if (!existing) {
    throw new AppError("Education not found", 404);
  }

  const cgpaChanged = data.cgpa !== undefined && data.cgpa !== existing.cgpa;

  if (data.startYear && data.endYear && !data.current && data.endYear < data.startYear) {
    throw new AppError("End year cannot be before start year", 400);
  }

  const updateData: Record<string, any> = {};

  if (data.degree !== undefined) updateData.degree = data.degree;
  if (data.startYear !== undefined) updateData.startYear = data.startYear;

  if (data.current !== undefined) {
    updateData.current = data.current;
    if (data.current) {
      updateData.endYear = null;
      // Unset other current educations
      await prisma.education.updateMany({
        where: { userId, current: true, id: { not: educationId } },
        data: { current: false },
      });
    }
  }

  if (data.endYear !== undefined && !data.current) {
    updateData.endYear = data.endYear;
  }

  if (data.cgpa !== undefined) updateData.cgpa = data.cgpa;
  if (data.backlogs !== undefined) updateData.backlogs = data.backlogs;
  if (data.currentYear !== undefined) updateData.currentYear = data.currentYear;

  const result = await prisma.$transaction(async (tx) => {
    // Fetch full existing record for fallback fields
    const fullExisting = await tx.education.findUnique({
      where: { id: educationId },
      select: { fieldOfStudy: true, collegeId: true, departmentId: true },
    });

    const effectiveCollegeId = data.collegeId !== undefined ? data.collegeId : fullExisting?.collegeId;
    let finalDepartmentId = data.departmentId !== undefined ? data.departmentId : fullExisting?.departmentId;
    let finalFieldOfStudy = data.fieldOfStudy !== undefined ? data.fieldOfStudy : fullExisting?.fieldOfStudy;

    if (effectiveCollegeId) {
      if (
        data.collegeId !== undefined ||
        data.departmentId !== undefined ||
        data.fieldOfStudy !== undefined
      ) {
        const resolved = await resolveCollegeDepartment(
          tx,
          userId,
          effectiveCollegeId,
          data.departmentId !== undefined ? data.departmentId : fullExisting?.departmentId,
          data.fieldOfStudy !== undefined ? data.fieldOfStudy : fullExisting?.fieldOfStudy
        );
        finalDepartmentId = resolved.departmentId;
        finalFieldOfStudy = resolved.fieldOfStudy;
      }
    } else {
      finalDepartmentId = null;
      if (data.departmentId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.departmentId);
        if (isUuid) {
          const standardDept = await tx.standardDepartment.findUnique({
            where: { id: data.departmentId },
          });
          if (standardDept) {
            finalFieldOfStudy = standardDept.name;
          }
        } else {
          finalFieldOfStudy = data.departmentId;
        }
      } else if (data.fieldOfStudy !== undefined) {
        finalFieldOfStudy = data.fieldOfStudy;
      }
    }

    if (data.collegeId !== undefined) {
      if (data.collegeId) {
        const college = await tx.college.findUnique({
          where: { id: data.collegeId },
          select: { id: true },
        });
        if (!college) {
          throw new AppError("College not found", 404);
        }
      }
      updateData.collegeId = data.collegeId;
    }

    updateData.departmentId = finalDepartmentId;
    updateData.fieldOfStudy = finalFieldOfStudy;

    const res = await tx.education.update({
      where: { id: educationId },
      data: updateData,
      include: compactEducationInclude,
    });

    // Sync to user's profile
    await tx.profile.upsert({
      where: { userId },
      update: { collegeId: res.collegeId, departmentId: res.departmentId || null },
      create: {
        userId,
        fullName: "",
        collegeId: res.collegeId,
        departmentId: res.departmentId || null,
      },
    });

    await autoJoinUserCommunities(
      userId,
      {
        collegeId: res.collegeId,
        departmentId: res.departmentId,
      },
      tx,
    );

    return res;
  });

  // Fire-and-forget: notify college TPO admins when CGPA is updated
  if (cgpaChanged) {
    void notifyCgpaChange(userId, existing.collegeId, data.cgpa);
  }

  // Sync user profile to Resdex
  syncUserToResdex(userId);

  return result;
};

// CGPA change TPO notification (called separately to avoid blocking transaction)
async function notifyCgpaChange(userId: string, collegeId: string | null | undefined, newCgpa: number | null | undefined) {
  if (!collegeId || newCgpa === null || newCgpa === undefined) return;
  try {
    const [admins, user] = await Promise.all([
      prisma.collegeAdmin.findMany({ where: { collegeId }, select: { userId: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { username: true, profile: { select: { fullName: true } } } }),
    ]);
    if (admins.length === 0) return;
    const studentName = user?.profile?.fullName || user?.username || "A student";
    await prisma.notification.createMany({
      data: admins.map((adm) => ({
        userId: adm.userId,
        actorId: userId,
        type: "SYSTEM",
        title: "Student CGPA Updated",
        message: `${studentName} has updated their CGPA to ${newCgpa}. Please review their placement eligibility.`,
        actionUrl: `/colleges/${collegeId}`,
      })),
    });
  } catch {
    // Non-critical — do not throw
  }
}

// ─── User Projects ──────────────────────────────────────────────────────────

export const getMyProjects = async (userId: string) => {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
      deletedAt: null,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: [
      { updatedAt: "desc" },
    ],
    take: 50,
  });

  return projects;
};

export const verifyCollegeEmail = async (
  userId: string,
  educationId: string,
  collegeEmail: string,
  code?: string
) => {
  const education = await prisma.education.findFirst({
    where: { id: educationId, userId },
    include: { college: true },
  });

  if (!education) {
    throw new AppError("Education record not found", 404);
  }

  if (!education.collegeId) {
    throw new AppError("This education record is not linked to a registered college", 400);
  }

  const allowedDomains = education.college?.emailDomains || [];
  const parts = collegeEmail.split("@");
  const domain = parts[1]?.toLowerCase().trim();

  if (allowedDomains.length > 0 && !allowedDomains.some((d) => isDomainAllowed(domain, d))) {
    throw new AppError(`Email domain '${domain}' does not match any approved domains for ${education.college?.name || "your college"}.`, 400);
  }

  if (!code) {
    const codeVal = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `verification:college:${userId}:${educationId}`;
    await redis.setex(redisKey, 600, JSON.stringify({ email: collegeEmail, code: codeVal }));

    console.log(`[CollegeEmailVerification] Verification code for ${collegeEmail} is '${codeVal}'`);
    return {
      success: true,
      message: `A verification code has been sent to ${collegeEmail}. Please use the code to confirm.`,
    };
  }

  const redisKey = `verification:college:${userId}:${educationId}`;
  const storedData = await redis.get(redisKey);
  if (!storedData) {
    throw new AppError("Verification code expired or not requested. Please request a new code.", 400);
  }

  const { email: storedEmail, code: storedCode } = JSON.parse(storedData);
  if (storedEmail.toLowerCase().trim() !== collegeEmail.toLowerCase().trim() || storedCode !== code) {
    throw new AppError("Invalid verification code. Please try again.", 400);
  }

  await redis.del(redisKey);

  const updatedEducation = await prisma.$transaction(async (tx) => {
    const res = await tx.education.update({
      where: { id: educationId },
      data: {
        collegeEmail,
        collegeEmailVerified: true,
      },
    });

    await autoJoinUserCommunities(
      userId,
      {
        collegeId: res.collegeId,
        departmentId: res.departmentId,
      },
      tx
    );

    return res;
  });

  return {
    success: true,
    message: "College email verified successfully!",
    education: updatedEducation,
  };
};

export const verifyWorkEmail = async (
  userId: string,
  experienceId: string,
  workEmail: string,
  code?: string
) => {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, userId },
    include: { company: true },
  });

  if (!experience) {
    throw new AppError("Experience record not found", 404);
  }

  if (!experience.companyId) {
    throw new AppError("This experience record is not linked to a registered company", 400);
  }

  const allowedDomains = experience.company?.emailDomains || [];
  const parts = workEmail.split("@");
  const domain = parts[1]?.toLowerCase().trim();

  if (allowedDomains.length > 0 && !allowedDomains.some((d) => isDomainAllowed(domain, d))) {
    throw new AppError(`Email domain '${domain}' does not match any approved domains for ${experience.company?.name || "your company"}.`, 400);
  }

  if (!code) {
    const codeVal = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `verification:work:${userId}:${experienceId}`;
    await redis.setex(redisKey, 600, JSON.stringify({ email: workEmail, code: codeVal }));

    console.log(`[WorkEmailVerification] Verification code for ${workEmail} is '${codeVal}'`);
    return {
      success: true,
      message: `A verification code has been sent to ${workEmail}. Please use the code to confirm.`,
    };
  }

  const redisKey = `verification:work:${userId}:${experienceId}`;
  const storedData = await redis.get(redisKey);
  if (!storedData) {
    throw new AppError("Verification code expired or not requested. Please request a new code.", 400);
  }

  const { email: storedEmail, code: storedCode } = JSON.parse(storedData);
  if (storedEmail.toLowerCase().trim() !== workEmail.toLowerCase().trim() || storedCode !== code) {
    throw new AppError("Invalid verification code. Please try again.", 400);
  }

  await redis.del(redisKey);

  const updatedExperience = await prisma.$transaction(async (tx) => {
    const res = await tx.experience.update({
      where: { id: experienceId },
      data: {
        workEmail,
        workEmailVerified: true,
        verified: true,
        verifiedAt: new Date(),
        verificationScore: 100, // force complete verification score
      },
    });

    await autoJoinUserCommunities(
      userId,
      {
        companyId: res.companyId,
      },
      tx
    );

    return res;
  });

  return {
    success: true,
    message: "Work email verified successfully!",
    experience: updatedExperience,
  };
};

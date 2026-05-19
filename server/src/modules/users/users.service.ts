import prisma from "shared/database/prisma";
import { EmploymentType, Prisma, SkillLevel } from "@prisma/client";
import AppError from "shared/errors/AppError";
import { addReputation } from "../reputation/reputation.service";
import { createActivity } from "../activities/activity.service";
import { calculateEngineeringScore } from "../reputation/engineering-score.service";
import { autoJoinUserCommunities } from "modules/community/community.service";
import { createHash, randomBytes } from "crypto";
import slugify from "slugify";

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
  graduationYear?: number;
  collegeId?: string;
  departmentId?: string | null;
}

export interface AddSkillData {
  skillId: string;
  level: SkillLevel;
}

export interface AddExperienceData {
  companyName: string;
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
  collegeId: string;
  departmentId?: string | null;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  current?: boolean;
}

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
} satisfies Prisma.UserSelect;

const compactEducationInclude = {
  college: true,
  department: true,
} satisfies Prisma.EducationInclude;

const stripUndefined = (data: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

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

      collegeId: data.collegeId,

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
    return existingCompany;
  }

  try {
    return await tx.company.upsert({
      where: {
        name: companyName,
      },

      update: {},

      create: {
        name: companyName,

        slug: buildStableCompanySlug(companyName),
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
        return company;
      }

      return tx.company.create({
        data: {
          name: companyName,

          slug: buildFallbackCompanySlug(companyName),
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

export const updateProfile = async (
  userId: string,
  data: UpdateProfileData,
) => {
  const {
    username,

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

    return tx.user.findUnique({
      where: {
        id: userId,
      },

      select: userProfileSelect,
    });
  });
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

  return prisma.userSkill.upsert({
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
    const company = await getOrCreateCompany(tx, companyName);

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

    await autoJoinUserCommunities(
      userId,
      {
        companyId: company.id,
      },
      tx,
    );

    return createdExperience;
  });

  Promise.all([
    addReputation(
      userId,

      "EXPERIENCE_ADDED",

      verified ? 20 : 5,

      verified ? "Added verified experience" : "Added experience",

      {
        experienceId: experience.id,
      },
    ),

    createActivity(
      userId,

      "EXPERIENCE_ADDED",

      "Added experience",

      `Added experience at "${experience.companyName || companyName}"`,

      {
        experienceId: experience.id,
      },
    ),

    calculateEngineeringScore(userId),
  ]).catch(console.error);

  return experience;
};

export const addEducation = async (userId: string, data: AddEducationData) => {
  if (data.startYear && data.endYear && data.endYear < data.startYear) {
    throw new AppError("End year cannot be before start year", 400);
  }

  return prisma.$transaction(async (tx) => {
    const college = await tx.college.findUnique({
      where: {
        id: data.collegeId,
      },

      select: {
        id: true,
      },
    });

    if (!college) {
      throw new AppError("College not found", 404);
    }

    await assertDepartmentBelongsToCollege(
      tx,
      data.collegeId,
      data.departmentId,
    );

    await assertNoDuplicateEducation(tx, userId, data);

    if (data.current) {
      await tx.education.updateMany({
        where: {
          userId,
          current: true,
        },

        data: {
          current: false,
        },
      });
    }

    const education = await tx.education.create({
      data: {
        userId,

        collegeId: data.collegeId,
        departmentId: data.departmentId,

        degree: data.degree,
        fieldOfStudy: data.fieldOfStudy,

        startYear: data.startYear,
        endYear: data.endYear,

        current: data.current || false,
      },

      include: compactEducationInclude,
    });

    await autoJoinUserCommunities(
      userId,
      {
        collegeId: data.collegeId,

        departmentId: data.departmentId,
      },
      tx,
    );

    return education;
  });
};

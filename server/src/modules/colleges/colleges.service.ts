import { CommunityCategory, CommunityType, Prisma } from "@prisma/client";
import slugify from "slugify";

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { createCommunity } from "modules/community/community.service";

interface AuthUser {
  id: string;
  roles?: Array<{
    role?: {
      name?: string;
    };
  }>;
}

export interface CreateCollegeData {
  name: string;
  state?: string;
  city?: string;
  website?: string;
  logoUrl?: string;
}

export interface CreateDepartmentData {
  name: string;
  collegeId: string;
}

export interface CollegeListParams {
  cursor?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const PLATFORM_ADMIN_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
]);

const COLLEGE_ADMIN_ROLES = new Set([
  "COLLEGE_ADMIN",
  "COLLEGE_DIRECTOR",
]);

const collegeSelect = {
  id: true,
  name: true,
  state: true,
  city: true,
  website: true,
  logoUrl: true,
  normalizedKey: true,
  createdAt: true,
  _count: {
    select: {
      departments: true,
      profiles: true,
      educations: true,
    },
  },
} satisfies Prisma.CollegeSelect;

const departmentSelect = {
  id: true,
  name: true,
  collegeId: true,
  createdAt: true,
} satisfies Prisma.DepartmentSelect;

const normalizeText = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");

const normalizeKey = (value: string) =>
  slugify(normalizeText(value), {
    lower: true,
    strict: true,
    trim: true,
  });

const clampLimit = (limit?: number) =>
  Math.min(MAX_LIMIT, Math.max(1, limit || DEFAULT_LIMIT));

const getRoleNames = (user: AuthUser) =>
  new Set(
    (user.roles || [])
      .map((userRole) => userRole.role?.name)
      .filter((roleName): roleName is string => Boolean(roleName)),
  );

const isPlatformAdmin = (user: AuthUser) => {
  const roleNames = getRoleNames(user);

  return [...PLATFORM_ADMIN_ROLES].some((roleName) => roleNames.has(roleName));
};

const isCollegeAdminRole = (user: AuthUser) => {
  const roleNames = getRoleNames(user);

  return [...COLLEGE_ADMIN_ROLES].some((roleName) => roleNames.has(roleName));
};

const assertCanManageCollegeCatalog = (user: AuthUser) => {
  if (!isPlatformAdmin(user)) {
    throw new AppError("Only platform admins can create colleges", 403);
  }
};

const assertCanManageCollege = async (user: AuthUser, collegeId: string) => {
  if (isPlatformAdmin(user)) {
    return;
  }

  if (!isCollegeAdminRole(user)) {
    throw new AppError("Unauthorized", 403);
  }

  const profile = await prisma.profile.findUnique({
    where: {
      userId: user.id,
    },

    select: {
      collegeId: true,
    },
  });

  if (profile?.collegeId !== collegeId) {
    throw new AppError("You can only manage your own college", 403);
  }
};

const ensureOfficialCollegeCommunity = async (
  userId: string,

  college: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  },
) => {
  const existingCommunity = await prisma.community.findFirst({
    where: {
      type: CommunityType.COLLEGE,
      collegeId: college.id,
      departmentId: null,
      category: CommunityCategory.GENERAL,
    },

    select: {
      id: true,
    },
  });

  if (existingCommunity) {
    return;
  }

  await createCommunity(userId, {
    name: `${college.name} Official`,
    description: `Official community for ${college.name}`,
    type: CommunityType.COLLEGE,
    category: CommunityCategory.GENERAL,
    collegeId: college.id,
    tags: ["college", "official"],
    searchKeywords: [college.name, college.city, college.state].filter(
      (keyword): keyword is string => Boolean(keyword),
    ),
    autoJoinEligible: true,
  });
};

const ensureOfficialDepartmentCommunity = async (
  userId: string,

  department: {
    id: string;
    name: string;
    collegeId: string;
    college: {
      name: string;
    };
  },
) => {
  const existingCommunity = await prisma.community.findFirst({
    where: {
      type: CommunityType.COLLEGE,
      collegeId: department.collegeId,
      departmentId: department.id,
      category: CommunityCategory.GENERAL,
    },

    select: {
      id: true,
    },
  });

  if (existingCommunity) {
    return;
  }

  await createCommunity(userId, {
    name: `${department.college.name} ${department.name} Department`,
    description: `Official ${department.name} community at ${department.college.name}`,
    type: CommunityType.COLLEGE,
    category: CommunityCategory.GENERAL,
    collegeId: department.collegeId,
    departmentId: department.id,
    tags: ["college", "department", "official"],
    searchKeywords: [department.college.name, department.name],
    autoJoinEligible: true,
  });
};

export const createCollege = async (
  user: AuthUser,

  data: CreateCollegeData,
) => {
  assertCanManageCollegeCatalog(user);

  const name = normalizeText(data.name);
  const normalizedKey = normalizeKey(name);

  if (!normalizedKey) {
    throw new AppError("College name is invalid", 400);
  }

  const college = await prisma.college.upsert({
    where: {
      normalizedKey,
    },

    update: {
      name,
      state: data.state ? normalizeText(data.state) : undefined,
      city: data.city ? normalizeText(data.city) : undefined,
      website: data.website,
      logoUrl: data.logoUrl,
    },

    create: {
      name,
      normalizedKey,
      state: data.state ? normalizeText(data.state) : undefined,
      city: data.city ? normalizeText(data.city) : undefined,
      website: data.website,
      logoUrl: data.logoUrl,
    },

    select: collegeSelect,
  });

  await ensureOfficialCollegeCommunity(user.id, college);

  return college;
};

export const getAllColleges = async (params: CollegeListParams = {}) => {
  const limit = clampLimit(params.limit);

  const colleges = await prisma.college.findMany({
    select: collegeSelect,

    orderBy: [
      {
        name: "asc",
      },
      {
        id: "asc",
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

  const hasNextPage = colleges.length > limit;
  const items = hasNextPage ? colleges.slice(0, limit) : colleges;

  return {
    colleges: items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};

export const searchColleges = async (query: string) => {
  const normalizedQuery = normalizeText(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return prisma.college.findMany({
    where: {
      OR: [
        {
          name: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },
        {
          normalizedKey: {
            contains: normalizeKey(normalizedQuery),
          },
        },
      ],
    },

    select: collegeSelect,

    orderBy: {
      name: "asc",
    },

    take: 10,
  });
};

export const createDepartment = async (
  user: AuthUser,

  data: CreateDepartmentData,
) => {
  await assertCanManageCollege(user, data.collegeId);

  const college = await prisma.college.findUnique({
    where: {
      id: data.collegeId,
    },

    select: {
      id: true,
      name: true,
    },
  });

  if (!college) {
    throw new AppError("College not found", 404);
  }

  const name = normalizeText(data.name);
  const normalizedDepartmentName = normalizeKey(name);

  const existingDepartment = await prisma.department.findFirst({
    where: {
      collegeId: data.collegeId,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },

    select: departmentSelect,
  });

  if (existingDepartment) {
    return existingDepartment;
  }

  const sameCollegeDepartments = await prisma.department.findMany({
    where: {
      collegeId: data.collegeId,
    },

    select: departmentSelect,
  });

  const normalizedDuplicate = sameCollegeDepartments.find(
    (department) => normalizeKey(department.name) === normalizedDepartmentName,
  );

  if (normalizedDuplicate) {
    return normalizedDuplicate;
  }

  const department = await prisma.department.create({
    data: {
      name,
      collegeId: data.collegeId,
    },

    select: {
      ...departmentSelect,
      college: {
        select: {
          name: true,
        },
      },
    },
  });

  await ensureOfficialDepartmentCommunity(user.id, department);

  return department;
};

export const getDepartmentsByCollege = async (collegeId: string) => {
  return prisma.department.findMany({
    where: {
      collegeId,
    },

    select: departmentSelect,

    orderBy: {
      name: "asc",
    },
  });
};

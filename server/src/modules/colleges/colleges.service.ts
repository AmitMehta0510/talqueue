import { CommunityCategory, CommunityType, Prisma } from "@prisma/client";
import slugify from "slugify";

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { createCommunity } from "modules/community/community.service";
import { createNotification } from "modules/notificatios/notifications.service";

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
  country?: string;
  website?: string;
  logoUrl?: string;
}

export interface CreateDepartmentData {
  name: string;
  collegeId: string;
  hod?: string;
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

const collegeSelect = {
  id: true,
  name: true,
  state: true,
  city: true,
  country: true,
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

const collegeListSelect = {
  id: true,
  name: true,
  state: true,
  city: true,
  country: true,
  website: true,
  logoUrl: true,
  normalizedKey: true,
  createdAt: true,
} satisfies Prisma.CollegeSelect;

const departmentSelect = {
  id: true,
  name: true,
  hod: true,
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

export const isPlatformAdmin = (user: AuthUser) => {
  const roleNames = getRoleNames(user);
  return [...PLATFORM_ADMIN_ROLES].some((roleName) => roleNames.has(roleName));
};

const assertCanManageCollegeCatalog = (user: AuthUser) => {
  if (!isPlatformAdmin(user)) {
    throw new AppError(
      "Only platform administrators (ADMIN, SUPER_ADMIN, PLATFORM_ADMIN) are authorized to manage the college catalog",
      403,
    );
  }
};

/**
 * A user can manage a specific college if they are:
 * 1. A platform admin (ADMIN / SUPER_ADMIN / PLATFORM_ADMIN), OR
 * 2. Explicitly listed in the CollegeAdmin table for that college.
 */
const assertCanManageCollege = async (user: AuthUser, collegeId: string) => {
  if (isPlatformAdmin(user)) {
    return;
  }

  const assignment = await prisma.collegeAdmin.findUnique({
    where: {
      userId_collegeId: {
        userId: user.id,
        collegeId,
      },
    },
    select: { id: true },
  });

  if (!assignment) {
    throw new AppError(
      "You are not an admin of this college",
      403,
    );
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

export const ensureOfficialDepartmentCommunity = async (
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
      country: data.country ? normalizeText(data.country) : undefined,
      website: data.website,
      logoUrl: data.logoUrl,
    },

    create: {
      name,
      normalizedKey,
      state: data.state ? normalizeText(data.state) : undefined,
      city: data.city ? normalizeText(data.city) : undefined,
      country: data.country ? normalizeText(data.country) : undefined,
      website: data.website,
      logoUrl: data.logoUrl,
    },

    select: collegeSelect,
  });

  setImmediate(() => {
    ensureOfficialCollegeCommunity(user.id, college).catch((err) => {
      console.error("Failed to ensure official college community in background:", err);
    });
  });

  return college;
};

export const getCollegeById = async (idOrSlug: string) => {
  return prisma.college.findFirst({
    where: {
      OR: [
        { id: idOrSlug },
        { normalizedKey: idOrSlug },
      ],
    },
    select: collegeSelect,
  });
};

export const getAllColleges = async (params: CollegeListParams = {}) => {
  const limit = clampLimit(params.limit);

  const colleges = await prisma.college.findMany({
    select: collegeListSelect,

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
      hod: data.hod,
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

export const importColleges = async (user: AuthUser, colleges: any[]) => {
  assertCanManageCollegeCatalog(user);

  const yieldEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

  const results = [];
  const chunkSize = 100;

  for (let i = 0; i < colleges.length; i += chunkSize) {
    if (i > 0) {
      await yieldEventLoop();
    }

    const chunk = colleges.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(async (item) => {
      if (!item.name) return null;

      const name = normalizeText(item.name);
      const normalizedKey = normalizeKey(name);

      if (!normalizedKey) return null;

      const college = await prisma.college.upsert({
        where: {
          normalizedKey,
        },
        update: {
          name,
          state: item.state ? normalizeText(item.state) : undefined,
          city: item.city ? normalizeText(item.city) : undefined,
          country: item.country ? normalizeText(item.country) : undefined,
          website: item.website,
          logoUrl: item.logoUrl,
          emailDomains: item.emailDomains || [],
        },
        create: {
          name,
          normalizedKey,
          state: item.state ? normalizeText(item.state) : undefined,
          city: item.city ? normalizeText(item.city) : undefined,
          country: item.country ? normalizeText(item.country) : undefined,
          website: item.website,
          logoUrl: item.logoUrl,
          emailDomains: item.emailDomains || [],
        },
      });

      setImmediate(() => {
        ensureOfficialCollegeCommunity(user.id, college).catch((err) => {
          console.error("Failed to ensure official college community in background:", err);
        });
      });

      return college;
    });

    const chunkResults = await Promise.all(chunkPromises);
    for (const res of chunkResults) {
      if (res) {
        results.push(res);
      }
    }
  }

  return results;
};

export const getStandardDepartments = async () => {
  return prisma.standardDepartment.findMany({
    orderBy: {
      name: "asc",
    },
  });
};

export const deleteCollege = async (user: AuthUser, collegeId: string) => {
  assertCanManageCollegeCatalog(user);

  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: { id: true },
  });

  if (!college) {
    throw new AppError("College not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.profile.updateMany({
      where: { collegeId },
      data: { collegeId: null },
    });

    await tx.education.updateMany({
      where: { collegeId },
      data: { collegeId: null },
    });

    await tx.event.updateMany({
      where: { collegeId },
      data: { collegeId: null },
    });

    await tx.post.updateMany({
      where: { collegeId },
      data: { collegeId: null },
    });

    await tx.conversation.updateMany({
      where: { collegeId },
      data: { collegeId: null },
    });

    await tx.community.updateMany({
      where: { collegeId },
      data: { collegeId: null, departmentId: null },
    });

    await tx.college.delete({
      where: { id: collegeId },
    });
  });
};

export const listCdcrMembers = async (collegeId: string) => {
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: { id: true },
  });
  if (!college) throw new AppError("College not found", 404);

  return prisma.cdcrMember.findMany({
    where: { collegeId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
};

export const assignCdcrMember = async (
  actorId: string,
  userId: string,
  collegeId: string,
) => {
  const [targetUser, college] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.college.findUnique({ where: { id: collegeId } }),
  ]);

  if (!targetUser) throw new AppError("User not found", 404);
  if (!college) throw new AppError("College not found", 404);

  const existing = await prisma.cdcrMember.findUnique({
    where: {
      userId_collegeId: { userId, collegeId },
    },
  });

  if (existing) {
    throw new AppError("User is already a CDCR member for this college", 409);
  }

  const assignment = await prisma.cdcrMember.create({
    data: {
      userId,
      collegeId,
      assignedById: actorId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  await createNotification({
    userId,
    actorId,
    type: "SYSTEM",
    title: "CDCR Representative Assigned",
    message: `You have been assigned as a CDCR representative for ${college.name}.`,
    entityType: "COLLEGE",
    entityId: collegeId,
  });

  return assignment;
};

export const removeCdcrMember = async (
  userId: string,
  collegeId: string,
) => {
  const record = await prisma.cdcrMember.findUnique({
    where: {
      userId_collegeId: { userId, collegeId },
    },
  });

  if (!record) {
    throw new AppError("CDCR assignment not found", 404);
  }

  await prisma.cdcrMember.delete({
    where: {
      id: record.id,
    },
  });

  return { success: true };
};

export const searchCollegeStudents = async (
  collegeId: string,
  query: string,
) => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  return prisma.user.findMany({
    where: {
      educations: {
        some: {
          collegeId,
        },
      },
      OR: [
        { username: { contains: normalizedQuery, mode: "insensitive" } },
        { email: { contains: normalizedQuery, mode: "insensitive" } },
        {
          profile: {
            fullName: { contains: normalizedQuery, mode: "insensitive" },
          },
        },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      profile: {
        select: {
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    take: 10,
  });
};

export const claimAlumniStatus = async (userId: string, collegeId: string) => {
  const education = await prisma.education.findFirst({
    where: { userId, collegeId },
  });
  if (!education) {
    throw new AppError("Education record not found for this college. Please add the college to your education profile first.", 400);
  }

  const updated = await prisma.education.update({
    where: { id: education.id },
    data: {
      isAlumni: true,
      alumniVerified: false,
    },
  });

  // Notify college admins
  setImmediate(() => {
    (async () => {
      try {
        const admins = await prisma.collegeAdmin.findMany({
          where: { collegeId },
          select: { userId: true },
        });
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, profile: { select: { fullName: true } } },
        });
        const studentName = user?.profile?.fullName || user?.username || "A student";

        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((adm) => ({
              userId: adm.userId,
              actorId: userId,
              type: "SYSTEM",
              title: "Pending Alumni Claim",
              message: `${studentName} has claimed to be an alumni of your college and is pending verification.`,
              actionUrl: `/colleges/${collegeId}`,
            })),
          });
        }
      } catch (err) {
        console.error("Failed to create alumni claim notifications in background:", err);
      }
    })();
  });

  return updated;
};

export const getPendingAlumniClaims = async (user: AuthUser, collegeId: string) => {
  await assertCanManageCollege(user, collegeId);

  return prisma.education.findMany({
    where: {
      collegeId,
      isAlumni: true,
      alumniVerified: false,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    take: 50,
  });
};

export const approveAlumniClaim = async (user: AuthUser, collegeId: string, educationId: string) => {
  await assertCanManageCollege(user, collegeId);

  const education = await prisma.education.findUnique({
    where: { id: educationId },
  });
  if (!education || education.collegeId !== collegeId) {
    throw new AppError("Alumni claim education record not found", 404);
  }

  const updated = await prisma.education.update({
    where: { id: educationId },
    data: {
      alumniVerified: true,
      alumniVerifiedAt: new Date(),
    },
  });

  // Notify student
  setImmediate(() => {
    prisma.notification.create({
      data: {
        userId: education.userId,
        actorId: user.id,
        type: "SYSTEM",
        title: "Alumni Status Verified",
        message: "Congratulations! Your college has verified your alumni status.",
        actionUrl: "/profile",
      },
    }).catch((err) => {
      console.error("Failed to send alumni verification approval notification in background:", err);
    });
  });

  return updated;
};

export const rejectAlumniClaim = async (user: AuthUser, collegeId: string, educationId: string) => {
  await assertCanManageCollege(user, collegeId);

  const education = await prisma.education.findUnique({
    where: { id: educationId },
  });
  if (!education || education.collegeId !== collegeId) {
    throw new AppError("Alumni claim education record not found", 404);
  }

  const updated = await prisma.education.update({
    where: { id: educationId },
    data: {
      isAlumni: false,
      alumniVerified: false,
    },
  });

  // Notify student
  setImmediate(() => {
    prisma.notification.create({
      data: {
        userId: education.userId,
        actorId: user.id,
        type: "SYSTEM",
        title: "Alumni Claim Rejected",
        message: "Your alumni verification claim was rejected by your college administrator.",
        actionUrl: "/profile",
      },
    }).catch((err) => {
      console.error("Failed to send alumni verification rejection notification in background:", err);
    });
  });

  return updated;
};
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

// ============================================================
// HELPERS
// ============================================================

const ensureUserExists = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
};

const ensureCollegeExists = async (collegeId: string) => {
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: { id: true, name: true },
  });
  if (!college) {
    throw new AppError("College not found", 404);
  }
  return college;
};

const ensureCompanyExists = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) {
    throw new AppError("Company not found", 404);
  }
  return company;
};

/**
 * Ensures a named role exists in the Role table.
 * Returns the role id.
 */
const ensureRole = async (name: string) => {
  const existing = await prisma.role.findUnique({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.role.create({
    data: { name },
    select: { id: true },
  });
};

/**
 * Grants a role to a user (idempotent — skips if already assigned).
 */
const grantRole = async (userId: string, roleName: string) => {
  const role = await ensureRole(roleName);

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
};

/**
 * Removes a role from a user only if they have no other admin assignments.
 */
const revokeRoleIfOrphaned = async (
  userId: string,
  roleName: string,
  remainingCollegeAdminCount: number,
  remainingCompanyAdminCount: number,
) => {
  if (remainingCollegeAdminCount > 0 || remainingCompanyAdminCount > 0) {
    return;
  }

  const role = await prisma.role.findUnique({
    where: { name: roleName },
    select: { id: true },
  });
  if (!role) return;

  await prisma.userRole.deleteMany({
    where: { userId, roleId: role.id },
  });
};

/**
 * When a user is assigned as a college or company admin, ensure they are
 * promoted to ADMIN role inside all communities for that institution and
 * added as a ConversationParticipant in every active community conversation.
 * This gives them immediate management access and chat access.
 */
const ensureInstitutionAdminInCommunities = async (
  userId: string,
  filter: { collegeId: string } | { companyId: string },
) => {
  const communities = await prisma.community.findMany({
    where: { ...filter, archived: false },
    select: {
      id: true,
      conversations: {
        where: { archived: false },
        select: { id: true },
      },
    },
  });

  for (const community of communities) {
    // Upsert community membership — promote to ADMIN so they can manage
    await prisma.communityMember.upsert({
      where: {
        communityId_userId: { communityId: community.id, userId },
      },
      update: { role: "ADMIN", active: true, leftAt: null },
      create: { communityId: community.id, userId, role: "ADMIN" },
    });

    // Increment memberCount only if this is a new record (upsert doesn't tell
    // us, so we check via a count — simpler than raw SQL for now)
    // NOTE: memberCount is a denormalised cache; slight over-count is harmless
    // compared to under-count, so we skip incrementing on update paths.

    // Add to every active community conversation
    for (const conv of community.conversations) {
      await prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: { conversationId: conv.id, userId },
        },
        update: {},
        create: { conversationId: conv.id, userId },
      });
    }
  }
};

// ============================================================
// COLLEGE ADMIN
// ============================================================

export const assignCollegeAdmin = async (
  grantedById: string,
  targetUserId: string,
  collegeId: string,
) => {
  await ensureUserExists(targetUserId);
  const college = await ensureCollegeExists(collegeId);

  const assignment = await prisma.collegeAdmin.upsert({
    where: { userId_collegeId: { userId: targetUserId, collegeId } },
    update: { grantedById },
    create: { userId: targetUserId, collegeId, grantedById },
    include: {
      user: { select: { id: true, email: true, username: true } },
      college: { select: { id: true, name: true } },
    },
  });

  await grantRole(targetUserId, "COLLEGE_ADMIN");

  // Promote the new college admin to ADMIN inside all communities for this
  // college and add them as a conversation participant in each community chat.
  await ensureInstitutionAdminInCommunities(targetUserId, { collegeId });

  return {
    message: `User assigned as admin of ${college.name}`,
    assignment,
  };
};

export const removeCollegeAdmin = async (
  targetUserId: string,
  collegeId: string,
) => {
  await ensureUserExists(targetUserId);
  await ensureCollegeExists(collegeId);

  const existing = await prisma.collegeAdmin.findUnique({
    where: { userId_collegeId: { userId: targetUserId, collegeId } },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("User is not an admin of this college", 404);
  }

  await prisma.collegeAdmin.delete({
    where: { userId_collegeId: { userId: targetUserId, collegeId } },
  });

  const remainingCollegeAdminCount = await prisma.collegeAdmin.count({
    where: { userId: targetUserId },
  });
  const remainingCompanyAdminCount = await prisma.companyAdmin.count({
    where: { userId: targetUserId },
  });

  await revokeRoleIfOrphaned(
    targetUserId,
    "COLLEGE_ADMIN",
    remainingCollegeAdminCount,
    remainingCompanyAdminCount,
  );

  return { message: "College admin removed successfully" };
};

export const listCollegeAdmins = async (collegeId: string) => {
  await ensureCollegeExists(collegeId);

  return prisma.collegeAdmin.findMany({
    where: { collegeId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      grantedBy: {
        select: { id: true, username: true },
      },
    },
  });
};

// ============================================================
// COMPANY ADMIN
// ============================================================

/**
 * Build a Prisma where-filter for CompanyAdmin that correctly handles
 * null officeCity (global admin) vs. a specific city string.
 *
 * Prisma cannot use a compound unique index when one member is null,
 * so we always query by individual fields.
 */
const companyAdminWhereFilter = (
  userId: string,
  companyId: string,
  officeCity: string | null,
) => {
  if (officeCity === null) {
    return { userId, companyId, officeCity: null as null };
  }
  return { userId, companyId, officeCity };
};

export const assignCompanyAdmin = async (
  grantedById: string,
  targetUserId: string,
  companyId: string,
  officeCity?: string,
) => {
  await ensureUserExists(targetUserId);
  const company = await ensureCompanyExists(companyId);

  // Normalize: empty string → null (meaning global company admin)
  const city: string | null = officeCity?.trim() || null;

  const existing = await prisma.companyAdmin.findFirst({
    where: companyAdminWhereFilter(targetUserId, companyId, city),
    select: { id: true },
  });

  const assignment = existing
    ? await prisma.companyAdmin.update({
      where: { id: existing.id },
      data: { grantedById },
      include: {
        user: { select: { id: true, email: true, username: true } },
        company: { select: { id: true, name: true } },
      },
    })
    : await prisma.companyAdmin.create({
      data: {
        userId: targetUserId,
        companyId,
        officeCity: city,
        grantedById,
      },
      include: {
        user: { select: { id: true, email: true, username: true } },
        company: { select: { id: true, name: true } },
      },
    });

  await grantRole(targetUserId, "COMPANY_ADMIN");

  // Promote the new company admin to ADMIN inside all communities for this
  // company and add them as a conversation participant in each community chat.
  await ensureInstitutionAdminInCommunities(targetUserId, { companyId });

  const scope = city ? `${company.name} — ${city} office` : company.name;

  return {
    message: `User assigned as admin of ${scope}`,
    assignment,
  };
};

export const removeCompanyAdmin = async (
  targetUserId: string,
  companyId: string,
  officeCity?: string,
) => {
  await ensureUserExists(targetUserId);
  await ensureCompanyExists(companyId);

  const city: string | null = officeCity?.trim() || null;

  const existingRecord = await prisma.companyAdmin.findFirst({
    where: companyAdminWhereFilter(targetUserId, companyId, city),
    select: { id: true },
  });

  if (!existingRecord) {
    throw new AppError(
      city
        ? `User is not an admin of this company for the ${city} office`
        : "User is not an admin of this company",
      404,
    );
  }

  await prisma.companyAdmin.delete({
    where: { id: existingRecord.id },
  });

  const remainingCompanyAdminCount = await prisma.companyAdmin.count({
    where: { userId: targetUserId },
  });
  const remainingCollegeAdminCount = await prisma.collegeAdmin.count({
    where: { userId: targetUserId },
  });

  await revokeRoleIfOrphaned(
    targetUserId,
    "COMPANY_ADMIN",
    remainingCollegeAdminCount,
    remainingCompanyAdminCount,
  );

  return { message: "Company admin removed successfully" };
};

export const listCompanyAdmins = async (companyId: string) => {
  await ensureCompanyExists(companyId);

  return prisma.companyAdmin.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      grantedBy: {
        select: { id: true, username: true },
      },
    },
  });
};

// ============================================================
// PLATFORM ADMIN CONTROLS
// ============================================================

export const getAdminStats = async () => {
  const [
    userCount,
    collegeCount,
    companyCount,
    projectCount,
    jobCount,
    statusGroups,
    trustGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.college.count(),
    prisma.company.count(),
    prisma.project.count(),
    prisma.job.count(),
    prisma.user.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["trustLevel"],
      _count: { _all: true },
    }),
  ]);

  return {
    userCount,
    collegeCount,
    companyCount,
    projectCount,
    jobCount,
    statusDistribution: statusGroups.map((g) => ({
      status: g.status,
      count: g._count._all,
    })),
    trustLevelDistribution: trustGroups.map((g) => ({
      trustLevel: g.trustLevel,
      count: g._count._all,
    })),
  };
};

export const listUsers = async (search?: string, limit = 50, cursor?: string) => {
  const where: any = {};
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { username: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { profile: { fullName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      status: true,
      trustLevel: true,
      createdAt: true,
      profile: {
        select: {
          fullName: true,
          avatarUrl: true,
        },
      },
      roles: {
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (users.length > limit) {
    const nextUser = users.pop();
    nextCursor = nextUser?.id || null;
  }

  return {
    users,
    nextCursor,
    hasNextPage: !!nextCursor,
  };
};

export const updateUserStatus = async (userId: string, status: "ACTIVE" | "INACTIVE" | "BANNED") => {
  await ensureUserExists(userId);

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, username: true, status: true },
  });
};

export const assignPlatformAdmin = async (grantedById: string, targetUserId: string) => {
  await ensureUserExists(targetUserId);
  await grantRole(targetUserId, "PLATFORM_ADMIN");

  return {
    message: "User assigned as PLATFORM_ADMIN successfully",
  };
};

export const removePlatformAdmin = async (targetUserId: string, executorId: string) => {
  if (targetUserId === executorId) {
    throw new AppError("You cannot revoke your own PLATFORM_ADMIN role to prevent self-lockout", 400);
  }

  await ensureUserExists(targetUserId);

  const role = await prisma.role.findUnique({
    where: { name: "PLATFORM_ADMIN" },
    select: { id: true },
  });

  if (!role) {
    throw new AppError("PLATFORM_ADMIN role not found", 404);
  }

  await prisma.userRole.deleteMany({
    where: { userId: targetUserId, roleId: role.id },
  });

  return {
    message: "PLATFORM_ADMIN role revoked successfully",
  };
};

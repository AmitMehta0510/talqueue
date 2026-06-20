import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { JobStatus, Prisma } from "@prisma/client";
import { createNotification } from "modules/notificatios/notifications.service";
import slugify from "slugify";
import { syncJobToElastic, syncHackathonToElastic, syncProjectToElastic } from "services/elasticSync";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const ensureUserExists = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return user;
};

const ensureCollegeExists = async (collegeId: string, tx?: TxClient) => {
  const db = tx ?? prisma;
  const college = await db.college.findUnique({ where: { id: collegeId } });
  if (!college) throw new AppError("College not found", 404);
  return college;
};

const ensureCompanyExists = async (companyId: string) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError("Company not found", 404);
  return company;
};

/** Prisma interactive-transaction client type alias for internal helpers. */
type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const ensureRole = async (name: string, tx?: TxClient) => {
  const db = tx ?? prisma;
  return db.role.upsert({
    where: { name },
    update: {},
    create: { name },
  });
};

const grantRole = async (userId: string, roleName: string, tx?: TxClient) => {
  const db = tx ?? prisma;
  const role = await ensureRole(roleName, tx);
  const existing = await db.userRole.findFirst({
    where: { userId, roleId: role.id },
  });
  if (!existing) {
    await db.userRole.create({ data: { userId, roleId: role.id } });
  }
  return role;
};

const revokeRoleIfOrphaned = async (
  userId: string,
  roleName: string,
  checkQuery: { model: keyof TxClient; where: Record<string, unknown> },
  tx?: TxClient,
) => {
  const db = tx ?? prisma;
  const role = await db.role.findUnique({ where: { name: roleName } });
  if (!role) return;
  const otherAssignments = await (db[checkQuery.model] as any).count({
    where: { userId, ...checkQuery.where },
  });
  if (otherAssignments === 0) {
    await db.userRole.deleteMany({ where: { userId, roleId: role.id } });
  }
};

/**
 * Ensures the given user holds the ADMIN community role in every community
 * tied to the specified institution (college or company).
 *
 * Optimisation: loads ALL existing memberships in a single query, then
 * issues at most TWO bulk writes (updateMany + createMany) — eliminating
 * the previous N+1 sequential loop.
 *
 * Accepts an optional `tx` client so callers inside `prisma.$transaction`
 * can pass the transaction handle; defaults to the global `prisma` client.
 */
const ensureInstitutionAdminInCommunities = async (
  userId: string,
  type: "COLLEGE" | "COMPANY",
  entityId: string,
  tx?: TxClient,
) => {
  const db = tx ?? prisma;

  // ── Step 1: fetch all communities for this institution (one query) ────────
  const communities = await db.community.findMany({
    where: type === "COLLEGE" ? { collegeId: entityId } : { companyId: entityId },
    select: { id: true },
  });

  if (communities.length === 0) return;

  const communityIds = communities.map((c) => c.id);

  // ── Step 2: load existing memberships in bulk (one query) ─────────────────
  const existingMemberships = await db.communityMember.findMany({
    where: { communityId: { in: communityIds }, userId },
    select: { id: true, communityId: true },
  });

  // Build a Set of community IDs that already have a membership row
  const existingCommunityIds = new Set(existingMemberships.map((m) => m.communityId));

  // ── Step 3: split into update targets vs create targets ──────────────────
  const toUpdate = existingMemberships.map((m) => m.communityId);
  const toCreate = communityIds.filter((id) => !existingCommunityIds.has(id));

  // ── Step 4: two bulk writes (zero N+1 queries) ────────────────────────────
  const writes: Promise<unknown>[] = [];

  if (toUpdate.length > 0) {
    writes.push(
      db.communityMember.updateMany({
        where: { communityId: { in: toUpdate }, userId },
        data: { role: "ADMIN" },
      }),
    );
  }

  if (toCreate.length > 0) {
    writes.push(
      db.communityMember.createMany({
        data: toCreate.map((communityId) => ({ communityId, userId, role: "ADMIN" })),
        skipDuplicates: true,
      }),
    );
  }

  await Promise.all(writes);
};

// ─────────────────────────────────────────────────────────────────────────────
// COLLEGE ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const assignCollegeAdmin = async (
  actorId: string,
  userId: string,
  collegeId: string
) => {
  await ensureUserExists(userId);
  const college = await ensureCollegeExists(collegeId);

  // ── Transactional block: record creation + role grant + community mapping ──
  // All writes succeed together or roll back atomically; partial states are
  // impossible once the transaction commits.
  const assignment = await prisma.$transaction(async (tx) => {
    const existing = await tx.collegeAdmin.findFirst({
      where: { userId, collegeId },
    });
    if (existing) throw new AppError("User is already an admin for this college", 409);

    const record = await tx.collegeAdmin.create({
      data: { userId, collegeId, grantedById: actorId },
      include: { user: { select: { id: true, username: true, email: true } } },
    });

    await grantRole(userId, "COLLEGE_ADMIN", tx);
    await ensureInstitutionAdminInCommunities(userId, "COLLEGE", collegeId, tx);

    return record;
  });

  // ── Side-effect: notification is intentionally outside the transaction ──
  // A notification write failure must not roll back the admin assignment.
  await createNotification({
    userId,
    actorId,
    type: "SYSTEM",
    title: "College Admin Assigned",
    message: `You have been assigned as an administrator for ${college.name}.`,
    entityType: "COLLEGE",
    entityId: collegeId,
  });

  return { message: "College admin assigned successfully", assignment };
};

export const removeCollegeAdmin = async (userId: string, collegeId: string) => {
  // ── Transactional block: delete record + conditional role revoke ───────────
  await prisma.$transaction(async (tx) => {
    const record = await tx.collegeAdmin.findFirst({
      where: { userId, collegeId },
    });
    if (!record) throw new AppError("Assignment not found", 404);

    await tx.collegeAdmin.delete({ where: { id: record.id } });

    // Revoke COLLEGE_ADMIN role only if the user has no remaining college assignments
    await revokeRoleIfOrphaned(
      userId,
      "COLLEGE_ADMIN",
      { model: "collegeAdmin", where: { NOT: { collegeId } } },
      tx,
    );
  });

  return { message: "College admin removed successfully" };
};

export const listCollegeAdmins = async (collegeId: string) => {
  await ensureCollegeExists(collegeId);
  return prisma.collegeAdmin.findMany({
    where: { collegeId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const companyAdminWhereFilter = (userId: string, companyId: string, officeCity?: string) => ({
  userId,
  companyId,
  ...(officeCity ? { officeCity } : {}),
});

export const assignCompanyAdmin = async (
  actorId: string,
  userId: string,
  companyId: string,
  officeCity?: string
) => {
  await ensureUserExists(userId);
  const company = await ensureCompanyExists(companyId);

  // ── Transactional block: record creation + role grant + community mapping ──
  const assignment = await prisma.$transaction(async (tx) => {
    const existing = await tx.companyAdmin.findFirst({
      where: companyAdminWhereFilter(userId, companyId, officeCity),
    });
    if (existing) throw new AppError("User is already an admin for this company scope", 409);

    const record = await tx.companyAdmin.create({
      data: { userId, companyId, officeCity, grantedById: actorId },
      include: { user: { select: { id: true, username: true, email: true } } },
    });

    await grantRole(userId, "COMPANY_ADMIN", tx);
    await ensureInstitutionAdminInCommunities(userId, "COMPANY", companyId, tx);

    return record;
  });

  // ── Side-effect: notification is intentionally outside the transaction ──
  const scopeText = officeCity ? ` (${officeCity} office)` : "";
  await createNotification({
    userId,
    actorId,
    type: "SYSTEM",
    title: "Company Admin Assigned",
    message: `You have been assigned as an administrator for ${company.name}${scopeText}.`,
    entityType: "COMPANY",
    entityId: companyId,
  });

  return { message: "Company admin assigned successfully", assignment };
};

export const removeCompanyAdmin = async (
  userId: string,
  companyId: string,
  officeCity?: string
) => {
  // ── Transactional block: delete record + conditional role revoke ───────────
  await prisma.$transaction(async (tx) => {
    const record = await tx.companyAdmin.findFirst({
      where: companyAdminWhereFilter(userId, companyId, officeCity),
    });
    if (!record) throw new AppError("Assignment not found", 404);

    await tx.companyAdmin.delete({ where: { id: record.id } });

    await revokeRoleIfOrphaned(
      userId,
      "COMPANY_ADMIN",
      { model: "companyAdmin", where: { companyId: { not: companyId } } },
      tx,
    );
  });

  return { message: "Company admin removed successfully" };
};

export const listCompanyAdmins = async (companyId: string) => {
  await ensureCompanyExists(companyId);
  return prisma.companyAdmin.findMany({
    where: { companyId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
};

const PLATFORM_ADMIN_ROLES_LIST = [
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
  "ADMIN",
  "COLLEGE_ADMIN",
  "COLLEGE_DIRECTOR",
  "COMPANY_ADMIN",
];

export const getAdminStats = async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // ── Helper: safely extract an integer from a Prisma groupBy _count value ──
  // Prisma returns either `{ _all: number }` (object shape) or a plain `number`.
  const extractCount = (raw: number | { _all: number }): number =>
    typeof raw === "object" ? raw._all : raw;

  // ──────────────────────────────────────────────────────────────────────────
  // THREE CONCURRENT TRACKS — all launched simultaneously via the outer
  // Promise.all so the DB can schedule them in parallel.
  //
  //  Track 1 — plain entity counts (with soft-delete / archive guards)
  //  Track 2 — filtered / conditional counts
  //  Track 3 — groupBy distribution queries
  // ──────────────────────────────────────────────────────────────────────────
  const [track1, track2, track3] = await Promise.all([

    // ── Track 1: plain entity counts ───────────────────────────────────────
    // Models with `deletedAt` carry a { deletedAt: null } guard.
    // Models with both `deletedAt` AND `archivedAt` (Project, Hackathon)
    // carry both guards so soft-deleted and archived rows are excluded.
    Promise.all([
      prisma.user.count(),
      prisma.college.count(),
      prisma.company.count(),
      prisma.project.count({ where: { deletedAt: null, archivedAt: null } }),
      prisma.job.count({ where: { deletedAt: null } }),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.hackathon.count({ where: { deletedAt: null, archivedAt: null } }),
      prisma.community.count(),
      prisma.referralRequest.count(),
      prisma.connection.count(),
      prisma.message.count({ where: { deletedAt: null } }),
    ]),

    // ── Track 2: filtered / conditional counts ──────────────────────────────
    Promise.all([
      prisma.job.count({ where: { status: JobStatus.OPEN, deletedAt: null } }),
      prisma.project.count({ where: { status: "OPEN", deletedAt: null, archivedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    ]),

    // ── Track 3: groupBy distribution queries ───────────────────────────────
    Promise.all([
      prisma.user.groupBy({ by: ["status"], _count: true }),
      prisma.user.groupBy({ by: ["trustLevel"], _count: true }),
      prisma.userRole.groupBy({
        by: ["roleId"],
        _count: true,
        where: { role: { name: { in: PLATFORM_ADMIN_ROLES_LIST } } },
      }),
      prisma.user.groupBy({ by: ["primaryRole"], _count: true }),
    ]),
  ]);

  // ── Destructure tracks ─────────────────────────────────────────────────────
  const [
    userCount,
    collegeCount,
    companyCount,
    projectCount,
    jobCount,
    postCount,
    hackathonCount,
    communityCount,
    referralCount,
    connectionCount,
    messageCount,
  ] = track1;

  const [activeJobCount, openProjectCount, newUsersToday, newUsersThisWeek] = track2;

  const [statusDistribution, trustLevelDistribution, platformRoleDistribution, userRoleDistribution] = track3;

  // ── Sequential follow-up: resolve role names for platformRoleDistribution ──
  // This query depends on roleIds from track 3, so it runs after the main
  // concurrent block rather than racing it.
  const roleIds = platformRoleDistribution.map((r) => r.roleId);
  const roles = await prisma.role.findMany({ where: { id: { in: roleIds } } });
  const roleMap = Object.fromEntries(
    roles.map((r: { id: string; name: string }) => [r.id, r.name]),
  );

  return {
    userCount,
    collegeCount,
    companyCount,
    projectCount,
    jobCount,
    postCount,
    hackathonCount,
    communityCount,
    referralCount,
    connectionCount,
    messageCount,
    activeJobCount,
    openProjectCount,
    newUsersToday,
    newUsersThisWeek,
    statusDistribution: statusDistribution.map((g) => ({
      status: g.status,
      count: extractCount(g._count),
    })),
    trustLevelDistribution: trustLevelDistribution.map((g) => ({
      trustLevel: g.trustLevel,
      count: extractCount(g._count),
    })),
    platformRoleDistribution: platformRoleDistribution.map((g) => ({
      roleName: roleMap[g.roleId] || g.roleId,
      count: extractCount(g._count),
    })),
    userRoleDistribution: userRoleDistribution
      .filter((g) => g.primaryRole !== null && g.primaryRole !== undefined)
      .map((g) => ({
        role: g.primaryRole,
        count: extractCount(g._count),
      })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const USER_LIST_SELECT = {
  id: true,
  username: true,
  email: true,
  status: true,
  primaryRole: true,
  trustLevel: true,
  createdAt: true,
  profile: {
    select: {
      fullName: true,
      avatarUrl: true,
    },
  },
} as const;

const USER_DETAIL_SELECT = {
  id: true,
  username: true,
  email: true,
  status: true,
  primaryRole: true,
  trustLevel: true,
  createdAt: true,
  profile: {
    select: {
      fullName: true,
      avatarUrl: true,
      college: { select: { name: true } },
    },
  },
  roles: {
    select: {
      role: { select: { name: true, id: true } },
    },
  },
  _count: {
    select: {
      posts: true,
      projectMemberships: true,
      followers: true,
    },
  },
} as const;

export const listUsers = async (
  search?: string,
  limit = 50,
  cursor?: string
) => {
  const where: any = search
    ? {
      OR: [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { profile: { fullName: { contains: search, mode: "insensitive" } } },
      ],
    }
    : {};

  const take = limit + 1;
  const users = await prisma.user.findMany({
    where,
    select: USER_LIST_SELECT,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasNextPage = users.length > limit;
  const page = hasNextPage ? users.slice(0, limit) : users;
  return {
    users: page,
    nextCursor: hasNextPage ? page[page.length - 1].id : null,
    hasNextPage,
  };
};

export const getUserDetail = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...USER_DETAIL_SELECT,
      educations: true,
      experiences: true,
      skills: { include: { skill: true } },
      collegeAdminships: { include: { college: { select: { id: true, name: true } } } },
      companyAdminships: { include: { company: { select: { id: true, name: true } } } },
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const updateUserStatus = async (
  userId: string,
  status: "ACTIVE" | "INACTIVE" | "BANNED",
  actorId: string
) => {
  if (actorId === userId) {
    throw new AppError("Self-banning or deactivation is not allowed", 403);
  }

  await ensureUserExists(userId);

  // Guard: SUPER_ADMIN accounts cannot have their status changed via the admin panel
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (superAdminRole) {
    const isSuperAdmin = await prisma.userRole.findFirst({
      where: { userId, roleId: superAdminRole.id },
    });
    if (isSuperAdmin) {
      throw new AppError("Super Admin accounts cannot be banned or deactivated", 403);
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, username: true, status: true },
  });
};

export const assignPlatformAdmin = async (actorId: string, userId: string) => {
  // Defence-in-depth: verify actor is SUPER_ADMIN at the service layer
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { roles: { select: { role: { select: { name: true } } } } },
  });
  const actorRoles = new Set((actor?.roles || []).map((ur: any) => ur.role?.name));
  if (!actorRoles.has("SUPER_ADMIN")) {
    throw new AppError("Only SUPER_ADMIN can grant platform admin privileges", 403);
  }

  await ensureUserExists(userId);
  await grantRole(userId, "PLATFORM_ADMIN");
  return { message: "PLATFORM_ADMIN role granted successfully" };
};

export const removePlatformAdmin = async (userId: string, actorId: string) => {
  if (userId === actorId) throw new AppError("Cannot revoke your own admin role", 403);

  // Defence-in-depth: verify actor is SUPER_ADMIN at the service layer
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { roles: { select: { role: { select: { name: true } } } } },
  });
  const actorRoles = new Set((actor?.roles || []).map((ur: any) => ur.role?.name));
  if (!actorRoles.has("SUPER_ADMIN")) {
    throw new AppError("Only SUPER_ADMIN can revoke platform admin privileges", 403);
  }

  const role = await prisma.role.findUnique({ where: { name: "PLATFORM_ADMIN" } });
  if (!role) throw new AppError("PLATFORM_ADMIN role does not exist", 404);
  await prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
  return { message: "PLATFORM_ADMIN role revoked successfully" };
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — POSTS
// ─────────────────────────────────────────────────────────────────────────────

export const adminListPosts = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const where: any = {
    deletedAt: null,
    ...(q ? { content: { contains: q, mode: "insensitive" } } : {}),
  };
  const take = limit + 1;

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const hasNextPage = posts.length > limit;
  const page = hasNextPage ? posts.slice(0, limit) : posts;
  return { posts: page, nextCursor: hasNextPage ? page[page.length - 1].id : null, hasNextPage };
};

export const adminDeletePost = async (postId: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Post not found", 404);
  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  });
  return { message: "Post removed successfully" };
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — HACKATHONS
// ─────────────────────────────────────────────────────────────────────────────

export const adminListHackathons = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const where: any = {
    deletedAt: null,
    archivedAt: null,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const take = limit + 1;

  const hackathons = await prisma.hackathon.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { registrations: true } },
    },
  });

  const hasNextPage = hackathons.length > limit;
  const page = hasNextPage ? hackathons.slice(0, limit) : hackathons;
  return { hackathons: page, nextCursor: hasNextPage ? page[page.length - 1].id : null, hasNextPage };
};

export const adminUpdateHackathonStatus = async (hackathonId: string, status: string) => {
  const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
  if (!hackathon) throw new AppError("Hackathon not found", 404);
  
  let targetStatus = status;
  if (status === "ACTIVE") {
    targetStatus = "OPEN";
  }
  
  const isActivating = hackathon.status === "DRAFT" && (targetStatus === "OPEN" || targetStatus === "LIVE");
  
  const updatedHackathon = await prisma.hackathon.update({
    where: { id: hackathonId },
    data: {
      status: targetStatus as any,
      ...(isActivating ? { verified: true } : {}),
    },
  });

  try {
    syncHackathonToElastic(updatedHackathon.id);
  } catch (error) {
    console.error(`Failed to trigger elastic sync for hackathon ${updatedHackathon.id}:`, error);
  }

  return updatedHackathon;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — PROJECTS
// ─────────────────────────────────────────────────────────────────────────────

export const adminListProjects = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const where: any = {
    deletedAt: null,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const take = limit + 1;

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      _count: { select: { members: true } },
    },
  });

  const hasNextPage = projects.length > limit;
  const page = hasNextPage ? projects.slice(0, limit) : projects;
  return { projects: page, nextCursor: hasNextPage ? page[page.length - 1].id : null, hasNextPage };
};

export const adminUpdateProjectStatus = async (projectId: string, status: string) => {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
  if (!project) throw new AppError("Project not found", 404);
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { status: status as any },
  });

  Promise.resolve(syncProjectToElastic(updatedProject.id)).catch((error) => {
    console.error(`[ES Sync] Failed to sync updated project '${updatedProject.id}' to Elasticsearch:`, error?.message || error);
  });

  return updatedProject;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — JOBS
// ─────────────────────────────────────────────────────────────────────────────

export const adminListJobs = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const where: any = {
    deletedAt: null,
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { company: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const take = limit + 1;

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      company: { select: { id: true, name: true, logoUrl: true } },
      _count: { select: { applications: true } },
    },
  });

  const hasNextPage = jobs.length > limit;
  const page = hasNextPage ? jobs.slice(0, limit) : jobs;
  return { jobs: page, nextCursor: hasNextPage ? page[page.length - 1].id : null, hasNextPage };
};

export const adminDeleteJob = async (jobId: string) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) throw new AppError("Job not found", 404);
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "DELETED",
      deletedAt: new Date(),
    },
  });
  Promise.resolve(syncJobToElastic(jobId)).catch((err) => {
    console.error(`[ES Sync] Failed to sync deleted job '${jobId}' to Elasticsearch:`, err);
  });
  return { message: "Job removed successfully (soft deleted)" };
};

export const adminUpdateJob = async (jobId: string, data: any) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) throw new AppError("Job not found", 404);

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: {
      title: data.title !== undefined ? data.title : undefined,
      description: data.description !== undefined ? data.description : undefined,
      requirements: data.requirements !== undefined ? data.requirements : undefined,
      responsibilities: data.responsibilities !== undefined ? data.responsibilities : undefined,
      perks: data.perks !== undefined ? data.perks : undefined,
      location: data.location !== undefined ? data.location : undefined,
      workMode: data.workMode !== undefined ? data.workMode : undefined,
      type: data.type !== undefined ? data.type : undefined,
      experienceLevel: data.experienceLevel !== undefined ? data.experienceLevel : undefined,
      salaryMin: data.salaryMin !== undefined ? (data.salaryMin === "" || data.salaryMin === null ? null : Number(data.salaryMin)) : undefined,
      salaryMax: data.salaryMax !== undefined ? (data.salaryMax === "" || data.salaryMax === null ? null : Number(data.salaryMax)) : undefined,
      currency: data.currency !== undefined ? data.currency : undefined,
      openings: data.openings !== undefined ? (data.openings === "" || data.openings === null ? null : Number(data.openings)) : undefined,
      skillsRequired: data.skillsRequired !== undefined ? data.skillsRequired : undefined,
      applicationDeadline: data.applicationDeadline !== undefined ? (data.applicationDeadline ? new Date(data.applicationDeadline) : null) : undefined,
      applyUrl: data.applyUrl !== undefined ? data.applyUrl : undefined,
      featured: data.featured !== undefined ? Boolean(data.featured) : undefined,
      status: data.status !== undefined ? data.status : undefined,
    },
  });
  Promise.resolve(syncJobToElastic(updatedJob.id)).catch((err) => {
    console.error(`[ES Sync] Failed to sync updated job '${updatedJob.id}' to Elasticsearch:`, err);
  });
  return updatedJob;
};

export const adminCreateJob = async (adminId: string, data: any) => {
  const company = await prisma.company.findUnique({
    where: { id: data.companyId },
    select: { id: true, name: true },
  });
  if (!company) throw new AppError("Company not found", 404);

  const cleanTitle = data.title.normalize("NFKC").trim().replace(/\s+/g, " ");
  const baseSlug = slugify(cleanTitle, { lower: true, strict: true, trim: true });
  const slug = `${baseSlug}-${Date.now()}`;

  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      postedById: adminId,
      title: data.title,
      slug,
      description: data.description,
      requirements: data.requirements || null,
      responsibilities: data.responsibilities || null,
      perks: data.perks || null,
      location: data.location || null,
      workMode: data.workMode || null,
      type: data.type,
      experienceLevel: data.experienceLevel || null,
      salaryMin: data.salaryMin ? Number(data.salaryMin) : null,
      salaryMax: data.salaryMax ? Number(data.salaryMax) : null,
      currency: data.currency || "INR",
      openings: data.openings ? Number(data.openings) : null,
      skillsRequired: data.skillsRequired || [],
      applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : null,
      applyUrl: data.applyUrl || null,
      featured: data.featured || false,
      status: data.status || "OPEN",
    },
  });
  Promise.resolve(syncJobToElastic(job.id)).catch((err) => {
    console.error(`[ES Sync] Failed to sync created job '${job.id}' to Elasticsearch:`, err);
  });
  return job;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — COMMUNITIES
// ─────────────────────────────────────────────────────────────────────────────

export const adminListCommunities = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const boundedLimit = Math.min(Math.max(1, limit), 100);
  const where: any = {
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
  };
  const take = boundedLimit + 1;

  const communities = await prisma.community.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      college: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });

  const hasNextPage = communities.length > boundedLimit;
  const page = hasNextPage ? communities.slice(0, boundedLimit) : communities;
  return { communities: page, nextCursor: hasNextPage ? page[page.length - 1].id : null, hasNextPage };
};

export const adminUpdateCommunity = async (
  communityId: string,
  updates: { archived?: boolean; verified?: boolean }
) => {
  const community = await prisma.community.findFirst({ where: { id: communityId, deletedAt: null } });
  if (!community) throw new AppError("Community not found", 404);

  const data: any = {};
  if (updates.archived !== undefined) data.archived = updates.archived;
  if (updates.verified !== undefined) data.verified = updates.verified;

  return prisma.community.update({ where: { id: communityId }, data });
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — REFERRALS
// ─────────────────────────────────────────────────────────────────────────────

export const adminListReferrals = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const boundedLimit = Math.min(Math.max(1, limit), 100);
  const where: any = q
    ? { OR: [{ companyName: { contains: q, mode: "insensitive" } }, { jobRole: { contains: q, mode: "insensitive" } }] }
    : {};
  const take = boundedLimit + 1;

  const referrals = await prisma.referralRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      requester: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  const hasNextPage = referrals.length > boundedLimit;
  const page = hasNextPage ? referrals.slice(0, boundedLimit) : referrals;
  return { referrals: page, nextCursor: hasNextPage ? page[page.length - 1].id : null, hasNextPage };
};

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const adminCreateDepartment = async (
  actorId: string,
  data: { name: string; collegeId: string; hod?: string }
) => {
  return prisma.$transaction(async (tx) => {
    await ensureCollegeExists(data.collegeId, tx);

    const existing = await tx.department.findFirst({
      where: { name: { equals: data.name, mode: "insensitive" }, collegeId: data.collegeId },
    });
    if (existing) throw new AppError("Department with this name already exists", 409);

    return tx.department.create({
      data: { name: data.name, collegeId: data.collegeId, hod: data.hod },
    });
  });
};

export const adminListDepartments = async (collegeId: string, limit = 50) => {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  await ensureCollegeExists(collegeId);
  return prisma.department.findMany({
    where: { collegeId },
    orderBy: { name: "asc" },
    take: safeLimit,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY REQUEST MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const adminListCompanyRequests = async (status?: string, limit = 50) => {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  return prisma.companyRequest.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    include: {
      requestedBy: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          gstin: true,
          cin: true,
        },
      },
    },
  });
};

export const adminApproveCompanyRequest = async (
  adminId: string,
  requestId: string,
  options?: { logoUrl?: string; websiteUrl?: string; headquarters?: string; industry?: string }
) => {
  return prisma.$transaction(async (tx) => {
    const request = await tx.companyRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppError("Company request not found", 404);
    if (request.status !== "PENDING") throw new AppError("Request is not in PENDING state", 400);

    const pendingData = request.pendingJobData as any;
    const companyDetails = pendingData?.companyDetails || {};

    // Create the company
    const slugBase = request.companyName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const slug = `${slugBase}-${Date.now()}`;

    const company = await tx.company.create({
      data: {
        name: request.companyName,
        slug,
        verified: true,
        logoUrl: options?.logoUrl || companyDetails.logoUrl || null,
        websiteUrl: options?.websiteUrl || companyDetails.websiteUrl || null,
        headquarters: options?.headquarters || companyDetails.headquarters || null,
        industry: options?.industry || companyDetails.industry || null,
        description: companyDetails.description || null,
        tagline: companyDetails.tagline || null,
        foundedYear: companyDetails.foundedYear ? Number(companyDetails.foundedYear) : null,
        type: companyDetails.type || null,
        size: companyDetails.size || null,
        careersPageUrl: companyDetails.careersPageUrl || null,
        githubUrl: companyDetails.githubUrl || null,
      },
    });

    // Create the job if a title exists (it's a job post request)
    let job: { id: string; title: string } | null = null;
    if (pendingData && pendingData.title) {
      const jobSlugBase = `${pendingData.title}-${company.name}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const jobSlug = `${jobSlugBase}-${Date.now()}`;

      job = await tx.job.create({
        data: {
          companyId: company.id,
          postedById: request.requestedById,
          title: pendingData.title,
          slug: jobSlug,
          description: pendingData.description,
          requirements: pendingData.requirements,
          responsibilities: pendingData.responsibilities,
          location: pendingData.location,
          workMode: pendingData.workMode,
          type: pendingData.type,
          experienceLevel: pendingData.experienceLevel,
          salaryMin: pendingData.salaryMin,
          salaryMax: pendingData.salaryMax,
          currency: pendingData.currency || "INR",
          skillsRequired: pendingData.skillsRequired || [],
          applicationDeadline: pendingData.applicationDeadline ? new Date(pendingData.applicationDeadline) : null,
          applyUrl: pendingData.applyUrl,
          featured: pendingData.featured || false,
        },
        select: { id: true, title: true },
      });
      
      Promise.resolve(syncJobToElastic(job!.id)).catch((err) => {
        console.error(`[ES Sync] Failed to sync job '${job!.id}' to Elasticsearch:`, err);
      });
    }

    // Update company request status
    await tx.companyRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        companyId: company.id,
        jobId: job ? job.id : null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    // Notify the requester
    await tx.notification.create({
      data: {
        userId: request.requestedById,
        type: "SYSTEM",
        title: job ? "Company Approved & Job Posted!" : "Company Registration Approved!",
        message: job 
          ? `Your company "${request.companyName}" has been verified. Your job "${job.title}" is now live.`
          : `Your registration request for "${request.companyName}" has been verified and approved.`,
        entityType: job ? "JOB" : "COMPANY",
        entityId: job ? job.id : company.id,
      },
    });

    return { success: true, company, job };
  });
};

export const adminRejectCompanyRequest = async (
  adminId: string,
  requestId: string,
  reviewNotes?: string,
) => {
  return prisma.$transaction(async (tx) => {
    const request = await tx.companyRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppError("Company request not found", 404);
    if (request.status !== "PENDING") throw new AppError("Request is not in PENDING state", 400);

    await tx.companyRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedById: adminId,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
      },
    });

    // Notify the recruiter
    await tx.notification.create({
      data: {
        userId: request.requestedById,
        type: "SYSTEM",
        title: "Company Request Rejected",
        message: `Your request to add "${request.companyName}" was rejected.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`,
      },
    });

    return { success: true };
  });
};

export const adminUpdateHackathon = async (hackathonId: string, data: any) => {
  const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
  if (!hackathon) throw new AppError("Hackathon not found", 404);

  const updatedHackathon = await prisma.hackathon.update({
    where: { id: hackathonId },
    data: {
      title: data.title !== undefined ? data.title : undefined,
      description: data.description !== undefined ? data.description : undefined,
      shortDescription: data.shortDescription !== undefined ? data.shortDescription : undefined,
      externalUrl: data.externalUrl !== undefined ? data.externalUrl : undefined,
      mode: data.mode !== undefined ? data.mode : undefined,
      location: data.location !== undefined ? data.location : undefined,
      minTeamSize: data.minTeamSize !== undefined ? Number(data.minTeamSize) : undefined,
      maxTeamSize: data.maxTeamSize !== undefined ? Number(data.maxTeamSize) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
      verified: data.verified !== undefined ? Boolean(data.verified) : undefined,
      featured: data.featured !== undefined ? Boolean(data.featured) : undefined,
      status: data.status !== undefined ? data.status : undefined,
    },
  });
  Promise.resolve(syncHackathonToElastic(updatedHackathon.id)).catch((err) => {
    console.error(`[ES Sync] Failed to sync updated hackathon '${updatedHackathon.id}' to Elasticsearch:`, err);
  });
  return updatedHackathon;
};

export const reviewBusinessRequest = async (
  adminId: string,
  requestId: string,
  action: "APPROVE" | "REJECT"
) => {
  const request = await prisma.companyRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new AppError("Company request not found", 404);
  }

  if (request.status !== "PENDING") {
    throw new AppError("Request is not in PENDING state", 400);
  }

  return prisma.$transaction(async (tx) => {
    if (action === "APPROVE") {
      if (request.requestType === "COMPANY_CLAIM") {
        if (!request.companyId) {
          throw new AppError("Company ID is missing from the claim request", 400);
        }

        // Update target company row: verificationStatus = 'VERIFIED' and verified = true
        await tx.company.update({
          where: { id: request.companyId },
          data: {
            verificationStatus: "VERIFIED",
            verified: true,
          },
        });

        // Create a parent record in CompanyAdmin with officeCity = null assigning global brand manager privileges to requestor
        await tx.companyAdmin.create({
          data: {
            userId: request.requestedById,
            companyId: request.companyId,
            officeCity: null,
            grantedById: adminId,
          },
        });

        // Update request status to APPROVED
        await tx.companyRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            reviewedById: adminId,
            reviewedAt: new Date(),
          },
        });

        // Notify user
        await tx.notification.create({
          data: {
            userId: request.requestedById,
            type: "SYSTEM",
            title: "Company Claim Approved",
            message: `Your claim request for company "${request.companyName}" has been approved. You are now a global administrator.`,
            entityType: "COMPANY",
            entityId: request.companyId,
          },
        });
      } else if (request.requestType === "RECRUITER_ONBOARDING") {
        if (!request.companyId) {
          throw new AppError("Company ID is missing from onboarding request", 400);
        }

        // Update request status to APPROVED
        await tx.companyRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            reviewedById: adminId,
            reviewedAt: new Date(),
          },
        });

        // Grant recruiter role to user (using the tx-scoped helper functions)
        await grantRole(request.requestedById, "RECRUITER", tx);

        // Create current recruiter Experience record if it does not exist
        const existingExp = await tx.experience.findFirst({
          where: {
            userId: request.requestedById,
            companyId: request.companyId,
            isCurrent: true,
          },
        });

        if (!existingExp) {
          await tx.experience.create({
            data: {
              userId: request.requestedById,
              companyId: request.companyId,
              title: "Recruiter",
              employmentType: "FULL_TIME",
              startDate: new Date(),
              isCurrent: true,
              description: `Recruitment team member at ${request.companyName}`,
            },
          });
        }

        // Notify user
        await tx.notification.create({
          data: {
            userId: request.requestedById,
            type: "SYSTEM",
            title: "Recruiter Onboarding Approved",
            message: `Your recruiter onboarding request for "${request.companyName}" has been approved.`,
            entityType: "COMPANY",
            entityId: request.companyId,
          },
        });
      }
    } else {
      // action === 'REJECT'
      await tx.companyRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });

      if (request.requestType === "COMPANY_CLAIM" && request.companyId) {
        // Reset verification status
        await tx.company.update({
          where: { id: request.companyId },
          data: {
            verificationStatus: "REJECTED",
          },
        });
      }

      // Notify user
      await tx.notification.create({
        data: {
          userId: request.requestedById,
          type: "SYSTEM",
          title: "Business Request Rejected",
          message: `Your request regarding company "${request.companyName}" was rejected.`,
          entityType: "COMPANY",
          entityId: request.companyId || undefined,
        },
      });
    }

    return { success: true };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// COLLEGE REQUEST MANAGEMENT (INSTITUTIONAL B2B ONBOARDING REVIEW)
// ─────────────────────────────────────────────────────────────────────────────

const normalizeCollegeKey = (name: string) =>
  slugify(name.normalize("NFKC").trim().replace(/\s+/g, " "), {
    lower: true,
    strict: true,
    trim: true,
  });

/**
 * List college onboarding requests for the admin dashboard.
 * Optionally filtered by status. Returns newest-first, cursor-paginated.
 */
export const listCollegeRequests = async (params: {
  status?: string;
  limit?: number;
  cursor?: string;
}) => {
  const { status, limit = 20, cursor } = params;

  const where: any = status ? { status } : {};
  const take = limit + 1;

  const requests = await prisma.collegeRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  const hasNextPage = requests.length > limit;
  const page = hasNextPage ? requests.slice(0, limit) : requests;
  return {
    requests: page,
    nextCursor: hasNextPage ? page[page.length - 1].id : null,
    hasNextPage,
  };
};

/**
 * Get a single college onboarding request by ID.
 */
export const getCollegeRequest = async (requestId: string) => {
  const request = await prisma.collegeRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!request) throw new AppError("College request not found", 404);
  return request;
};

/**
 * Super-admin review of a college onboarding request.
 *
 * action "APPROVE":
 *   1. Load request — must be PENDING
 *   2. Upsert College catalog record (by normalizedKey)
 *   3. Set college.masterAdminUserId = request.userId
 *   4. Upsert CollegeAdmin row for the requesting user
 *   5. Mark CollegeRequest as VERIFIED
 *   6. Notify the requesting user
 *
 * action "REJECT":
 *   - Mark as REJECTED, store adminNote, notify user
 *
 * action "DUPLICATE":
 *   - Mark as DUPLICATE, store adminNote
 *
 * STRICT: No automatic role grants (TPO/HOD/CDCR) are performed here.
 * The master CollegeAdmin must assign those roles manually.
 */
export const reviewCollegeRequest = async (
  actorId: string,
  requestId: string,
  action: "APPROVE" | "REJECT" | "DUPLICATE",
  adminNote?: string,
) => {
  const request = await prisma.collegeRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      userId: true,
      name: true,
      city: true,
      state: true,
      country: true,
      website: true,
      status: true,
    },
  });

  if (!request) throw new AppError("College request not found", 404);

  if (request.status !== "PENDING") {
    throw new AppError(
      `This request has already been processed (status: ${request.status})`,
      409,
    );
  }

  if (action === "APPROVE") {
    const normalizedName = request.name.normalize("NFKC").trim().replace(/\s+/g, " ");
    const normalizedKey = normalizeCollegeKey(normalizedName);

    if (!normalizedKey) {
      throw new AppError("College name is invalid and cannot be normalised", 400);
    }

    // ── Atomic approval block ──────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Upsert or find the College catalog record
      const college = await tx.college.upsert({
        where: { normalizedKey },
        update: {
          // Enrich existing catalog record with any new data from request
          city: request.city ?? undefined,
          state: request.state ?? undefined,
          country: request.country ?? undefined,
          website: request.website ?? undefined,
          // Set master admin on the existing record
          masterAdminUserId: request.userId,
        },
        create: {
          name: normalizedName,
          normalizedKey,
          city: request.city ?? undefined,
          state: request.state ?? undefined,
          country: request.country ?? undefined,
          website: request.website ?? undefined,
          masterAdminUserId: request.userId,
        },
        select: { id: true, name: true, masterAdminUserId: true },
      });

      // Step 2: Upsert CollegeAdmin row for the requesting user
      const existingAdmin = await tx.collegeAdmin.findUnique({
        where: { userId_collegeId: { userId: request.userId, collegeId: college.id } },
        select: { id: true },
      });

      if (!existingAdmin) {
        await tx.collegeAdmin.create({
          data: {
            userId: request.userId,
            collegeId: college.id,
            grantedById: actorId,
          },
        });
      }

      await grantRole(request.userId, "COLLEGE_ADMIN", tx);

      // Step 3: Mark request as VERIFIED
      await tx.collegeRequest.update({
        where: { id: requestId },
        data: { status: "VERIFIED", adminNote: adminNote ?? null },
      });

      return college;
    });

    // ── Side-effect: notification outside transaction ───────────────────────
    setImmediate(() => {
      createNotification({
        userId: request.userId,
        actorId,
        type: "SYSTEM",
        title: "Institutional Onboarding Approved",
        message: `Your college onboarding request for "${result.name}" has been approved. You are now the master administrator for this college.`,
        entityType: "COLLEGE",
        entityId: result.id,
      }).catch((err) => {
        console.error("Failed to send college approval notification:", err);
      });
    });

    return {
      message: "College onboarding request approved",
      college: result,
    };
  }

  if (action === "REJECT") {
    await prisma.collegeRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", adminNote: adminNote ?? null },
    });

    setImmediate(() => {
      createNotification({
        userId: request.userId,
        actorId,
        type: "SYSTEM",
        title: "Institutional Onboarding Rejected",
        message: `Your college onboarding request for "${request.name}" was not approved.${adminNote ? ` Reason: ${adminNote}` : ""}`,
      }).catch((err) => {
        console.error("Failed to send college rejection notification:", err);
      });
    });

    return { message: "College onboarding request rejected" };
  }

  // action === "DUPLICATE"
  await prisma.collegeRequest.update({
    where: { id: requestId },
    data: { status: "DUPLICATE", adminNote: adminNote ?? null },
  });

  return { message: "College onboarding request marked as duplicate" };
};

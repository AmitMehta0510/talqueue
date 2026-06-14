import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { JobStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const ensureUserExists = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return user;
};

const ensureCollegeExists = async (collegeId: string) => {
  const college = await prisma.college.findUnique({ where: { id: collegeId } });
  if (!college) throw new AppError("College not found", 404);
  return college;
};

const ensureCompanyExists = async (companyId: string) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError("Company not found", 404);
  return company;
};

const ensureRole = async (name: string) => {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name },
  });
};

const grantRole = async (userId: string, roleName: string) => {
  const role = await ensureRole(roleName);
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId: role.id },
  });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, roleId: role.id } });
  }
  return role;
};

const revokeRoleIfOrphaned = async (userId: string, roleName: string, checkQuery: any) => {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return;
  const otherAssignments = await (prisma[checkQuery.model] as any).count({
    where: { userId, ...checkQuery.where },
  });
  if (otherAssignments === 0) {
    await prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
  }
};

const ensureInstitutionAdminInCommunities = async (
  userId: string,
  type: "COLLEGE" | "COMPANY",
  entityId: string
) => {
  const communities = await prisma.community.findMany({
    where:
      type === "COLLEGE"
        ? { collegeId: entityId }
        : { companyId: entityId },
    select: { id: true },
  });

  for (const community of communities) {
    const existing = await prisma.communityMember.findFirst({
      where: { communityId: community.id, userId },
    });
    if (existing) {
      await prisma.communityMember.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      });
    } else {
      await prisma.communityMember.create({
        data: { communityId: community.id, userId, role: "ADMIN" },
      });
    }
  }
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
  await ensureCollegeExists(collegeId);

  const existing = await prisma.collegeAdmin.findFirst({
    where: { userId, collegeId },
  });
  if (existing) throw new AppError("User is already an admin for this college", 409);

  const assignment = await prisma.collegeAdmin.create({
    data: { userId, collegeId, grantedById: actorId },
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  await grantRole(userId, "COLLEGE_ADMIN");
  await ensureInstitutionAdminInCommunities(userId, "COLLEGE", collegeId);

  return { message: "College admin assigned successfully", assignment };
};

export const removeCollegeAdmin = async (userId: string, collegeId: string) => {
  const record = await prisma.collegeAdmin.findFirst({
    where: { userId, collegeId },
  });
  if (!record) throw new AppError("Assignment not found", 404);

  await prisma.collegeAdmin.delete({ where: { id: record.id } });

  // Revoke COLLEGE_ADMIN role if no more college assignments
  await revokeRoleIfOrphaned(userId, "COLLEGE_ADMIN", {
    model: "collegeAdmin",
    where: { NOT: { collegeId } },
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
  await ensureCompanyExists(companyId);

  const existing = await prisma.companyAdmin.findFirst({
    where: companyAdminWhereFilter(userId, companyId, officeCity),
  });
  if (existing) throw new AppError("User is already an admin for this company scope", 409);

  const assignment = await prisma.companyAdmin.create({
    data: { userId, companyId, officeCity, grantedById: actorId },
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  await grantRole(userId, "COMPANY_ADMIN");
  await ensureInstitutionAdminInCommunities(userId, "COMPANY", companyId);

  return { message: "Company admin assigned successfully", assignment };
};

export const removeCompanyAdmin = async (
  userId: string,
  companyId: string,
  officeCity?: string
) => {
  const record = await prisma.companyAdmin.findFirst({
    where: companyAdminWhereFilter(userId, companyId, officeCity),
  });
  if (!record) throw new AppError("Assignment not found", 404);

  await prisma.companyAdmin.delete({ where: { id: record.id } });

  await revokeRoleIfOrphaned(userId, "COMPANY_ADMIN", {
    model: "companyAdmin",
    where: { companyId: { not: companyId } },
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
    activeJobCount,
    openProjectCount,
    newUsersToday,
    newUsersThisWeek,
    statusDistribution,
    trustLevelDistribution,
    platformRoleDistribution,
    userRoleDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.college.count(),
    prisma.company.count(),
    prisma.project.count(),
    prisma.job.count(),
    prisma.post.count(),
    prisma.hackathon.count(),
    prisma.community.count(),
    prisma.referralRequest.count(),
    prisma.connection.count(),
    prisma.message.count(),
    prisma.job.count({ where: { status: JobStatus.OPEN } }),
    prisma.project.count({ where: { status: "OPEN" } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.groupBy({ by: ["status"], _count: true }),
    prisma.user.groupBy({ by: ["trustLevel"], _count: true }),
    prisma.userRole.groupBy({
      by: ["roleId"],
      _count: true,
      where: {
        role: {
          name: {
            in: PLATFORM_ADMIN_ROLES_LIST,
          },
        },
      },
    }),
    prisma.user.groupBy({ by: ["primaryRole"], _count: true }),
  ]);

  // Resolve role names for platformRoleDistribution
  const roleIds = platformRoleDistribution.map((r: any) => r.roleId);
  const roles = await prisma.role.findMany({ where: { id: { in: roleIds } } });
  const roleMap = Object.fromEntries(roles.map((r: { id: string; name: string }) => [r.id, r.name]));

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
    statusDistribution: statusDistribution.map((g: any) => ({
      status: g.status,
      count: (g._count as any)._all ?? g._count,
    })),
    trustLevelDistribution: trustLevelDistribution.map((g: any) => ({
      trustLevel: g.trustLevel,
      count: (g._count as any)._all ?? g._count,
    })),
    platformRoleDistribution: platformRoleDistribution.map((g: any) => ({
      roleName: roleMap[g.roleId] || g.roleId,
      count: (g._count as any)._all ?? g._count,
    })),
    userRoleDistribution: userRoleDistribution
      .filter((g: any) => g.primaryRole !== null && g.primaryRole !== undefined)
      .map((g: any) => ({
        role: g.primaryRole,
        count: (g._count as any)._all ?? g._count,
      })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const USER_SELECT = {
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
    select: USER_SELECT,
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
      ...USER_SELECT,
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
  status: "ACTIVE" | "INACTIVE" | "BANNED"
) => {
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
  const where: any = q ? { content: { contains: q, mode: "insensitive" } } : {};
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
  await prisma.post.delete({ where: { id: postId } });
  return { message: "Post removed successfully" };
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — HACKATHONS
// ─────────────────────────────────────────────────────────────────────────────

export const adminListHackathons = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const where: any = q ? { title: { contains: q, mode: "insensitive" } } : {};
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
  
  return prisma.hackathon.update({
    where: { id: hackathonId },
    data: {
      status: targetStatus as any,
      ...(isActivating ? { verified: true } : {}),
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — PROJECTS
// ─────────────────────────────────────────────────────────────────────────────

export const adminListProjects = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const where: any = q ? { title: { contains: q, mode: "insensitive" } } : {};
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
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Project not found", 404);
  return prisma.project.update({ where: { id: projectId }, data: { status: status as any } });
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — JOBS
// ─────────────────────────────────────────────────────────────────────────────

export const adminListJobs = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const where: any = q
    ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { company: { name: { contains: q, mode: "insensitive" } } }] }
    : {};
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
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError("Job not found", 404);
  await prisma.job.delete({ where: { id: jobId } });
  return { message: "Job removed successfully" };
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — COMMUNITIES
// ─────────────────────────────────────────────────────────────────────────────

export const adminListCommunities = async (params: { q?: string; limit?: number; cursor?: string }) => {
  const { q, limit = 20, cursor } = params;
  const where: any = q ? { name: { contains: q, mode: "insensitive" } } : {};
  const take = limit + 1;

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

  const hasNextPage = communities.length > limit;
  const page = hasNextPage ? communities.slice(0, limit) : communities;
  return { communities: page, nextCursor: hasNextPage ? page[page.length - 1].id : null, hasNextPage };
};

export const adminUpdateCommunity = async (
  communityId: string,
  updates: { archived?: boolean; verified?: boolean }
) => {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
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
  const where: any = q
    ? { OR: [{ companyName: { contains: q, mode: "insensitive" } }, { jobRole: { contains: q, mode: "insensitive" } }] }
    : {};
  const take = limit + 1;

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

  const hasNextPage = referrals.length > limit;
  const page = hasNextPage ? referrals.slice(0, limit) : referrals;
  return { referrals: page, nextCursor: hasNextPage ? page[page.length - 1].id : null, hasNextPage };
};

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const adminCreateDepartment = async (
  actorId: string,
  data: { name: string; collegeId: string; hod?: string }
) => {
  await ensureCollegeExists(data.collegeId);

  const existing = await prisma.department.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" }, collegeId: data.collegeId },
  });
  if (existing) throw new AppError("Department with this name already exists", 409);

  return prisma.department.create({
    data: { name: data.name, collegeId: data.collegeId, hod: data.hod },
  });
};

export const adminListDepartments = async (collegeId: string) => {
  await ensureCollegeExists(collegeId);
  return prisma.department.findMany({
    where: { collegeId },
    orderBy: { name: "asc" },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY REQUEST MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const adminListCompanyRequests = async (status?: string) => {
  return prisma.companyRequest.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
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
  const request = await prisma.companyRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Company request not found", 404);
  if (request.status !== "PENDING") throw new AppError("Request is not in PENDING state", 400);

  const jobData = request.pendingJobData as any;

  // Create the company
  const slugBase = request.companyName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const slug = `${slugBase}-${Date.now()}`;

  const company = await prisma.company.create({
    data: {
      name: request.companyName,
      slug,
      verified: true,
      logoUrl: options?.logoUrl,
      websiteUrl: options?.websiteUrl,
      headquarters: options?.headquarters,
      industry: options?.industry,
    },
  });

  // Generate job slug
  const jobSlugBase = `${jobData.title}-${company.name}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const jobSlug = `${jobSlugBase}-${Date.now()}`;

  // Create the job
  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      postedById: request.requestedById,
      title: jobData.title,
      slug: jobSlug,
      description: jobData.description,
      requirements: jobData.requirements,
      responsibilities: jobData.responsibilities,
      location: jobData.location,
      workMode: jobData.workMode,
      type: jobData.type,
      experienceLevel: jobData.experienceLevel,
      salaryMin: jobData.salaryMin,
      salaryMax: jobData.salaryMax,
      currency: jobData.currency || "INR",
      skillsRequired: jobData.skillsRequired || [],
      applicationDeadline: jobData.applicationDeadline ? new Date(jobData.applicationDeadline) : null,
      applyUrl: jobData.applyUrl,
      featured: jobData.featured || false,
    },
    select: { id: true, title: true },
  });

  // Update company request status
  await prisma.companyRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      companyId: company.id,
      jobId: job.id,
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
  });

  // Notify the recruiter
  await prisma.notification.create({
    data: {
      userId: request.requestedById,
      type: "SYSTEM",
      title: "Company Approved & Job Posted!",
      message: `Your company "${request.companyName}" has been verified. Your job "${job.title}" is now live.`,
      entityType: "JOB",
      entityId: job.id,
    },
  });

  return { success: true, company, job };
};

export const adminRejectCompanyRequest = async (
  adminId: string,
  requestId: string,
  reviewNotes?: string,
) => {
  const request = await prisma.companyRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Company request not found", 404);
  if (request.status !== "PENDING") throw new AppError("Request is not in PENDING state", 400);

  await prisma.companyRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewedById: adminId,
      reviewNotes: reviewNotes || null,
      reviewedAt: new Date(),
    },
  });

  // Notify the recruiter
  await prisma.notification.create({
    data: {
      userId: request.requestedById,
      type: "SYSTEM",
      title: "Company Request Rejected",
      message: `Your request to add "${request.companyName}" was rejected.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`,
    },
  });

  return { success: true };
};

export const adminUpdateHackathon = async (hackathonId: string, data: any) => {
  const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
  if (!hackathon) throw new AppError("Hackathon not found", 404);

  return prisma.hackathon.update({
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
};


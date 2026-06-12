import prisma from "shared/database/prisma";
import {
  CommunityCategory,
  CommunityType,
  Prisma,
} from "@prisma/client";

import AppError from "shared/errors/AppError";

import slugify from "slugify";

import { addReputation } from "modules/reputation/reputation.service";

import { createActivity } from "modules/activities/activity.service";

import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";

import { calculateUserAffinity } from "modules/affinity/affinity.service";

import { createNotification } from "modules/notificatios/notifications.service";

type CommunityWriteClient = Prisma.TransactionClient | typeof prisma;

// ---------------------------------------------------------------------------
// Conversation participant helpers
// ---------------------------------------------------------------------------

/**
 * Adds a user as a ConversationParticipant in all active conversations of a
 * community. Safe to call inside a transaction (pass `client`) or standalone.
 */
const addUserToCommunityConversations = async (
  userId: string,
  communityId: string,
  client: CommunityWriteClient = prisma,
) => {
  const conversations = await client.conversation.findMany({
    where: { communityId, archived: false },
    select: { id: true },
  });

  for (const conv of conversations) {
    await client.conversationParticipant.upsert({
      where: {
        conversationId_userId: { conversationId: conv.id, userId },
      },
      update: {},
      create: { conversationId: conv.id, userId },
    });
  }
};

/**
 * Removes a user from all active community conversations when they leave.
 */
const removeUserFromCommunityConversations = async (
  userId: string,
  communityId: string,
) => {
  const conversations = await prisma.conversation.findMany({
    where: { communityId, archived: false },
    select: { id: true },
  });

  for (const conv of conversations) {
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: conv.id, userId },
    });
  }
};

const PLATFORM_ADMIN_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
]);

const getUserRoleNames = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });
  return new Set((user?.roles || []).map((r) => r.role.name));
};

const isPlatformAdmin = async (userId: string) => {
  const roleNames = await getUserRoleNames(userId);
  return [...PLATFORM_ADMIN_ROLES].some((r) => roleNames.has(r));
};

const assertCanCreateOfficialCommunity = async (
  userId: string,

  data: CreateCommunityData,
) => {
  // GENERAL communities can be created by anyone
  if (data.type === CommunityType.GENERAL) {
    return;
  }

  // Platform admins can always create official communities
  if (await isPlatformAdmin(userId)) {
    return;
  }

  if (data.type === CommunityType.COLLEGE) {
    if (!data.collegeId) {
      throw new AppError("collegeId required for college communities", 400);
    }

    // Check CollegeAdmin assignment
    const assignment = await prisma.collegeAdmin.findUnique({
      where: {
        userId_collegeId: {
          userId,
          collegeId: data.collegeId,
        },
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new AppError(
        "Only verified admins can create college communities. You must be assigned as a college admin.",
        403,
      );
    }

    return;
  }

  if (data.type === CommunityType.COMPANY) {
    if (!data.companyId) {
      throw new AppError("companyId required for company communities", 400);
    }

    // Check CompanyAdmin assignment (company-wide OR for the specific office city)
    const assignment = await prisma.companyAdmin.findFirst({
      where: {
        userId,
        companyId: data.companyId,
        OR: [
          { officeCity: null },
          ...(data.city ? [{ officeCity: data.city }] : []),
        ],
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new AppError(
        "Only verified admins can create company communities. You must be assigned as a company admin.",
        403,
      );
    }

    return;
  }

  throw new AppError("Only verified admins can create official communities", 403);
};

export interface CommunityAutoJoinContext {
  collegeId?: string | null;
  departmentId?: string | null;
  companyId?: string | null;
}

export interface CreateCommunityData {
  name: string;
  description?: string;
  type: CommunityType;
  category: CommunityCategory;
  tags?: string[];
  searchKeywords?: string[];
  companyId?: string;
  collegeId?: string;
  departmentId?: string;
  city?: string;
  autoJoinEligible?: boolean;
}

export const autoJoinUserCommunities = async (
  userId: string,

  context: CommunityAutoJoinContext,

  client: CommunityWriteClient = prisma,
) => {
  const communityFilters: Prisma.CommunityWhereInput[] = [];

  if (context.collegeId) {
    communityFilters.push({
      type: "COLLEGE",

      collegeId: context.collegeId,

      departmentId: null,
    });

    if (context.departmentId) {
      communityFilters.push({
        type: "COLLEGE",

        collegeId: context.collegeId,

        departmentId: context.departmentId,
      });
    }
  }

  if (context.companyId) {
    communityFilters.push({
      type: "COMPANY",

      companyId: context.companyId,
    });
  }

  if (communityFilters.length === 0) {
    return {
      joinedCommunityIds: [],
    };
  }

  const communities = await client.community.findMany({
    where: {
      archived: false,

      autoJoinEligible: true,

      OR: communityFilters,
    },

    select: {
      id: true,
    },
  });

  const joinedCommunityIds: string[] = [];

  for (const community of communities) {
    const existingMembership = await client.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: community.id,

          userId,
        },
      },

      select: {
        id: true,
        active: true,
      },
    });

    if (existingMembership?.active) {
      continue;
    }

    if (existingMembership) {
      await client.communityMember.update({
        where: {
          id: existingMembership.id,
        },

        data: {
          active: true,

          archived: false,

          autoJoined: true,

          leftAt: null,

          joinedAt: new Date(),
        },
      });
    } else {
      await client.communityMember.create({
        data: {
          communityId: community.id,

          userId,

          autoJoined: true,
        },
      });
    }

    await client.community.update({
      where: {
        id: community.id,
      },

      data: {
        memberCount: {
          increment: 1,
        },
      },
    });

    // Add user to all active community conversations
    await addUserToCommunityConversations(userId, community.id, client);

    joinedCommunityIds.push(community.id);
  }

  return {
    joinedCommunityIds,
  };
};

export const createCommunity = async (
  userId: string,

  data: CreateCommunityData,
) => {
  await assertCanCreateOfficialCommunity(userId, data);

  const slug = slugify(data.name, {
    lower: true,
    strict: true,
  });

  // Duplicate slug
  const existing = await prisma.community.findUnique({
    where: {
      slug,
    },
  });

  if (existing) {
    throw new AppError("Community slug already exists", 400);
  }

  // TYPE VALIDATION
  if (!Object.values(CommunityType).includes(data.type)) {
    throw new AppError("Invalid community type", 400);
  }

  // COLLEGE VALIDATION
  if (data.type === "COLLEGE") {
    if (!data.collegeId) {
      throw new AppError("collegeId required", 400);
    }

    const college = await prisma.college.findUnique({
      where: {
        id: data.collegeId,
      },
    });

    if (!college) {
      throw new AppError("College not found", 404);
    }

    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: {
          id: data.departmentId,
        },

        select: {
          collegeId: true,
        },
      });

      if (!department) {
        throw new AppError("Department not found", 404);
      }

      if (department.collegeId !== data.collegeId) {
        throw new AppError("Department does not belong to selected college", 400);
      }
    }
  }

  // COMPANY VALIDATION
  if (data.type === "COMPANY") {
    if (!data.companyId || !data.city) {
      throw new AppError("companyId and city required", 400);
    }

    const company = await prisma.company.findUnique({
      where: {
        id: data.companyId,
      },
    });

    if (!company) {
      throw new AppError("Company not found", 404);
    }
  }

  // CREATE
  const community = await prisma.community.create({
    data: {
      name: data.name,

      slug,

      description: data.description,

      type: data.type,

      visibility: data.type === "COMPANY" ? "PRIVATE" : "PUBLIC",

      autoJoinEligible:
        data.autoJoinEligible ??
        data.type !== "GENERAL",

      category: data.category,

      tags: data.tags || [],

      searchKeywords: data.searchKeywords || [],

      companyId: data.companyId,

      collegeId: data.collegeId,

      departmentId: data.departmentId,

      city: data.city,

      createdById: userId,

      members: {
        create: {
          userId,

          role: "OWNER",
        },
      },

      memberCount: 1,
    },

    include: {
      members: true,
    },
  });

  // DEFAULT CONVERSATION — creator is immediately added as a participant
  // so they can send/read messages right away.
  await prisma.conversation.create({
    data: {
      type: "COMMUNITY",

      title: `${community.name} General`,

      category: "GENERAL",

      public: community.visibility === "PUBLIC",

      communityId: community.id,

      createdById: userId,

      participants: {
        create: { userId },
      },
    },
  });

  // ACTIVITY
  createActivity(
    userId,

    "COMMUNITY_CREATED",

    "Created community",

    `Created ${community.name}`,

    {
      communityId: community.id,
    },
  ).catch(console.error);

  // REPUTATION
  addReputation(
    userId,

    "COMMUNITY_CREATED",

    3,

    "Created a community",

    {
      communityId: community.id,
    },
  ).catch(console.error);

  // ENGINEERING SCORE
  calculateEngineeringScore(userId).catch(console.error);

  return community;
};

export const getCommunityBySlug = async (slug: string, userId?: string) => {
  const community = await prisma.community.findUnique({
    where: {
      slug,
    },

    include: {
      createdBy: {
        include: {
          profile: true,
        },
      },

      members: {
        take: 20,

        include: {
          user: {
            include: {
              profile: true,

              presence: true,
            },
          },
        },
      },

      conversations: {
        orderBy: {
          updatedAt: "desc",
        },

        take: 10,
      },

      posts: {
        where: {
          deletedAt: null,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 10,

        include: {
          author: {
            include: {
              profile: true,
            },
          },

          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      },

      _count: {
        select: {
          members: true,

          posts: true,

          conversations: true,
        },
      },
    },
  });

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  let isPendingApproval = false;
  let isMember = false;
  let currentUserRole = null;

  if (userId) {
    const membership = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId,
        },
      },
    });
    if (membership) {
      isPendingApproval = !membership.active && membership.leftAt === null;
      isMember = membership.active;
      currentUserRole = membership.role;
    }
  }

  return {
    ...community,
    isPendingApproval,
    isMember,
    currentUserRole,
  };
};

export const archiveCommunity = async (userId: string, communityId: string) => {
  const roleNames = await getUserRoleNames(userId);
  const isBypassAdmin = roleNames.has("PLATFORM_ADMIN") || roleNames.has("SUPER_ADMIN");

  if (!isBypassAdmin) {
    const membership = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      throw new AppError("Unauthorized", 403);
    }
  }

  const community = await prisma.community.update({
    where: {
      id: communityId,
    },

    data: {
      archived: true,

      archivedAt: new Date(),
    },
  });

  // Archive conversations
  await prisma.conversation.updateMany({
    where: {
      communityId,
    },

    data: {
      archived: true,
    },
  });

  // ACTIVITY
  createActivity(
    userId,

    "COMMUNITY_ARCHIVED",

    "Archived community",

    `Archived ${community.name}`,

    {
      communityId,
    },
  ).catch(console.error);

  return {
    success: true,
  };
};

export const getJoinedCommunities = async (userId: string) => {
  const memberships = await prisma.communityMember.findMany({
    where: {
      userId,
      archived: false,
      OR: [
        { active: true },
        { active: false, leftAt: null }
      ],
    },
    include: {
      community: {
        include: {
          college: true,
          company: true,
          department: true,
          createdBy: {
            include: {
              profile: true,
            },
          },
          _count: {
            select: {
              members: true,
              posts: true,
              conversations: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  return memberships.map((m) => ({
    ...m.community,
    isPendingApproval: !m.active,
  }));
};

export const joinCommunity = async (userId: string, communityId: string) => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: { createdBy: { select: { id: true } } },
  });

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  if (community.archived) {
    throw new AppError("Cannot join an archived community", 400);
  }

  // PRIVATE communities are auto-join only (college/company registration)
  if (community.visibility === "PRIVATE") {
    throw new AppError(
      "This community is private and restricted to verified members. You can only be added automatically when you register your college or company.",
      403,
    );
  }

  // Check if already a member (active OR pending)
  const existingMember = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId,
        userId,
      },
    },
  });

  if (existingMember) {
    if (existingMember.active) {
      throw new AppError("Already a member of this community", 400);
    }
    if (!existingMember.active) {
      throw new AppError("Your join request is already pending approval", 400);
    }
  }

  // ─── Affiliation check for COLLEGE / COMPANY communities ──────────────────
  // Members who registered with the matching college/company join immediately.
  // Everyone else gets a pending approval state — the community admin approves.
  let isAffiliated = false;
  let pendingApproval = false;

  if (community.type === "COLLEGE" && community.collegeId) {
    const education = await prisma.education.findFirst({
      where: { userId, collegeId: community.collegeId },
      select: { id: true },
    });
    isAffiliated = Boolean(education);
  } else if (community.type === "COMPANY" && community.companyId) {
    const experience = await prisma.experience.findFirst({
      where: { userId, companyId: community.companyId },
      select: { id: true },
    });
    isAffiliated = Boolean(experience);
  } else {
    // GENERAL communities → always open
    isAffiliated = true;
  }

  if (!isAffiliated) {
    // Non-affiliated: create pending membership (active: false)
    await prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role: "MEMBER",
        active: false,
      },
    });

    // Notify community owner/creator about the join request
    if (community.createdBy?.id) {
      const requester = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: { select: { fullName: true } } },
      });
      const requesterName = requester?.profile?.fullName || requester?.username || "Someone";
      createNotification({
        userId: community.createdBy.id,
        actorId: userId,
        type: "SYSTEM",
        title: "Community Join Request",
        message: `${requesterName} requested to join "${community.name}". Review in the community settings.`,
        metadata: { communityId, pendingUserId: userId },
      }).catch(console.error);
    }

    pendingApproval = true;
  } else {
    // Affiliated: join immediately
    await prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role: "MEMBER",
        active: true,
      },
    });

    // Increment memberCount
    await prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: 1 } },
    });

    // Add user to all active community conversations
    await addUserToCommunityConversations(userId, communityId);

    // ACTIVITY
    createActivity(
      userId,
      "COMMUNITY_JOINED",
      "Joined community",
      `Joined ${community.name}`,
      { communityId },
    ).catch(console.error);
  }

  return { success: true, pendingApproval };
};

export const leaveCommunity = async (userId: string, communityId: string) => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  // Check membership
  const existingMember = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId,
        userId,
      },
    },
  });

  if (!existingMember || !existingMember.active) {
    throw new AppError("You are not a member of this community", 400);
  }

  if (existingMember.role === "OWNER") {
    throw new AppError("Owners cannot leave their community. You must archive it instead.", 400);
  }

  // Mark membership as inactive
  await prisma.communityMember.update({
    where: { id: existingMember.id },
    data: {
      active: false,
      leftAt: new Date(),
    },
  });

  // Decrement memberCount
  await prisma.community.update({
    where: { id: communityId },
    data: {
      memberCount: {
        decrement: 1,
      },
    },
  });

  // Remove user from all active community conversations
  await removeUserFromCommunityConversations(userId, communityId);

  return { success: true };
};

export const getCommunityJoinRequests = async (userId: string, slug: string) => {
  const community = await prisma.community.findUnique({
    where: { slug },
  });

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  // Check if calling user is owner or admin of the community
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId,
      },
    },
  });

  if (!membership || !membership.active || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new AppError("Unauthorized. Only community owners and admins can view join requests.", 403);
  }

  // Get pending members: active = false, leftAt = null
  const requests = await prisma.communityMember.findMany({
    where: {
      communityId: community.id,
      active: false,
      leftAt: null,
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  return requests;
};

export const reviewCommunityJoinRequest = async (
  userId: string,
  slug: string,
  pendingUserId: string,
  action: "approve" | "reject"
) => {
  const community = await prisma.community.findUnique({
    where: { slug },
  });

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  // Check if calling user is owner or admin of the community
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId,
      },
    },
  });

  if (!membership || !membership.active || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new AppError("Unauthorized. Only community owners and admins can review join requests.", 403);
  }

  // Find the request membership
  const requestMember = await prisma.communityMember.findFirst({
    where: {
      communityId: community.id,
      userId: pendingUserId,
      active: false,
    },
  });

  if (!requestMember) {
    throw new AppError("No pending join request found for this user", 404);
  }

  if (action === "approve") {
    // Approve membership
    await prisma.communityMember.update({
      where: { id: requestMember.id },
      data: {
        active: true,
        joinedAt: new Date(),
      },
    });

    // Increment memberCount
    await prisma.community.update({
      where: { id: community.id },
      data: {
        memberCount: {
          increment: 1,
        },
      },
    });

    // Add user to all active community conversations
    await addUserToCommunityConversations(pendingUserId, community.id);

    // Create activity
    createActivity(
      pendingUserId,
      "COMMUNITY_JOINED",
      "Joined community",
      `Joined ${community.name}`,
      { communityId: community.id },
    ).catch(console.error);

    // Notify user
    createNotification({
      userId: pendingUserId,
      actorId: userId,
      type: "SYSTEM",
      title: "Community Request Approved",
      message: `Your request to join "${community.name}" has been approved!`,
      metadata: { communityId: community.id },
    }).catch(console.error);

    return { success: true, status: "approved" };
  } else {
    // Reject membership: delete request row
    await prisma.communityMember.delete({
      where: { id: requestMember.id },
    });

    // Notify user
    createNotification({
      userId: pendingUserId,
      actorId: userId,
      type: "SYSTEM",
      title: "Community Request Declined",
      message: `Your request to join "${community.name}" was declined.`,
      metadata: { communityId: community.id },
    }).catch(console.error);

    return { success: true, status: "rejected" };
  }
};


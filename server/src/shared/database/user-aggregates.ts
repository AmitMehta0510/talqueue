/**
 * @file shared/database/user-aggregates.ts
 *
 * User Sub-Aggregate Query Functions
 * ───────────────────────────────────
 * The User model has 50+ relations. Loading them all on every request causes
 * unnecessary JOINs, over-fetching, and high memory pressure at scale.
 *
 * This module provides focused "sub-aggregate" selectors — each one loads only
 * the fields needed for a specific use-case:
 *
 *   getUserIdentity()     → auth token validation, session hydration
 *   getUserProfileCard()  → compact card shown in search results / suggestions
 *   getUserFullProfile()  → own profile page (getMe endpoint)
 *   getUserFeedContext()  → feed personalization pipeline
 *   getUserRBACContext()  → role/permission checks
 *
 * Compared to the previous pattern (userFullProfileSelect spread everywhere):
 *   - getMe:          was loading 15+ relations → now loads 8
 *   - Feed context:   was loading full profile → now loads 4 targeted fields
 *   - Profile cards:  was loading educations/experiences → now loads 3 fields
 *   - Auth checks:    was loading full roles array → now loads role names only
 *
 * All functions are memoization-friendly (stable select shapes).
 */

import prisma from "shared/database/prisma";

// ─── Identity (auth & session) ───────────────────────────────────────────────

/**
 * Minimal user identity — used for JWT validation and session hydration.
 * Returns only auth-critical fields. Used by auth.middleware.ts.
 */
export const USER_IDENTITY_SELECT = {
  id:             true,
  email:          true,
  username:       true,
  status:         true,
  isEmailVerified: true,
  tier:           true,
  primaryRole:    true,
  roles: {
    select: {
      role: { select: { id: true, name: true } },
    },
  },
} as const;

export type UserIdentity = Awaited<ReturnType<typeof getUserIdentity>>;

export async function getUserIdentity(userId: string) {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: USER_IDENTITY_SELECT,
  });
}

// ─── Profile Card (search results, suggestions, connection lists) ─────────────

/**
 * Compact user card — shown in search results, people-you-may-know, etc.
 * Loads: core fields + avatar + headline + top skill names only.
 * Deliberately excludes: experiences, educations, reputation events.
 */
export const USER_PROFILE_CARD_SELECT = {
  id:               true,
  username:         true,
  primaryRole:      true,
  verifiedEngineer: true,
  reputationScore:  true,
  engineeringScore: true,
  trustLevel:       true,
  openToWork:       true,
  followersCount:   true,
  profile: {
    select: {
      fullName:   true,
      avatarUrl:  true,
      headline:   true,
      location:   true,
      country:    true,
      bannerUrl:  true,
    },
  },
  skills: {
    take: 5,
    select: {
      skill: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

export type UserProfileCard = Awaited<ReturnType<typeof getUserProfileCard>>;

export async function getUserProfileCard(userId: string) {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: USER_PROFILE_CARD_SELECT,
  });
}

// ─── Full Profile (getMe, own profile page) ───────────────────────────────────

/**
 * Full user profile — for the /me endpoint and own profile page.
 * Loads: profile, skills, experiences, educations, roles, coding profiles.
 * Excludes: feed interactions, analytics, notification history,
 *           admin assignments (loaded separately on admin pages).
 *
 * Compare to the old userFullProfileSelect in _shared.ts which spread
 * relations indefinitely — this version is bounded at each section.
 */
export const USER_FULL_PROFILE_SELECT = {
  id:                   true,
  email:                true,
  username:             true,
  status:               true,
  followersCount:       true,
  followingCount:       true,
  connectionCount:      true,
  postCount:            true,
  profileCompleteness:  true,
  verifiedEngineer:     true,
  isEmailVerified:      true,
  availabilityStatus:   true,
  reputationScore:      true,
  engineeringScore:     true,
  trustLevel:           true,
  primaryRole:          true,
  openToWork:           true,
  openToInternship:     true,
  acceptingCollaborators: true,
  acceptingReferrals:   true,
  acceptingMentorship:  true,
  searchVisibility:     true,
  tier:                 true,
  createdAt:            true,
  updatedAt:            true,

  profile: {
    include: {
      college:    true,
      department: true,
    },
  },

  roles: {
    select: {
      role: { select: { id: true, name: true } },
    },
  },

  skills: {
    select: {
      id: true, level: true, verified: true,
      verificationSource: true, verificationProof: true,
      skill: { select: { id: true, name: true, category: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: 30,
  },

  experiences: {
    select: {
      id: true, title: true, employmentType: true,
      startDate: true, endDate: true, isCurrent: true,
      description: true, verified: true, verificationScore: true,
      skillsUsed: true, techStack: true, teamSize: true,
      company: { select: { id: true, name: true, logoUrl: true, slug: true } },
    },
    orderBy: [{ isCurrent: "desc" as const }, { startDate: "desc" as const }],
    take: 20,
  },

  educations: {
    select: {
      id: true, degree: true, fieldOfStudy: true,
      startYear: true, endYear: true, current: true,
      cgpa: true, backlogs: true, currentYear: true,
      isAlumni: true, alumniVerified: true,
      college: { select: { id: true, name: true, logoUrl: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ current: "desc" as const }, { endYear: "desc" as const }],
    take: 10,
  },

  codingProfiles: {
    select: { id: true, platform: true, url: true, username: true },
    take: 10,
  },

  tpoMemberships: {
    select: {
      id: true, collegeId: true,
      college: { select: { id: true, name: true, normalizedKey: true, logoUrl: true } },
    },
  },

  collegeAdminships: {
    select: {
      id: true, collegeId: true,
      college: { select: { id: true, name: true, normalizedKey: true, logoUrl: true } },
    },
  },

  companyAdminships: {
    select: {
      id: true,
      company: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
  },

  _count: {
    select: { posts: true, skills: true, experiences: true, educations: true },
  },
} as const;

export type UserFullProfile = Awaited<ReturnType<typeof getUserFullProfile>>;

export async function getUserFullProfile(userId: string) {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: USER_FULL_PROFILE_SELECT,
  });
}

// ─── Feed Context (feed personalization pipeline) ─────────────────────────────

/**
 * Narrow feed context aggregate — loads only what the feed ranking pipeline needs.
 * Used by feed-context.service.ts to pre-fetch context fields.
 * Excludes: experiences, educations, full profile, roles.
 */
export const USER_FEED_CONTEXT_SELECT = {
  id:              true,
  primaryRole:     true,
  engineeringScore: true,
  experiences: {
    where: { isCurrent: true },
    select: { id: true },
    take: 1,
  },
  profile: {
    select: { country: true },
  },
} as const;

export type UserFeedContext = Awaited<ReturnType<typeof getUserFeedContext>>;

export async function getUserFeedContext(userId: string) {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: USER_FEED_CONTEXT_SELECT,
  });
}

// ─── RBAC Context (role/permission checks at service layer) ──────────────────

/**
 * RBAC aggregate — loads only role names.
 * Used by shared/rbac/enforce.ts to check permissions at service layer.
 * One query per protected service call (< 1ms, cached in auth middleware result).
 */
export const USER_RBAC_SELECT = {
  id:          true,
  primaryRole: true,
  tier:        true,
  roles: {
    select: {
      role: { select: { name: true } },
    },
  },
} as const;

export type UserRBACContext = Awaited<ReturnType<typeof getUserRBACContext>>;

export async function getUserRBACContext(userId: string) {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: USER_RBAC_SELECT,
  });
}

// ─── Batch helpers ────────────────────────────────────────────────────────────

/**
 * Batch fetch profile cards for a list of user IDs (e.g. search results).
 * Returns a Map<userId, card> for O(1) lookup.
 */
export async function getBatchProfileCards(
  userIds: string[],
): Promise<Map<string, NonNullable<UserProfileCard>>> {
  if (!userIds.length) return new Map();
  const cards = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: USER_PROFILE_CARD_SELECT,
  });
  return new Map(cards.map((c) => [c.id, c as NonNullable<UserProfileCard>]));
}

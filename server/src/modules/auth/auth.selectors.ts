import { Prisma } from "@prisma/client";

export const authUserSelect = {
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
  isEmailVerified: true,
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
  tier: true,
  createdAt: true,
  updatedAt: true,

  profile: {
    select: {
      id: true,
      userId: true,
      fullName: true,
      bio: true,
      avatarUrl: true,
      headline: true,
      location: true,
      resumeUrl: true,
      bannerUrl: true,
      availabilityText: true,
      githubUrl: true,
      linkedinUrl: true,
      portfolioUrl: true,
      collegeId: true,
      departmentId: true,
      graduationYear: true,
      createdAt: true,
      updatedAt: true,
    },
  },

  roles: {
    select: {
      id: true,
      roleId: true,
      createdAt: true,
      role: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      },
    },
  },

  companyAdminships: {
    select: {
      id: true,
      companyId: true,
      officeCity: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
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
        },
      },
    },
  },

  cdcrMemberships: {
    select: {
      id: true,
      collegeId: true,
      college: {
        select: {
          id: true,
          name: true,
          normalizedKey: true,
        },
      },
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
        },
      },
    },
  },

  experiences: {
    select: {
      id: true,
      companyId: true,
      title: true,
      employmentType: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      description: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type AuthenticatedUser = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

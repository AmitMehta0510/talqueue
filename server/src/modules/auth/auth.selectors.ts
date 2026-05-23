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
} satisfies Prisma.UserSelect;

export type AuthenticatedUser = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

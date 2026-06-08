import { CompanySize, CompanyType, Prisma } from "@prisma/client";
import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { trackInteraction } from "modules/interaction/interaction-tracking.service";
import { trackRecommendationImpression } from "modules/discovery/recommendation-memory.service";

import slugify from "slugify";

//
// HELPERS
//
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Return a base slug (no DB checks). Creation will attempt insert and handle collisions.
const generateCompanySlug = (name: string) => {
  return (
    slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    }) || `company-${Date.now()}`
  );
};

const PLATFORM_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);

const assertIsPlatformAdmin = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: {
        select: { role: { select: { name: true } } },
      },
    },
  });
  const roleNames = new Set((user?.roles || []).map((r) => r.role.name));
  const isAdmin = [...PLATFORM_ADMIN_ROLES].some((r) => roleNames.has(r));
  if (!isAdmin) {
    throw new AppError("Only platform admins can create companies", 403);
  }
};

//
// CREATE COMPANY
//
export const createCompany = async (userId: string, data: any) => {
  await assertIsPlatformAdmin(userId);
  const existingCompany = await prisma.company.findFirst({
    where: {
      name: {
        equals: data.name,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (existingCompany) {
    throw new AppError("Company already exists", 400);
  }

  const maxSlugAttempts = 5;
  const baseSlug = generateCompanySlug(data.name);
  let attempt = 0;

  while (attempt < maxSlugAttempts) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;

    try {
      return await prisma.company.create({
        data: {
          name: data.name,
          slug,
          logoUrl: data.logoUrl,
          coverImageUrl: data.coverImageUrl,
          websiteUrl: data.websiteUrl,
          linkedinUrl: data.linkedinUrl,
          twitterUrl: data.twitterUrl,
          githubUrl: data.githubUrl,
          description: data.description,
          tagline: data.tagline,
          headquarters: data.headquarters,
          country: data.country,
          industry: data.industry,
          foundedYear: data.foundedYear,
          type: data.type,
          size: data.size,
          careersPageUrl: data.careersPageUrl,
          hiringEnabled: data.hiringEnabled,
          referralEnabled: data.referralEnabled,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          industry: true,
          headquarters: true,
          verified: true,
          createdAt: true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        (error.meta.target as string[]).includes("slug")
      ) {
        attempt++;
        await sleep(50 * attempt);
        continue;
      }

      throw error;
    }
  }

  throw new AppError(
    "Could not generate a unique company slug. Please try again with a different name.",
    500,
  );
};

//
// GET COMPANIES
//
export const getCompanies = async (
  page = 1,
  limit = 20,
  filters: {
    q?: string;
    industry?: string;
    verified?: boolean;
    hiringEnabled?: boolean;
    location?: string;
    type?: CompanyType;
    size?: CompanySize;
  } = {},
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.CompanyWhereInput = {};

  if (filters.q) {
    where.OR = [
      {
        name: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
      {
        tagline: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
      {
        industry: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
      {
        headquarters: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
    ];
  }

  if (filters.industry) {
    where.industry = {
      equals: filters.industry,
      mode: "insensitive",
    };
  }

  if (filters.verified !== undefined) {
    where.verified = filters.verified;
  }

  if (filters.hiringEnabled !== undefined) {
    where.hiringEnabled = filters.hiringEnabled;
  }

  if (filters.location) {
    where.headquarters = {
      contains: filters.location,
      mode: "insensitive",
    };
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.size) {
    where.size = filters.size;
  }

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      skip,

      take: limit,

      orderBy: [
        {
          verified: "desc",
        },

        {
          createdAt: "desc",
        },
      ],

      select: {
        id: true,

        name: true,

        slug: true,

        logoUrl: true,

        tagline: true,

        industry: true,

        headquarters: true,

        verified: true,

        hiringEnabled: true,

        referralEnabled: true,

        rating: true,

        totalRatings: true,

        _count: {
          select: {
            jobs: true,

            experiences: true,
          },
        },
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    companies,
  };
};

//
// GET COMPANY BY SLUG
//
export const getCompanyBySlug = async (
  userId: string | undefined,

  slug: string,
) => {
  const company = await prisma.company.findUnique({
    where: {
      slug,
    },

    select: {
      id: true,

      name: true,

      slug: true,

      logoUrl: true,

      coverImageUrl: true,

      websiteUrl: true,

      linkedinUrl: true,

      twitterUrl: true,

      githubUrl: true,

      description: true,

      tagline: true,

      headquarters: true,

      industry: true,

      foundedYear: true,

      type: true,

      size: true,

      verified: true,

      careersPageUrl: true,

      hiringEnabled: true,

      referralEnabled: true,

      rating: true,

      totalRatings: true,

      createdAt: true,

      jobs: {
        where: {
          status: "OPEN",
        },

        take: 10,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,

          title: true,

          slug: true,

          location: true,

          type: true,

          workMode: true,

          experienceLevel: true,

          createdAt: true,
        },
      },

      experiences: {
        where: {
          isCurrent: true,
        },
        // Narrow experiences for a lightweight preview (UI needs small summary)
        take: 6,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,

          title: true,

          verified: true,

          user: {
            select: {
              id: true,

              username: true,

              profile: {
                select: {
                  fullName: true,

                  avatarUrl: true,

                  headline: true,
                },
              },
            },
          },
        },
      },

      _count: {
        select: {
          jobs: true,

          experiences: true,

          referralRequests: true,
        },
      },
    },
  });

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  if (userId) {
    trackInteraction(userId, {
      targetId: company.id,
      targetType: "COMPANY",
      interactionType: "VIEW",
    }).catch(console.error);

    trackRecommendationImpression(userId, {
      entityId: company.id,
      entityType: "COMPANY",
      clicked: false,
    }).catch(console.error);
  }

  return company;
};

//
// GET COMPANY EMPLOYEES
//
export const getCompanyEmployees = async (
  companyId: string,

  page = 1,

  limit = 20,
) => {
  const skip = (page - 1) * limit;

  const [total, employees] = await Promise.all([
    prisma.experience.count({
      where: {
        companyId,
        isCurrent: true,
      },
    }),
    prisma.experience.findMany({
      where: {
        companyId,

        isCurrent: true,
      },

      skip,

      take: limit,

      orderBy: [
        {
          verified: "desc",
        },

        {
          verificationScore: "desc",
        },

        {
          createdAt: "desc",
        },
      ],

      select: {
        id: true,

        title: true,

        verified: true,

        verificationScore: true,

        workEmailVerified: true,

        teamSize: true,

        user: {
          select: {
            id: true,

            username: true,

            engineeringScore: true,

            reputationScore: true,

            profile: {
              select: {
                fullName: true,

                avatarUrl: true,

                headline: true,
              },
            },

            skills: {
              orderBy: [{ level: "desc" }, { createdAt: "desc" }],

              take: 10,

              select: {
                skill: {
                  select: {
                    id: true,

                    name: true,

                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    employees,
  };
};

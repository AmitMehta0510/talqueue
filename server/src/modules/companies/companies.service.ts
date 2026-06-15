import { CompanySize, CompanyType, Prisma } from "@prisma/client";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { createNotification } from "modules/notificatios/notifications.service";

import { trackInteraction } from "modules/interaction/interaction-tracking.service";
import { trackRecommendationImpression } from "modules/discovery/recommendation-memory.service";

import slugify from "slugify";
import { runCompanySeed } from "./scraper/company-scraper.service";

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
  if (!roleNames.has("PLATFORM_ADMIN")) {
    throw new AppError("Only the platform administrator (PLATFORM_ADMIN) can create companies", 403);
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
    hasJobs?: boolean;
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

  if (filters.hasJobs !== undefined) {
    if (filters.hasJobs) {
      where.jobs = {
        some: {
          status: "OPEN",
        },
      };
    } else {
      where.jobs = {
        none: {
          status: "OPEN",
        },
      };
    }
  }

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      skip,

      take: limit,

      orderBy: [
        ...(filters.hasJobs ? [
          {
            jobs: {
              _count: "desc" as const,
            },
          },
        ] : []),
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

          followers: true,
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

  let isFollowing = false;
  if (userId && company) {
    const followCount = await prisma.company.count({
      where: {
        id: company.id,
        followers: {
          some: { id: userId }
        }
      }
    });
    isFollowing = followCount > 0;
  }

  return {
    ...company,
    isFollowing
  };
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

//
// SEED COMPANIES
//
export const seedCompanies = async (userId: string) => {
  await assertIsPlatformAdmin(userId);
  return await runCompanySeed();
};

//
// GET COMPANY REFERRERS
//
export const getCompanyReferrers = async (companyId: string) => {
  const companyExists = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!companyExists) {
    throw new AppError("Company not found", 404);
  }

  const referrers = await prisma.experience.findMany({
    where: {
      companyId,
      isCurrent: true,
      user: {
        acceptingReferrals: true,
      },
    },
    orderBy: [
      {
        user: {
          engineeringScore: "desc",
        },
      },
      {
        verified: "desc",
      },
    ],
    select: {
      id: true,
      title: true,
      verified: true,
      workEmailVerified: true,
      user: {
        select: {
          id: true,
          username: true,
          engineeringScore: true,
          reputationScore: true,
          acceptingReferrals: true,
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
  });

  return referrers;
};

//
// REQUEST COMPANY REGISTRATION
//
export const requestCompanyRegistration = async (userId: string, data: any) => {
  const request = await prisma.companyRequest.create({
    data: {
      requestedById: userId,
      companyName: data.name,
      pendingJobData: {
        companyDetails: {
          tagline: data.tagline || null,
          description: data.description || null,
          headquarters: data.headquarters || null,
          industry: data.industry || null,
          foundedYear: data.foundedYear ? Number(data.foundedYear) : null,
          type: data.type || null,
          size: data.size || null,
          websiteUrl: data.websiteUrl || null,
          careersPageUrl: data.careersPageUrl || null,
          logoUrl: data.logoUrl || null,
          githubUrl: data.githubUrl || null,
        }
      }
    },
    select: {
      id: true,
      companyName: true,
      status: true,
      createdAt: true,
    }
  });

  return {
    pending: true,
    requestId: request.id,
    message: `Registration request for "${data.name}" has been submitted for admin approval.`
  };
};

//
// FOLLOW COMPANY
//
export const followCompany = async (userId: string, companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true }
  });
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      followers: {
        connect: { id: userId }
      }
    }
  });

  return { success: true, message: "Successfully followed company" };
};

//
// UNFOLLOW COMPANY
//
export const unfollowCompany = async (userId: string, companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true }
  });
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      followers: {
        disconnect: { id: userId }
      }
    }
  });

  return { success: true, message: "Successfully unfollowed company" };
};

export const getCompanyAdminStats = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, slug: true, logoUrl: true }
  });
  if (!company) throw new AppError("Company not found", 404);

  const jobsCount = await prisma.job.count({
    where: { companyId, deletedAt: null }
  });

  const applicantsCount = await prisma.jobApplication.count({
    where: { job: { companyId } }
  });

  const officeManagersCount = await prisma.companyAdmin.count({
    where: { companyId, officeCity: { not: null } }
  });

  const recruitersCount = await prisma.experience.count({
    where: {
      companyId,
      isCurrent: true,
      user: {
        roles: {
          some: {
            role: {
              name: "RECRUITER"
            }
          }
        }
      }
    }
  });

  const pipelineBreakdown = await prisma.jobApplication.groupBy({
    by: ["status"],
    where: { job: { companyId } },
    _count: true
  });

  const pipeline = pipelineBreakdown.map((g) => ({
    status: g.status,
    count: g._count
  }));

  const recentApplicants = await prisma.jobApplication.findMany({
    where: { job: { companyId } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      job: { select: { title: true } },
      applicant: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } }
        }
      }
    }
  });

  const recentJobs = await prisma.job.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: { select: { applications: true } }
    }
  });

  return {
    company,
    jobsCount,
    applicantsCount,
    officeManagersCount,
    recruitersCount,
    pipeline,
    recentApplicants,
    recentJobs
  };
};

export const listCompanyRecruiters = async (companyId: string) => {
  return prisma.experience.findMany({
    where: {
      companyId,
      isCurrent: true,
      user: {
        roles: {
          some: {
            role: {
              name: "RECRUITER"
            }
          }
        }
      }
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
              avatarUrl: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};

export const assignCompanyRecruiter = async (actorId: string, companyId: string, userId: string, title?: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError("Company not found", 404);

  let role = await prisma.role.findUnique({ where: { name: "RECRUITER" } });
  if (!role) {
    role = await prisma.role.create({ data: { name: "RECRUITER" } });
  }
  const existingRole = await prisma.userRole.findFirst({
    where: { userId, roleId: role.id }
  });
  if (!existingRole) {
    await prisma.userRole.create({ data: { userId, roleId: role.id } });
  }

  const existingExp = await prisma.experience.findFirst({
    where: { userId, companyId, isCurrent: true }
  });
  if (!existingExp) {
    await prisma.experience.create({
      data: {
        userId,
        companyId,
        title: title || "Recruiter",
        employmentType: "FULL_TIME",
        startDate: new Date(),
        isCurrent: true,
        description: `Recruitment team member at ${company.name}`
      }
    });
  }

  await createNotification({
    userId,
    actorId,
    type: "SYSTEM",
    title: "Recruiter Role Assigned",
    message: `You have been assigned as a recruiter for ${company.name}.`,
    entityType: "COMPANY",
    entityId: companyId
  });

  return { message: "Recruiter assigned successfully" };
};

export const removeCompanyRecruiter = async (companyId: string, userId: string) => {
  await prisma.experience.updateMany({
    where: { userId, companyId, isCurrent: true },
    data: { isCurrent: false, endDate: new Date() }
  });

  const otherRecruiterJobs = await prisma.experience.count({
    where: {
      userId,
      isCurrent: true,
      companyId: { not: companyId }
    }
  });

  if (otherRecruiterJobs === 0) {
    const role = await prisma.role.findUnique({ where: { name: "RECRUITER" } });
    if (role) {
      await prisma.userRole.deleteMany({
        where: { userId, roleId: role.id }
      });
    }
  }

  return { message: "Recruiter removed successfully" };
};



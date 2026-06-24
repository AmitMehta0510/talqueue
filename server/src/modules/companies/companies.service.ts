import { CompanySize, CompanyType, Prisma, VerificationStatus, BusinessRequestType } from "@prisma/client";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { createNotification } from "modules/notificatios/notifications.service";

import { trackInteraction } from "modules/interaction/interaction-tracking.service";
import { trackRecommendationImpression } from "modules/discovery/recommendation-memory.service";

import slugify from "slugify";
import { runCompanySeed } from "./scraper/company-scraper.service";

// HELPERS
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
      primaryRole: true,
      roles: {
        select: { role: { select: { name: true } } },
      },
    },
  });
  const roleNames = new Set((user?.roles || []).map((r) => r.role.name));
  if (user?.primaryRole) {
    roleNames.add(user.primaryRole);
  }
  const isPlatformAdmin = [...PLATFORM_ADMIN_ROLES].some((role) => roleNames.has(role));
  if (!isPlatformAdmin) {
    throw new AppError("Only the platform administrator (PLATFORM_ADMIN) can create companies", 403);
  }
};

// CREATE COMPANY
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

// GET COMPANIES
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
  userId?: string,
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
      // NOTE: description intentionally excluded — TEXT column ILIKE is a full sequential
      // scan. Route description search through full-text search (tsvector) or Elasticsearch.
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

        type: true,

        _count: {
          select: {
            jobs: true,

            experiences: true,
          },
        },

        // Include followers subquery only when userId is provided
        ...(userId ? {
          followers: {
            where: { id: userId },
            select: { id: true },
          },
        } : {}),
      },
    }),
  ]);

  // Map isFollowing per company and strip raw followers array from response
  const companiesWithFollowStatus = companies.map((company) => {
    const { followers, ...rest } = company as typeof company & { followers?: { id: string }[] };
    return {
      ...rest,
      isFollowing: userId ? (followers?.length ?? 0) > 0 : undefined,
    };
  });

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    companies: companiesWithFollowStatus,
  };
};

// GET COMPANY BY SLUG
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

      offices: true,
      departments: true,

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

          applyUrl: true,
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

  // Compute isFollowing inline — avoids a second HTTP round-trip from the client.
  // The followers subquery already filters to just { id: userId } so it's a single index lookup.
  const isFollowing = userId
    ? await prisma.company
        .findFirst({
          where: { id: company.id, followers: { some: { id: userId } } },
          select: { id: true },
        })
        .then((r) => r !== null)
    : false;

  return { ...company, isFollowing };
};

// GET COMPANY EMPLOYEES
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

// SEED COMPANIES
export const seedCompanies = async (userId: string) => {
  await assertIsPlatformAdmin(userId);
  return await runCompanySeed();
};

// GET COMPANY REFERRERS
export const getCompanyReferrers = async (companyId: string) => {
  const referrers = await prisma.experience.findMany({
    where: {
      companyId,
      isCurrent: true,
      user: {
        acceptingReferrals: true,
      },
    },
    take: 50,
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

// REQUEST COMPANY REGISTRATION
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

// FOLLOW COMPANY
export const followCompany = async (userId: string, companyId: string) => {
  try {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        followers: {
          connect: { id: userId }
        }
      }
    });

    return { success: true, message: "Successfully followed company" };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new AppError("Company not found", 404);
    }
    throw error;
  }
};

// UNFOLLOW COMPANY
export const unfollowCompany = async (userId: string, companyId: string) => {
  try {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        followers: {
          disconnect: { id: userId }
        }
      }
    });

    return { success: true, message: "Successfully unfollowed company" };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new AppError("Company not found", 404);
    }
    throw error;
  }
};

// GET COMPANY FOLLOW STATUS (dedicated lightweight endpoint \u2014 avoids sequential double query in getCompanyBySlug)
export const getCompanyFollowStatus = async (userId: string, companyId: string) => {
  const result = await prisma.company.findFirst({
    where: {
      id: companyId,
      followers: { some: { id: userId } },
    },
    select: { id: true },
  });
  return { isFollowing: result !== null };
};

export const getCompanyAdminStats = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, slug: true, logoUrl: true }
  });
  if (!company) throw new AppError("Company not found", 404);

  // Fetch all jobIds for this company once — avoids repeated multi-join through job table
  const companyJobIds = await prisma.job
    .findMany({ where: { companyId, deletedAt: null }, select: { id: true } })
    .then((jobs) => jobs.map((j) => j.id));

  const [
    jobsCount,
    officeManagersCount,
    recruitersCount,
    pipelineBreakdown,
    recentApplicants,
    recentJobs
  ] = await Promise.all([
    prisma.job.count({
      where: { companyId, deletedAt: null }
    }),
    prisma.companyAdmin.count({
      where: { companyId, officeCity: { not: null } }
    }),
    prisma.experience.count({
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
    }),
    // Single groupBy replaces both applicantsCount + old pipelineBreakdown.
    // Uses direct jobId FK (no join through job table) for maximum performance.
    companyJobIds.length > 0
      ? prisma.jobApplication.groupBy({
          by: ["status"],
          where: { jobId: { in: companyJobIds } },
          _count: true
        })
      : Promise.resolve([]),
    // Fixed: explicit select instead of include — pulls only required fields
    prisma.jobApplication.findMany({
      where: companyJobIds.length > 0
        ? { jobId: { in: companyJobIds } }
        : { id: "__none__" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        status: true,
        job: { select: { title: true } },
        applicant: {
          select: {
            id: true,
            username: true,
            profile: { select: { fullName: true, avatarUrl: true } }
          }
        }
      }
    }),
    prisma.job.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        _count: { select: { applications: true } }
      }
    })
  ]);

  const applicantsCount = pipelineBreakdown.reduce((sum, g) => sum + g._count, 0);
  const pipeline = pipelineBreakdown.map((g) => ({
    status: g.status,
    count: g._count
  }));

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
    take: 50,
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

  await prisma.$transaction(async (tx) => {
    let role = await tx.role.findUnique({ where: { name: "RECRUITER" } });
    if (!role) {
      role = await tx.role.create({ data: { name: "RECRUITER" } });
    }
    const existingRole = await tx.userRole.findFirst({
      where: { userId, roleId: role.id }
    });
    if (!existingRole) {
      await tx.userRole.create({ data: { userId, roleId: role.id } });
    }

    const existingExp = await tx.experience.findFirst({
      where: { userId, companyId, isCurrent: true }
    });
    if (!existingExp) {
      await tx.experience.create({
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
  });

  setImmediate(() => {
    createNotification({
      userId,
      actorId,
      type: "SYSTEM",
      title: "Recruiter Role Assigned",
      message: `You have been assigned as a recruiter for ${company.name}.`,
      entityType: "COMPANY",
      entityId: companyId
    }).catch((err) => {
      console.error("Failed to create recruiter assignment notification:", err);
    });
  });

  return { message: "Recruiter assigned successfully" };
};

export const removeCompanyRecruiter = async (companyId: string, userId: string) => {
  await prisma.$transaction(async (tx) => {
    // Step 1: End the experience record at this company atomically
    await tx.experience.updateMany({
      where: { userId, companyId, isCurrent: true },
      data: { isCurrent: false, endDate: new Date() }
    });

    // Step 2: Check if user still has active recruiter experience elsewhere
    const otherActiveExperiences = await tx.experience.count({
      where: {
        userId,
        isCurrent: true,
        companyId: { not: companyId },
      },
    });

    // Step 3: If no other active positions, revoke RECRUITER role in the same transaction
    if (otherActiveExperiences === 0) {
      const role = await tx.role.findUnique({ where: { name: "RECRUITER" } });
      if (role) {
        await tx.userRole.deleteMany({ where: { userId, roleId: role.id } });
      }
    }
  });

  return { message: "Recruiter removed successfully" };
};

// ---------------------------------------------------------------------------
// DISCOVERED COMPANY MODERATION (Admin)
// ---------------------------------------------------------------------------

/**
 * Lists companies that were auto-created by the aggregate discovery pipeline
 * (verified=false AND discoveredVia IS NOT NULL), paginated for the admin UI.
 */
export const listDiscoveredCompanies = async (page = 1, limit = 30) => {
  const skip = (page - 1) * limit;

  const where = {
    verified: false,
    discoveredVia: { not: null as string | null },
  };

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        websiteUrl: true,
        industry: true,
        discoveredVia: true,
        createdAt: true,
        _count: {
          select: { jobs: true },
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

/**
 * Bulk verify or reject auto-discovered companies.
 *
 * VERIFY — marks company as verified=true so it appears on the platform.
 * REJECT  — soft-deletes all external jobs for the company, then hard-deletes
 *            the company record (it was auto-created with no user data).
 */
export const bulkReviewDiscoveredCompanies = async (
  adminUserId: string,
  companyIds: string[],
  action: "VERIFY" | "REJECT"
): Promise<{ processed: number; action: string }> => {
  await assertIsPlatformAdmin(adminUserId);

  if (!companyIds || companyIds.length === 0) {
    throw new AppError("No company IDs provided", 400);
  }

  // Only allow operating on discovered (unverified) companies
  const targets = await prisma.company.findMany({
    where: {
      id: { in: companyIds },
      verified: false,
      discoveredVia: { not: null },
    },
    select: { id: true, name: true },
  });

  if (targets.length === 0) {
    throw new AppError("No eligible discovered companies found for the given IDs", 404);
  }

  const targetIds = targets.map((c) => c.id);

  if (action === "VERIFY") {
    await prisma.company.updateMany({
      where: { id: { in: targetIds } },
      data: { verified: true },
    });
    console.log(
      `[Admin] ${adminUserId} verified ${targetIds.length} discovered companies: ${targets.map((c) => c.name).join(", ")}`
    );
  } else {
    // REJECT: delete external jobs first, then delete company
    await prisma.job.deleteMany({
      where: {
        companyId: { in: targetIds },
        externalJobId: { not: null },
      },
    });
    await prisma.company.deleteMany({
      where: { id: { in: targetIds } },
    });
    console.log(
      `[Admin] ${adminUserId} rejected and deleted ${targetIds.length} discovered companies: ${targets.map((c) => c.name).join(", ")}`
    );
  }

  return { processed: targetIds.length, action };
};

// SUBMIT COMPANY CLAIM
export const submitCompanyClaim = async (
  userId: string,
  data: {
    companyId: string;
    gstin: string;
    cin: string;
    businessEmail: string;
    corporateDoc: string;
  }
) => {
  return await prisma.$transaction(async (tx) => {
    // Atomic guard: only update if the company exists AND is not already claimed/verified.
    // This prevents concurrent double-claim — only one writer will see count === 1.
    const updateResult = await tx.company.updateMany({
      where: {
        id: data.companyId,
        verificationStatus: { notIn: ["PENDING", "VERIFIED"] },
      },
      data: {
        verificationStatus: "PENDING",
        gstin: data.gstin,
        cin: data.cin,
        verificationDoc: data.corporateDoc,
        claimedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      // Either company doesn’t exist or is already in a non-updatable state
      const existing = await tx.company.findUnique({
        where: { id: data.companyId },
        select: { id: true, verificationStatus: true },
      });
      if (!existing) throw new AppError("Company not found", 404);
      throw new AppError(
        `Company claim already ${existing.verificationStatus === "PENDING" ? "in review" : "verified"}`,
        409,
      );
    }

    const company = await tx.company.findUnique({ where: { id: data.companyId } });

    const request = await tx.companyRequest.create({
      data: {
        requestedById: userId,
        companyName: company!.name,
        companyId: company!.id,
        status: "PENDING",
        requestType: "COMPANY_CLAIM",
        businessEmail: data.businessEmail,
        corporateDoc: data.corporateDoc,
        pendingJobData: {},
      },
    });

    return { company, request };
  });
};

// SUBMIT RECRUITER ONBOARDING
export const submitRecruiterOnboarding = async (
  userId: string,
  data: {
    companyId?: string | null;
    companyName: string;
    businessEmail: string;
  }
) => {
  let company = data.companyId
    ? await prisma.company.findUnique({ where: { id: data.companyId } })
    : null;

  if (!company) {
    company = await prisma.company.findFirst({
      where: {
        name: {
          equals: data.companyName,
          mode: "insensitive",
        },
      },
    });
  }

  if (company) {
    // Flow 1: Existing Company
    const domain = data.businessEmail.split("@")[1]?.toLowerCase();
    const hasMatchedDomain =
      domain &&
      company.emailDomains.map((d) => d.toLowerCase()).includes(domain);

    if (hasMatchedDomain) {
      console.log(
        `[Direct Registration Hook] Recruiter onboarding email domain match for user: ${userId}, company: ${company.name}`
      );
      
      // Initialize a pending record in CompanyRequest (per instructions)
      const request = await prisma.companyRequest.create({
        data: {
          requestedById: userId,
          companyName: company.name,
          companyId: company.id,
          status: "PENDING",
          requestType: "RECRUITER_ONBOARDING",
          businessEmail: data.businessEmail,
          pendingJobData: {},
        },
      });

      return {
        requiresOtpVerification: true,
        status: "OTP_PENDING",
        requestId: request.id,
        message: "Email domain matches existing domains. Verification OTP required.",
      };
    } else {
      // Unmatched or domain missing
      const request = await prisma.companyRequest.create({
        data: {
          requestedById: userId,
          companyName: company.name,
          companyId: company.id,
          status: "PENDING",
          requestType: "RECRUITER_ONBOARDING",
          businessEmail: data.businessEmail,
          pendingJobData: {},
        },
      });

      return {
        requiresOtpVerification: false,
        status: "PENDING",
        requestId: request.id,
        message: "Recruiter onboarding request submitted for admin review.",
      };
    }
  } else {
    // Flow 2: New Shadow Company — optimistic create with P2002 retry
    const baseSlug = generateCompanySlug(data.companyName);
    const MAX_SLUG_ATTEMPTS = 5;
    let shadowCompany: Awaited<ReturnType<typeof prisma.company.create>> | null = null;

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
      try {
        shadowCompany = await prisma.company.create({
          data: {
            name: data.companyName,
            slug,
            verified: false,
            discoveredVia: "user-profile",
          },
        });
        break; // success
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]) : [];
          if (target.includes("slug")) {
            // Slug collision — retry with next suffix
            continue;
          }
          if (target.includes("name")) {
            // Concurrent request already created this company — look it up and continue
            throw new AppError(
              "Company registration is already in progress for this name. Please try again.",
              409,
            );
          }
        }
        throw err;
      }
    }

    if (!shadowCompany) {
      throw new AppError("Could not generate a unique company slug. Please try with a different name.", 500);
    }

    // Route the recruiter profile link under the new shadow company
    await assignCompanyRecruiter(userId, shadowCompany.id, userId, "Recruiter");

    return {
      success: true,
      companyId: shadowCompany.id,
      verified: false,
      discoveredVia: "user-profile",
      message: "Shadow company created and recruiter profile linked.",
    };
  }
};

// CREATE COMPANY OFFICE
export const createCompanyOffice = async (
  userId: string,
  data: {
    companyId: string;
    name: string;
    address?: string;
    city: string;
    managerId?: string | null;
  }
) => {
  const isAdmin = await prisma.companyAdmin.findFirst({
    where: {
      userId,
      companyId: data.companyId,
      officeCity: null,
    },
  });

  if (!isAdmin) {
    throw new AppError(
      "Access denied: only global Company Admins can manage offices",
      403
    );
  }

  return prisma.companyOffice.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      address: data.address || null,
      city: data.city,
      managerId: data.managerId || null,
    },
  });
};

// CREATE COMPANY DEPARTMENT
export const createCompanyDepartment = async (
  userId: string,
  data: {
    companyId: string;
    name: string;
    code?: string;
  }
) => {
  const isAdmin = await prisma.companyAdmin.findFirst({
    where: {
      userId,
      companyId: data.companyId,
      officeCity: null,
    },
  });

  if (!isAdmin) {
    throw new AppError(
      "Access denied: only global Company Admins can manage departments",
      403
    );
  }

  return prisma.companyDepartment.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      code: data.code || null,
    },
  });
};

// UPDATE COMPANY DETAILS
export const updateCompany = async (
  companyId: string,
  data: any
) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  return prisma.company.update({
    where: { id: companyId },
    data,
  });
};
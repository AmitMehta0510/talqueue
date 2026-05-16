import prisma
from "shared/database/prisma";

import AppError
from "shared/errors/AppError";

export const createCompany =  async (data: any) => {

    const existingCompany =
      await prisma.company.findUnique({
        where: {
          name: data.name,
        },
      });

    if (existingCompany) {
      throw new AppError(
        "Company already exists",
        400
      );
    }

    const slug =
      data.name
        .toLowerCase()
        .replace(/\s+/g, "-");

    return prisma.company.create({
      data: {
        name:
          data.name,

        slug,

        websiteUrl:
          data.websiteUrl,

        description:
          data.description,

        tagline:
          data.tagline,

        headquarters:
          data.headquarters,

        industry:
          data.industry,

        foundedYear:
          data.foundedYear,

        type:
          data.type,

        size:
          data.size,
      },
    });
  };

export const getCompanies =  async () => {

    return prisma.company.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  };

export const getCompanyBySlug =  async (slug: string) => {

    const company =
      await prisma.company.findUnique({
        where: { slug },

        include: {
          jobs: {
            where: {
              status: "OPEN",
            },

            take: 10,

            orderBy: {
              createdAt: "desc",
            },
          },

          experiences: {
            where: {
              isCurrent: true,
            },

            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },

            take: 20,
          },

          _count: {
            select: {
              jobs: true,
              experiences: true,
            },
          },
        },
      });

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    return company;
  };

export const getCompanyEmployees =  async (companyId: string) => {

    return prisma.experience.findMany({
      where: {
        companyId,

        isCurrent: true,
      },

      include: {
        user: {
          include: {
            profile: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });
  };
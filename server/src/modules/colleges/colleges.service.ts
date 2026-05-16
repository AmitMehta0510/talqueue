import prisma from "shared/database/prisma";

export const createCollege = async (
  data: any
) => {
  return prisma.college.create({
    data,
  });
};

export const getAllColleges =  async () => {
    return prisma.college.findMany({
      orderBy: {
        name: "asc",
      },
    });
  };

export const searchColleges = async (
  query: string
) => {
  return prisma.college.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },

    take: 10,
  });
};

export const createDepartment =  async (data: any) => {
    return prisma.department.create({
      data: {
        name: data.name,

        collegeId: data.collegeId,
      },
    });
  };

export const getDepartmentsByCollege =  async (collegeId: string) => {
    return prisma.department.findMany({
      where: {
        collegeId,
      },

      orderBy: {
        name: "asc",
      },
    });
  };
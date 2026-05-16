import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification,} from "modules/notificatios/notifications.service";

import { addReputation,} from "modules/reputation/reputation.service";
import {
  createActivity,
} from "modules/activities/activity.service";

export const createJob =  async (
    userId: string,
    data: any
  ) => {

    const company =  await prisma.company.findUnique({
        where: {
          id: data.companyId,
        },
      });

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    const slug =
      `${data.title}-${company.name}`
        .toLowerCase()
        .replace(/\s+/g, "-");

    const job = await prisma.job.create({
      data: {
        companyId:
          data.companyId,

        postedById:
          userId,

        title:
          data.title,

        slug,

        description:
          data.description,

        requirements:
          data.requirements,

        responsibilities:
          data.responsibilities,

        perks:
          data.perks,

        location:
          data.location,

        workMode:
          data.workMode,

        type:
          data.type,

        experienceLevel:
          data.experienceLevel,

        salaryMin:
          data.salaryMin,

        salaryMax:
          data.salaryMax,

        openings:
          data.openings,

        skillsRequired:
          data.skillsRequired,

        applicationDeadline:
          data.applicationDeadline
            ? new Date(
                data.applicationDeadline
              )
            : null,

        applyUrl:
          data.applyUrl,
      },

      include: {
        company: true,
      },
    });

    // Notify recruiter's connections
const connections =  await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",

      OR: [
        {
          senderId: userId,
        },
        {
          receiverId: userId,
        },
      ],
    },
  });

for (const connection of connections) {

  const targetUserId =
    connection.senderId === userId
      ? connection.receiverId
      : connection.senderId;

  createNotification({
    userId: targetUserId,

    type: "SYSTEM",

    title:
      "New Job Posted",

    message:
      `${job.title} role posted at ${company.name}`,
  }).catch(console.error);
}

// Notify current employees
const employees =
  await prisma.experience.findMany({
    where: {
      companyId:
        company.id,

      isCurrent: true,
    },
  });

for (const employee of employees) {

  // Skip recruiter self-notification
  if (
    employee.userId === userId
  ) {
    continue;
  }

  // Recruiter reputation
addReputation(
  userId,

  "JOB_POSTED",

  20,

  "Posted a job",

  {
    jobId: job.id,
    companyId:
      company.id,
  }
).catch(console.error);

  createNotification({
    userId: employee.userId,

    type: "SYSTEM",

    title:
      "New Opening At Your Company",

    message:
      `${job.title} opening was posted at ${company.name}`,
  }).catch(console.error);
}



return job;
  };

export const getJobs =  async () => {

    return prisma.job.findMany({
      where: {
        status: "OPEN",
      },

      include: {
        company: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };

export const getJobBySlug =  async (slug: string) => {

    const job =
      await prisma.job.findUnique({
        where: {
          slug,
        },

        include: {
          company: true,

          postedBy: {
            include: {
              profile: true,
            },
          },
        },
      });

    if (!job) {
      throw new AppError(
        "Job not found",
        404
      );
    }

    // Increment views
    await prisma.job.update({
      where: {
        id: job.id,
      },

      data: {
        views: {
          increment: 1,
        },
      },
    });

    return job;
  };

export const getCompanyJobs =  async (companyId: string) => {

    return prisma.job.findMany({
      where: {
        companyId,

        status: "OPEN",
      },

      include: {
        company: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };

export const getRecruiterJobs =  async (userId: string) => {

    return prisma.job.findMany({
      where: {
        postedById: userId,
      },

      include: {
        company: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };

export const archiveJob =  async (
    recruiterId: string,
    jobId: string
  ) => {

    const job =
      await prisma.job.findUnique({
        where: {
          id: jobId,
        },
      });

    if (!job) {
      throw new AppError(
        "Job not found",
        404
      );
    }

    if (
      job.postedById !==
      recruiterId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    return prisma.job.update({
      where: {
        id: jobId,
      },

      data: {
        status: "ARCHIVED",

        archivedAt:
          new Date(),
      },
    });
  };
  
export const deleteJob = async (
    recruiterId: string,
    jobId: string
  ) => {

    const job =
      await prisma.job.findUnique({
        where: {
          id: jobId,
        },
      });

    if (!job) {
      throw new AppError(
        "Job not found",
        404
      );
    }

    if (
      job.postedById !==
      recruiterId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    const updatedJob =
      await prisma.job.update({
        where: {
          id: jobId,
        },

        data: {
          status: "DELETED",

          deletedAt:
            new Date(),
        },
      });

    //
    // Recruiter penalty
    //
    await addReputation(
      recruiterId,

      "JOB_DELETED",

      -10,

      "Deleted job posting",

      {
        jobId,
      }
    );

    return updatedJob;
  };  
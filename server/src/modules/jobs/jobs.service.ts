import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import { addReputation } from "modules/reputation/reputation.service";

import { createActivity } from "modules/activities/activity.service";

import { generateSlug } from "shared/utils/slugify";

//
// HELPERS
//
const getOwnedJob = async (jobId: string, recruiterId: string) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,

      postedById: recruiterId,

      deletedAt: null,
    },

    select: {
      id: true,
    },
  });

  if (!job) {
    throw new AppError("Job not found or unauthorized", 404);
  }

  return job;
};

//
// CREATE JOB
//
export const createJob = async (userId: string, data: any) => {
  //
  // COMPANY
  //
  const company = await prisma.company.findUnique({
    where: {
      id: data.companyId,
    },

    select: {
      id: true,

      name: true,
    },
  });

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  //
  // SLUG
  //
  const baseSlug = generateSlug(`${data.title}-${company.name}`);

  const slug = `${baseSlug}-${Date.now()}`;

  //
  // CREATE JOB
  //
  const job = await prisma.job.create({
    data: {
      companyId: company.id,

      postedById: userId,

      title: data.title,

      slug,

      description: data.description,

      requirements: data.requirements,

      responsibilities: data.responsibilities,

      perks: data.perks,

      location: data.location,

      workMode: data.workMode,

      type: data.type,

      experienceLevel: data.experienceLevel,

      salaryMin: data.salaryMin,

      salaryMax: data.salaryMax,

      currency: data.currency || "INR",

      openings: data.openings,

      skillsRequired: data.skillsRequired || [],

      applicationDeadline: data.applicationDeadline
        ? new Date(data.applicationDeadline)
        : null,

      applyUrl: data.applyUrl,

      featured: data.featured || false,
    },

    select: {
      id: true,

      title: true,

      slug: true,

      companyId: true,

      createdAt: true,

      company: {
        select: {
          id: true,

          name: true,

          logoUrl: true,
        },
      },
    },
  });

  //
  // ACTIVITY
  //
  createActivity(
    userId,

    "JOB_CREATED",

    "Created a new job",

    `Posted ${job.title} role at ${company.name}`,

    {
      jobId: job.id,
    },
  ).catch(console.error);

  //
  // REPUTATION
  //
  addReputation(
    userId,

    "JOB_POSTED",

    20,

    "Posted a job",

    {
      jobId: job.id,

      companyId: company.id,
    },
  ).catch(console.error);

  //
  // FETCH CONNECTIONS + EMPLOYEES
  //
  const [connections, employees] = await Promise.all([
    prisma.connection.findMany({
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

      select: {
        senderId: true,

        receiverId: true,
      },
    }),

    prisma.experience.findMany({
      where: {
        companyId: company.id,

        isCurrent: true,
      },

      select: {
        userId: true,
      },
    }),
  ]);

  //
  // CONNECTION NOTIFICATIONS
  //
  const connectionNotifications = connections.map((connection) => {
    const targetUserId =
      connection.senderId === userId
        ? connection.receiverId
        : connection.senderId;

    return createNotification({
      userId: targetUserId,

      type: "SYSTEM",

      title: "New Job Posted",

      message: `${job.title} role posted at ${company.name}`,
    });
  });

  //
  // EMPLOYEE NOTIFICATIONS
  //
  const employeeNotifications = employees

    .filter((employee) => employee.userId !== userId)

    .map((employee) =>
      createNotification({
        userId: employee.userId,

        type: "SYSTEM",

        title: "New Opening At Your Company",

        message: `${job.title} opening was posted at ${company.name}`,
      }),
    );

  //
  // FIRE IN PARALLEL
  //
  Promise.all([...connectionNotifications, ...employeeNotifications]).catch(
    console.error,
  );

  return job;
};

//
// GET JOBS
//
export const getJobs = async (page = 1, limit = 20) => {
  const safeLimit = Math.min(limit, 50);

  const skip = (page - 1) * safeLimit;

  return prisma.job.findMany({
    where: {
      status: "OPEN",

      deletedAt: null,
    },

    select: {
      id: true,

      title: true,

      slug: true,

      location: true,

      workMode: true,

      type: true,

      experienceLevel: true,

      salaryMin: true,

      salaryMax: true,

      createdAt: true,

      featured: true,

      company: {
        select: {
          id: true,

          name: true,

          logoUrl: true,

          verified: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    skip,

    take: safeLimit,
  });
};

//
// GET JOB BY SLUG
//
export const getJobBySlug = async (slug: string) => {
  const job = await prisma.job.findUnique({
    where: {
      slug,
    },

    select: {
      id: true,

      title: true,

      slug: true,

      description: true,

      requirements: true,

      responsibilities: true,

      perks: true,

      location: true,

      workMode: true,

      type: true,

      experienceLevel: true,

      salaryMin: true,

      salaryMax: true,

      currency: true,

      openings: true,

      skillsRequired: true,

      views: true,

      applicationsCount: true,

      createdAt: true,

      company: {
        select: {
          id: true,

          name: true,

          logoUrl: true,

          verified: true,

          websiteUrl: true,
        },
      },

      postedBy: {
        select: {
          id: true,

          username: true,

          profile: {
            select: {
              fullName: true,

              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  //
  // NON BLOCKING VIEW UPDATE
  //
  prisma.job
    .update({
      where: {
        id: job.id,
      },

      data: {
        views: {
          increment: 1,
        },
      },
    })
    .catch(console.error);

  return job;
};

//
// COMPANY JOBS
//
export const getCompanyJobs = async (
  companyId: string,

  page = 1,

  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);

  return prisma.job.findMany({
    where: {
      companyId,

      status: "OPEN",

      deletedAt: null,
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

    orderBy: {
      createdAt: "desc",
    },

    skip: (page - 1) * safeLimit,

    take: safeLimit,
  });
};

//
// RECRUITER JOBS
//
export const getRecruiterJobs = async (
  userId: string,

  page = 1,

  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);

  return prisma.job.findMany({
    where: {
      postedById: userId,

      deletedAt: null,
    },

    select: {
      id: true,

      title: true,

      slug: true,

      status: true,

      views: true,

      applicationsCount: true,

      createdAt: true,

      company: {
        select: {
          id: true,

          name: true,

          logoUrl: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    skip: (page - 1) * safeLimit,

    take: safeLimit,
  });
};

//
// ARCHIVE JOB
//
export const archiveJob = async (
  recruiterId: string,

  jobId: string,
) => {
  await getOwnedJob(jobId, recruiterId);

  const job = await prisma.job.update({
    where: {
      id: jobId,
    },

    data: {
      status: "ARCHIVED",

      archivedAt: new Date(),
    },
  });

  //
  // ACTIVITY
  //
  createActivity(
    recruiterId,

    "JOB_ARCHIVED",

    "Archived a job",

    "Archived a job posting",

    {
      jobId,
    },
  ).catch(console.error);

  return job;
};

//
// DELETE JOB
//
export const deleteJob = async (
  recruiterId: string,

  jobId: string,
) => {
  await getOwnedJob(jobId, recruiterId);

  const job = await prisma.job.update({
    where: {
      id: jobId,
    },

    data: {
      status: "DELETED",

      deletedAt: new Date(),
    },
  });

  //
  // REPUTATION
  //
  addReputation(
    recruiterId,

    "JOB_DELETED",

    -10,

    "Deleted job posting",

    {
      jobId,
    },
  ).catch(console.error);

  //
  // ACTIVITY
  //
  createActivity(
    recruiterId,

    "JOB_DELETED",

    "Deleted a job",

    "Removed a job posting",

    {
      jobId,
    },
  ).catch(console.error);

  return job;
};

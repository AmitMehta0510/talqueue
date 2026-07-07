import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notifications/notifications.service";

import { addReputation } from "modules/reputation/reputation.service";

import { createActivity } from "modules/activities/activity.service";

import { trackInteraction } from "modules/interaction/interaction-tracking.service";

import { calculateUserAffinity } from "modules/affinity/affinity.service";

import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";

// TYPES
interface CreateJobApplicationData {
  resumeUrl?: string;

  coverLetter?: string;

  githubUrl?: string;

  portfolioUrl?: string;

  linkedinUrl?: string;
}

interface UpdateApplicationStatusData {
  status: "VIEWED" | "SHORTLISTED" | "INTERVIEW" | "REJECTED" | "HIRED";

  recruiterNotes?: string;
}

// HELPERS
const getJobForRecruiter = async (recruiterId: string, jobId: string) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,

      postedById: recruiterId,

      deletedAt: null,
    },

    select: {
      id: true,

      title: true,
    },
  });

  if (!job) {
    throw new AppError("Job not found or unauthorized", 404);
  }

  return job;
};

const getApplicationForRecruiter = async (
  recruiterId: string,
  applicationId: string,
) => {
  const application = await prisma.jobApplication.findFirst({
    where: {
      id: applicationId,

      job: {
        postedById: recruiterId,
      },
    },

    include: {
      job: {
        select: {
          id: true,

          title: true,

          postedById: true,
        },
      },

      applicant: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!application) {
    throw new AppError("Application not found or unauthorized", 404);
  }

  return application;
};

const getStatusTimestampData = (status: string) => {
  const now = new Date();

  switch (status) {
    case "SHORTLISTED":
      return {
        shortlistedAt: now,
      };

    case "INTERVIEW":
      return {
        interviewScheduledAt: now,
      };

    case "REJECTED":
      return {
        rejectedAt: now,
      };

    case "HIRED":
      return {
        hiredAt: now,
      };

    default:
      return {};
  }
};

// APPLY TO JOB
export const applyToJob = async (
  userId: string,
  jobId: string,
  data: CreateJobApplicationData,
) => {
  const job = await prisma.job.findUnique({
    where: {
      id: jobId,
    },

    select: {
      id: true,

      title: true,

      status: true,

      companyId: true,

      postedById: true,

      company: {
        select: {
          id: true,

          name: true,
        },
      },
    },
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (job.status !== "OPEN") {
    throw new AppError("Job is not open", 400);
  }

  // RECRUITER CANNOT APPLY
  if (job.postedById === userId) {
    throw new AppError("Cannot apply to own job", 400);
  }

  // CANDIDATE COMPANY MEMBERSHIP CHECK
  const isEmployee = await prisma.experience.findFirst({
    where: {
      userId,
      companyId: job.companyId,
      isCurrent: true,
    },
    select: {
      id: true,
    },
  });

  const isCompanyAdmin = await prisma.companyAdmin.findFirst({
    where: {
      userId,
      companyId: job.companyId,
    },
    select: {
      id: true,
    },
  });

  if (isEmployee || isCompanyAdmin) {
    throw new AppError("Cannot apply to jobs at your current company", 400);
  }

  // TRANSACTION WITH UNIQUE CONSTRAINT CATCH fallback
  let application: any;
  try {
    const [createdApplication] = await prisma.$transaction([
      prisma.jobApplication.create({
        data: {
          jobId,

          applicantId: userId,

          resumeUrl: data.resumeUrl,

          coverLetter: data.coverLetter,

          githubUrl: data.githubUrl,

          portfolioUrl: data.portfolioUrl,

          linkedinUrl: data.linkedinUrl,
        },

        include: {
          applicant: {
            include: {
              profile: true,
            },
          },

          job: {
            include: {
              company: true,
            },
          },
        },
      }),

      prisma.job.update({
        where: {
          id: jobId,
        },

        data: {
          applicationsCount: {
            increment: 1,
          },
        },
      }),
    ]);
    application = createdApplication;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new AppError("Already applied", 400);
    }
    throw error;
  }

  // OFFLOAD TO SETIMMEDIATE
  setImmediate(() => {
    // NOTIFICATION
    if (job.postedById) {
      createNotification({
        userId: job.postedById,

        actorId: userId,

        type: "JOB_APPLIED",

        title: "New Job Application",

        message: `${application.applicant.profile?.fullName || application.applicant.username} applied for ${job.title}`,

        entityType: "JOB",

        entityId: jobId,

        actionUrl: `/jobs/${jobId}/applications`,

        metadata: {
          applicationId: application.id,
        },

        groupKey: `job-application-${jobId}`,
      }).catch(console.error);
    }

    // BACKGROUND TASKS
    Promise.all([
      trackInteraction(userId, {
        targetId: jobId,

        targetType: "JOB",

        interactionType: "APPLY",

        metadata: {
          companyId: job.companyId,

          recruiterId: job.postedById,
        },
      }),

      addReputation(
        userId,

        "JOB_APPLIED",

        0,

        "Applied to a job",

        {
          jobId,
        },
      ),

      createActivity(
        userId,

        "JOB_APPLIED",

        "Applied to a job",

        `Applied for "${job.title}" role`,

        {
          jobId,
        },
      ),

      ...(job.postedById && job.postedById !== userId
        ? [
          calculateUserAffinity(userId, job.postedById),

          calculateUserAffinity(job.postedById, userId),
        ]
        : []),
    ]).catch(console.error);
  });

  return application;
};

// MY APPLICATIONS
export const getMyApplications = async (
  userId: string,

  page = 1,

  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);

  return prisma.jobApplication.findMany({
    where: {
      applicantId: userId,
    },

    include: {
      job: {
        include: {
          company: {
            select: {
              id: true,

              name: true,

              logoUrl: true,
            },
          },
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

// JOB APPLICATIONS
export const getJobApplications = async (
  recruiterId: string,

  jobId: string,

  page = 1,

  limit = 20,
) => {
  await getJobForRecruiter(recruiterId, jobId);

  const safeLimit = Math.min(limit, 50);

  return prisma.jobApplication.findMany({
    where: {
      jobId,
    },

    include: {
      applicant: {
        include: {
          profile: true,

          skills: {
            include: {
              skill: true,
            },
          },

          experiences: {
            include: {
              company: {
                select: {
                  id: true,

                  name: true,

                  logoUrl: true,
                },
              },
            },
          },

          educations: {
            include: {
              college: {
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

    orderBy: {
      createdAt: "desc",
    },

    skip: (page - 1) * safeLimit,

    take: safeLimit,
  });
};

// UPDATE APPLICATION STATUS
export const updateApplicationStatus = async (
  recruiterId: string,

  applicationId: string,

  data: UpdateApplicationStatusData,
) => {
  const application = await getApplicationForRecruiter(
    recruiterId,

    applicationId,
  );

  // INVALID TRANSITIONS
  if (application.status === "HIRED") {
    throw new AppError("Applicant already hired", 400);
  }

  if (application.status === "REJECTED") {
    throw new AppError("Rejected applications cannot be updated", 400);
  }

  //
  // UPDATE
  //
  let updatedApplication: any;
  if (data.status === "HIRED") {
    updatedApplication = await prisma.$transaction(async (tx) => {
      const app = await tx.jobApplication.update({
        where: {
          id: applicationId,
          status: application.status,
        },

        data: {
          status: data.status,

          recruiterNotes: data.recruiterNotes,

          ...getStatusTimestampData(data.status),
        },
      });

      const jobs = await tx.$queryRaw<{ openings: number | null }[]>`
        SELECT openings FROM "Job" WHERE id = ${application.jobId} FOR UPDATE
      `;
      const job = jobs[0];

      if (job && job.openings !== null && job.openings !== undefined) {
        if (job.openings <= 0) {
          throw new AppError("No openings remaining for this job", 400);
        }
        const nextOpenings = job.openings - 1;
        await tx.job.update({
          where: { id: application.jobId },
          data: {
            openings: nextOpenings,
            status: nextOpenings === 0 ? "CLOSED" : undefined,
          },
        });
      }

      return app;
    });
  } else {
    updatedApplication = await prisma.jobApplication.update({
      where: {
        id: applicationId,
        status: application.status,
      },

      data: {
        status: data.status,

        recruiterNotes: data.recruiterNotes,

        ...getStatusTimestampData(data.status),
      },
    });
  }

  //
  // OFFLOAD TO SETIMMEDIATE
  //
  setImmediate(() => {
    //
    // NOTIFICATION
    //
    createNotification({
      userId: application.applicantId,

      actorId: recruiterId,

      type: "JOB_APPLICATION_UPDATE",

      title: "Application Status Updated",

      message: `Your application for ${application.job.title} is now ${data.status}`,

      entityType: "JOB",

      entityId: application.jobId,

      actionUrl: `/jobs/applications/${applicationId}`,

      metadata: {
        applicationId,

        status: data.status,
      },

      groupKey: `job-status-${applicationId}`,
    }).catch(console.error);

    //
    // AFFINITY
    //
    Promise.all([
      calculateUserAffinity(
        recruiterId,

        application.applicantId,
      ),

      calculateUserAffinity(
        application.applicantId,

        recruiterId,
      ),
    ]).catch(console.error);

    //
    // SHORTLISTED
    //
    if (data.status === "SHORTLISTED") {
      Promise.all([
        addReputation(
          application.applicantId,

          "JOB_SHORTLISTED",

          20,

          "Shortlisted for a job",

          {
            applicationId,
          },
        ),

        createActivity(
          application.applicantId,

          "JOB_SHORTLISTED",

          "Shortlisted for a job",

          `Shortlisted for "${application.job.title}"`,

          {
            applicationId,
          },
        ),
      ]).catch(console.error);
    }

    //
    // INTERVIEW
    //
    if (data.status === "INTERVIEW") {
      Promise.all([
        addReputation(
          application.applicantId,

          "JOB_INTERVIEW",

          35,

          "Reached interview round",

          {
            applicationId,
          },
        ),

        createActivity(
          application.applicantId,

          "JOB_INTERVIEW",

          "Reached interview round",

          `Interview scheduled for "${application.job.title}"`,

          {
            applicationId,
          },
        ),
      ]).catch(console.error);
    }

    //
    // HIRED
    //
    if (data.status === "HIRED") {
      Promise.all([
        addReputation(
          application.applicantId,

          "JOB_HIRED",

          100,

          "Got hired",

          {
            applicationId,
          },
        ),

        addReputation(
          recruiterId,
          
          "SUCCESSFUL_HIRE",

          40,

          "Successfully hired candidate",

          {
            applicationId,
          },
        ),

        createActivity(
          application.applicantId,

          "JOB_HIRED",

          "Got hired",

          `Hired for "${application.job.title}"`,

          {
            applicationId,
          },
        ),

        calculateEngineeringScore(application.applicantId),

        calculateEngineeringScore(recruiterId),
      ]).catch(console.error);
    }
  });

  return updatedApplication;
};

// MARK VIEWED
export const markApplicationViewed = async (
  recruiterId: string,

  applicationId: string,
) => {
  const application = await getApplicationForRecruiter(
    recruiterId,

    applicationId,
  );

  if (application.status !== "APPLIED") {
    throw new AppError("Application already reviewed", 400);
  }

  const updated = await prisma.jobApplication.update({
    where: {
      id: applicationId,
    },

    data: {
      status: "VIEWED",
    },
  });

  //
  // OFFLOAD TO SETIMMEDIATE
  //
  setImmediate(() => {
    //
    // NOTIFICATION
    //
    createNotification({
      userId: application.applicantId,

      type: "JOB_APPLICATION_UPDATE",

      title: "Application Viewed",

      message: `Your application for ${application.job.title} was viewed by recruiter`,
    }).catch(console.error);

    //
    // REPUTATION
    //
    addReputation(
      application.applicantId,

      "APPLICATION_VIEWED",

      2,

      "Application viewed by recruiter",

      {
        applicationId,
      },
    ).catch(console.error);
  });

  return updated;
};

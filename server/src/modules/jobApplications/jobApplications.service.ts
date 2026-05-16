import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import {createNotification,} from "modules/notificatios/notifications.service";

import { addReputation,} from "modules/reputation/reputation.service";
import {
  createActivity,
} from "modules/activities/activity.service";

export const applyToJob =  async (
    userId: string,
    jobId: string,
    data: any
  ) => {

    const job =  await prisma.job.findUnique({
        where: {
          id: jobId,
        },

        include: {
          company: true,
        },
      });

    if (!job) {
      throw new AppError(
        "Job not found",
        404
      );
    }

    if (
      job.status !== "OPEN"
    ) {
      throw new AppError(
        "Job is not open",
        400
      );
    }

    // Prevent recruiter applying
    if (
      job.postedById === userId
    ) {
      throw new AppError(
        "Cannot apply to own job",
        400
      );
    }

    // Prevent duplicate applications
    const existingApplication =
      await prisma.jobApplication.findUnique({
        where: {
          jobId_applicantId: {
            jobId,
            applicantId:
              userId,
          },
        },
      });

    if (existingApplication) {
      throw new AppError(
        "Already applied",
        400
      );
    }

    const application =  await prisma.jobApplication.create({
        data: {
          jobId,

          applicantId:
            userId,

          resumeUrl:
            data.resumeUrl,

          coverLetter:
            data.coverLetter,

          githubUrl:
            data.githubUrl,

          portfolioUrl:
            data.portfolioUrl,

          linkedinUrl:
            data.linkedinUrl,
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
      });

    // Increment application count
    await prisma.job.update({
      where: {
        id: jobId,
      },

      data: {
        applicationsCount: {
          increment: 1,
        },
      },
    });

    // Notify recruiter
    if (job.postedById) {

      createNotification({
        userId:
          job.postedById,

        type: "SYSTEM",

        title:
          "New Job Application",

        message:
          `${application.applicant.profile?.fullName || "Someone"} applied for ${job.title}`,
      }).catch(console.error);
    }

    // Applicant reputation
addReputation(
  userId,

  "JOB_APPLIED",

  3,

  "Applied to a job",

  {
    jobId,
  }
).catch(console.error);

// Create activity
createActivity(
  userId,

  "JOB_APPLIED",

  "Applied to a job",

  `Applied for "${job.title}" role`,

  {
    jobId,
  }
).catch(console.error);

    return application;
  };

export const getMyApplications =  async (userId: string) => {

    return prisma.jobApplication.findMany({
      where: {
        applicantId: userId,
      },

      include: {
        job: {
          include: {
            company: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };  

  //recruiter can see all applications for their job
export const getJobApplications =  async (
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
                company: true,
              },
            },

            educations: {
              include: {
                college: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };  

  //recruiter can update application status and add notes
export const updateApplicationStatus =  async (
    recruiterId: string,
    applicationId: string,
    data: any
  ) => {

    const application =  await prisma.jobApplication.findUnique({
        where: {
          id: applicationId,
        },

        include: {
          job: true,

          applicant: {
            include: {
              profile: true,
            },
          },
        },
      });

    if (!application) {
      throw new AppError(
        "Application not found",
        404
      );
    }

    if (
      application.job
        .postedById !==
      recruiterId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    // Prevent updates after hire
    if (
      application.status ===
      "HIRED"
    ) {
      throw new AppError(
        "Applicant already hired",
        400
      );
    }

    const updatedApplication =  await prisma.jobApplication.update({
        where: {
          id: applicationId,
        },

        data: {
          status:
            data.status,

          recruiterNotes:
            data.recruiterNotes,

          shortlistedAt:
            data.status ===
            "SHORTLISTED"
              ? new Date()
              : undefined,

          interviewScheduledAt:
            data.status ===
            "INTERVIEW"
              ? new Date()
              : undefined,

          rejectedAt:
            data.status ===
            "REJECTED"
              ? new Date()
              : undefined,

          hiredAt:
            data.status ===
            "HIRED"
              ? new Date()
              : undefined,
        },
      });

    // Notify applicant
    createNotification({
      userId:
        application.applicantId,

      type: "SYSTEM",

      title:
        "Application Status Updated",

      message:
        `Your application for ${application.job.title} is now ${data.status}`,
    }).catch(console.error);


// Reputation rewards

if (
  data.status ===
  "SHORTLISTED"
) {

  addReputation(
    application.applicantId,

    "JOB_SHORTLISTED",

    20,

    "Shortlisted for a job",

    {
      applicationId,
    }
  ).catch(console.error);

  createActivity(
  application.applicantId,

  "JOB_SHORTLISTED",

  "Shortlisted for a job",

  `Shortlisted for "${application.job.title}"`,

  {
    applicationId,
  }
).catch(console.error);
}

if (
  data.status ===
  "INTERVIEW"
) {

  addReputation(
    application.applicantId,

    "JOB_INTERVIEW",

    35,

    "Reached interview round",

    {
      applicationId,
    }
  ).catch(console.error);

  createActivity(
  application.applicantId,

  "JOB_INTERVIEW",

  "Reached interview round",

  `Interview scheduled for "${application.job.title}"`,

  {
    applicationId,
  }
).catch(console.error);
}

if (
  data.status ===
  "HIRED"
) {

  // Candidate reward
  addReputation(
    application.applicantId,

    "JOB_HIRED",

    100,

    "Got hired",

    {
      applicationId,
    }
  ).catch(console.error);

  // Recruiter reward
  addReputation(
    recruiterId,

    "SUCCESSFUL_HIRE",

    40,

    "Successfully hired candidate",

    {
      applicationId,
    }
  ).catch(console.error);

  createActivity(
  application.applicantId,

  "JOB_HIRED",

  "Got hired",

  `Hired for "${application.job.title}"`,

  {
    applicationId,
  }
).catch(console.error);
}

    return updatedApplication;
  };  

  //recruiter can mark application as viewed
export const markApplicationViewed =  async (
    recruiterId: string,
    applicationId: string
  ) => {

    const application =
      await prisma.jobApplication.findUnique({
        where: {
          id: applicationId,
        },

        include: {
          job: true,
        },
      });

    if (!application) {
      throw new AppError(
        "Application not found",
        404
      );
    }

    if (
      application.job
        .postedById !==
      recruiterId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    // Prevent unnecessary updates
    if (
      application.status !==
      "APPLIED"
    ) {
      throw new AppError(
        "Application already reviewed",
        400
      );
    }

    const updatedApplication =
      await prisma.jobApplication.update({
        where: {
          id: applicationId,
        },

        data: {
          status: "VIEWED",
        },
      });

    // Notify applicant
    createNotification({
      userId:
        application.applicantId,

      type: "SYSTEM",

      title:
        "Application Viewed",

      message:
        `Your application for ${application.job.title} was viewed by recruiter`,
    }).catch(console.error);

    addReputation(
  application.applicantId,

  "APPLICATION_VIEWED",

  2,

  "Application viewed by recruiter",

  {
    applicationId,
  }
).catch(console.error);

    return updatedApplication;
  };
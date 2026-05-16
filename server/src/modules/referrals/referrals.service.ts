import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import {createNotification,} from "modules/notificatios/notifications.service";

import { addReputation,} from "modules/reputation/reputation.service";
import {createActivity,} from "modules/activities/activity.service";

export const createReferralRequest =  async (
    requesterId: string,
    receiverId: string,
    data: any
  ) => {

    if (
      requesterId === receiverId
    ) {
      throw new AppError(
        "Cannot request referral from yourself",
        400
      );
    }

    // Daily anti-spam limit
    const recentRequests =
      await prisma.referralRequest.count({
        where: {
          requesterId,

          createdAt: {
            gte: new Date(
              Date.now() -
              24 *
              60 *
              60 *
              1000
            ),
          },
        },
      });

    if (recentRequests >= 10) {
      throw new AppError(
        "Referral request daily limit reached",
        429
      );
    }

    // Find company
    const company =
      await prisma.company.findUnique({
        where: {
          name:
            data.companyName,
        },
      });

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    // Verify receiver currently works there
    const currentEmployee =
      await prisma.experience.findFirst({
        where: {
          userId: receiverId,

          companyId:
            company.id,

          isCurrent: true,
        },
      });

    if (!currentEmployee) {
      throw new AppError(
        "User does not currently work at this company",
        400
      );
    }

    // Prevent duplicates
    const existingRequest =
      await prisma.referralRequest.findFirst({
        where: {
          requesterId,

          receiverId,

          companyId:
            company.id,

          jobRole:
            data.jobRole,

          status: {
            in: [
              "PENDING",
              "ACCEPTED",
            ],
          },
        },
      });

    if (existingRequest) {
      throw new AppError(
        "Referral request already exists",
        400
      );
    }

    // Create request
    const request =
      await prisma.referralRequest.create({
        data: {
          requesterId,

          receiverId,

          companyId:
            company.id,

          externalJobId:
            data.jobId,

          jobRole:
            data.jobRole,

          jobUrl:
            data.jobUrl,

          message:
            data.message,

          githubUrl:
            data.githubUrl,

          codingProfileUrl:
            data.codingProfileUrl,

          resumeUrl:
            data.resumeUrl,

          linkedinUrl:
            data.linkedinUrl,

          portfolioUrl:
            data.portfolioUrl,
        },

        include: {
          requester: {
            include: {
              profile: true,
            },
          },

          company: true,
        },
      });

    createNotification({
      userId: receiverId,

      type: "SYSTEM",

      title:
        "New Referral Request",

      message:
        `${
          request.requester
            .profile
            ?.fullName ||
          "Someone"
        } requested a referral for ${
          request.company.name
        }`,
    }).catch(console.error);

    return request;
  };

export const reviewReferralRequest =  async (
    userId: string,
    requestId: string,
    status:
      | "ACCEPTED"
      | "REJECTED"
      | "REFERRED"
  ) => {

    const request =  await prisma.referralRequest.findUnique({
  where: {
    id: requestId,
  },

  include: {
    company: true,
  },
});

    if (!request) {
      throw new AppError(
        "Referral request not found",
        404
      );
    }

    if (
      request.receiverId !==
      userId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    const updatedRequest =
      await prisma.referralRequest.update({
        where: {
          id: requestId,
        },

        data: {
          status,

          reviewedAt:
            new Date(),

          referredAt:
            status === "REFERRED"
              ? new Date()
              : undefined,
        },
      });

      //
// Reputation rewards

if (
  status === "REFERRED"
) {

  // Reward referrer
  addReputation(
    userId,

    "SUCCESSFUL_REFERRAL",

    25,

    "Successfully referred a candidate",

    {
      referralRequestId:
        requestId,

      companyId:
        request.companyId,
    }
  ).catch(console.error);

  // Reward requester
  addReputation(
    request.requesterId,

    "RECEIVED_REFERRAL",

    10,

    "Received a referral",

    {
      referralRequestId:
        requestId,

      companyId:
        request.companyId,
    }
  ).catch(console.error);

  // Referrer activity
  createActivity(
  userId,

  "REFERRAL_GIVEN",

  "Referred a candidate",

  `Referred a candidate for ${request.company.name}`,

  {
    referralRequestId:
      requestId,
  }
).catch(console.error);

//Requester activity
createActivity(
  request.requesterId,

  "REFERRAL_RECEIVED",

  "Received referral",

  `Received referral for ${request.company.name}`,

  {
    referralRequestId:
      requestId,
  }
).catch(console.error);
}

    createNotification({
      userId:
        request.requesterId,

      type: "SYSTEM",

      title:
        `Referral ${status.toLowerCase()}`,

      message:
  `Your referral request for ${request.company?.name || "company"} was ${status.toLowerCase()}`,
    }).catch(console.error);

    return updatedRequest;
  };

export const getReceivedReferralRequests =  async (userId: string) => {

    return prisma.referralRequest.findMany({
      where: {
        receiverId: userId,
      },

      include: {
        requester: {
          include: {
            profile: true,
            skills: {
              include: {
                skill: true,
              },
            },
            experiences: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };

export const getSentReferralRequests =  async (userId: string) => {

    return prisma.referralRequest.findMany({
      where: {
        requesterId: userId,
      },

      include: {
        receiver: {
          include: {
            profile: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };
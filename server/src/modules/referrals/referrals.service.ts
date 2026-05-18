import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import { addReputation } from "modules/reputation/reputation.service";
import { createActivity } from "modules/activities/activity.service";
import { calculateUserAffinity } from "modules/affinity/affinity.service";
import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";

export const createReferralRequest = async (
  requesterId: string,
  receiverId: string,
  data: any,
) => {
  if (requesterId === receiverId) {
    throw new AppError("Cannot request referral from yourself", 400);
  }

  // Daily anti-spam limit
  const recentRequests = await prisma.referralRequest.count({
    where: {
      requesterId,

      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (recentRequests >= 10) {
    throw new AppError("Referral request daily limit reached", 429);
  }

  // Find company
  const company = await prisma.company.findUnique({
    where: {
      name: data.companyName,
    },
  });

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  // Verify receiver currently works there
  const currentEmployee = await prisma.experience.findFirst({
    where: {
      userId: receiverId,

      companyId: company.id,

      isCurrent: true,
    },
  });

  if (!currentEmployee) {
    throw new AppError("User does not currently work at this company", 400);
  }

  // Prevent duplicates
  const existingRequest = await prisma.referralRequest.findFirst({
    where: {
      requesterId,

      receiverId,

      companyId: company.id,

      jobRole: data.jobRole,

      status: {
        in: ["PENDING", "ACCEPTED"],
      },
    },
  });

  if (existingRequest) {
    throw new AppError("Referral request already exists", 400);
  }

  const requester = await prisma.user.findUnique({
    where: {
      id: requesterId,
    },

    include: {
      profile: true,
    },
  });

  if ((requester?.engineeringScore || 0) < 20) {
    throw new AppError(
      "Increase your engineering credibility before requesting referrals",
      400,
    );
  }

  // Create request
  const request = await prisma.referralRequest.create({
    data: {
      requesterId,

      receiverId,

      companyId: company.id,

      externalJobId: data.jobId,

      jobRole: data.jobRole,

      jobUrl: data.jobUrl,

      message: data.message,

      githubUrl: data.githubUrl,

      codingProfileUrl: data.codingProfileUrl,

      resumeUrl: data.resumeUrl,

      linkedinUrl: data.linkedinUrl,

      portfolioUrl: data.portfolioUrl,
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

  await calculateUserAffinity(requesterId, receiverId);

  await calculateUserAffinity(receiverId, requesterId);

  createActivity(
    requesterId,
    "REFERRAL_REQUESTED",
    "Requested a referral",
    `Requested referral for ${request.company.name}`,
    {
      referralRequestId: request.id,
    },
  ).catch(console.error);

  createNotification({
    userId: receiverId,

    type: "REFERRAL",

    title: "New Referral Request",

    message: `${request.requester.profile?.fullName || request.requester.username} requested a referral for ${request.company.name}`,
  }).catch(console.error);

  addReputation(
    requesterId,
    "REFERRAL_REQUEST_CREATED",
    1,
    "Requested a professional referral",
    {
      referralRequestId: request.id,
    },
  ).catch(console.error);

  return request;
};

export const reviewReferralRequest = async (
  userId: string,
  requestId: string,
  status: "ACCEPTED" | "REJECTED" | "REFERRED",
) => {
  const request = await prisma.referralRequest.findUnique({
    where: {
      id: requestId,
    },

    include: {
      company: true,

      requester: {
        include: {
          profile: true,
        },
      },

      receiver: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError("Referral request not found", 404);
  }

  if (request.receiverId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // Prevent invalid transitions
  //
  if (request.status === "REFERRED") {
    throw new AppError("Referral already completed", 400);
  }

  //
  // Cannot directly refer rejected request
  //
  if (request.status === "REJECTED" && status === "REFERRED") {
    throw new AppError("Rejected requests cannot be referred", 400);
  }

  //
  // Update request
  //
  const updatedRequest = await prisma.referralRequest.update({
    where: {
      id: requestId,
    },

    data: {
      status,

      reviewedAt: new Date(),

      referredAt: status === "REFERRED" ? new Date() : undefined,
    },
  });

  //
  // Affinity update
  //
  await calculateUserAffinity(request.requesterId, request.receiverId);

  await calculateUserAffinity(request.receiverId, request.requesterId);

  //
  // ACCEPTED
  //
  if (status === "ACCEPTED") {
    //
    // Activity
    //
    createActivity(
      userId,

      "REFERRAL_ACCEPTED",

      "Accepted referral request",

      `Accepted referral request for ${request.company.name}`,

      {
        referralRequestId: requestId,
      },
    ).catch(console.error);

    createNotification({
      userId: request.requesterId,

      type: "REFERRAL",

      title: "Referral Request Accepted",

      message: `${request.receiver.profile?.fullName || request.receiver.username || "Someone"} accepted your referral request for ${request.company.name}`,
    }).catch(console.error);
  }

  //
  // REJECTED
  //
  if (status === "REJECTED") {
    createNotification({
      userId: request.requesterId,

      type: "REFERRAL",

      title: "Referral Request Rejected",

      message: `${request.receiver.profile?.fullName || request.receiver.username || "Someone"} rejected your referral request for ${request.company.name}`,
    }).catch(console.error);
  }

  //
  // REFERRED
  //
  if (status === "REFERRED") {
    //
    // Engineering score recalculation
    //
    calculateEngineeringScore(userId).catch(console.error);

    calculateEngineeringScore(request.requesterId).catch(console.error);

    //
    // Strong affinity update
    //
    await calculateUserAffinity(request.requesterId, request.receiverId);

    await calculateUserAffinity(request.receiverId, request.requesterId);

    //
    // Reward referrer
    //
    addReputation(
      userId,

      "SUCCESSFUL_REFERRAL",

      25,

      "Successfully referred a candidate",

      {
        referralRequestId: requestId,

        companyId: request.companyId,
      },
    ).catch(console.error);

    //
    // Reward requester
    //
    addReputation(
      request.requesterId,

      "RECEIVED_REFERRAL",

      10,

      "Received a referral",

      {
        referralRequestId: requestId,

        companyId: request.companyId,
      },
    ).catch(console.error);

    //
    // Referrer activity
    //
    createActivity(
      userId,

      "REFERRAL_GIVEN",

      "Referred a candidate",

      `Referred a candidate for ${request.company.name}`,

      {
        referralRequestId: requestId,
      },
    ).catch(console.error);

    //
    // Requester activity
    //
    createActivity(
      request.requesterId,

      "REFERRAL_RECEIVED",

      "Received referral",

      `Received referral for ${request.company.name}`,

      {
        referralRequestId: requestId,
      },
    ).catch(console.error);

    //
    // Notification
    //
    createNotification({
      userId: request.requesterId,

      type: "REFERRAL",

      title: "Referral Completed",

      message: `${request.receiver.profile?.fullName || request.receiver.username || "Someone"} referred you at ${request.company.name}`,
    }).catch(console.error);
  }

  return updatedRequest;
};

export const getReceivedReferralRequests = async (userId: string) => {
  const requests = await prisma.referralRequest.findMany({
    where: {
      receiverId: userId,
    },

    include: {
      company: true,

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

  //
  // Attach affinity data
  //
  const enrichedRequests = await Promise.all(
    requests.map(async (request) => {
      const affinity = await prisma.userAffinity.findUnique({
        where: {
          userId_targetUserId: {
            userId,

            targetUserId: request.requesterId,
          },
        },
      });

      return {
        ...request,

        requesterMeta: {
          engineeringScore: request.requester.engineeringScore,

          reputationScore: request.requester.reputationScore,

          affinityScore: affinity?.score || 0,

          interactionCount: affinity?.interactionCount || 0,

          collaborationScore: affinity?.collaborationScore || 0,

          skillSimilarityScore: affinity?.skillSimilarityScore || 0,
        },
      };
    }),
  );

  return enrichedRequests;
};

export const getSentReferralRequests = async (userId: string) => {
  const requests = await prisma.referralRequest.findMany({
    where: {
      requesterId: userId,
    },

    include: {
      company: true,

      receiver: {
        include: {
          profile: true,

          experiences: {
            where: {
              isCurrent: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  //
  // Attach affinity data
  //
  const enrichedRequests = await Promise.all(
    requests.map(async (request) => {
      const affinity = await prisma.userAffinity.findUnique({
        where: {
          userId_targetUserId: {
            userId,

            targetUserId: request.receiverId,
          },
        },
      });

      return {
        ...request,

        receiverMeta: {
          engineeringScore: request.receiver.engineeringScore,

          reputationScore: request.receiver.reputationScore,

          affinityScore: affinity?.score || 0,

          interactionCount: affinity?.interactionCount || 0,

          collaborationScore: affinity?.collaborationScore || 0,

          skillSimilarityScore: affinity?.skillSimilarityScore || 0,
        },
      };
    }),
  );

  return enrichedRequests;
};

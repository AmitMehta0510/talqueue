import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";

import { addReputation } from "modules/reputation/reputation.service";
import { createActivity } from "modules/activities/activity.service";
import { calculateUserAffinity } from "modules/affinity/affinity.service";
import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";

/*
  Developer notes / recommendations:

  1) Abuse controls
     - Consider receiver cooldowns (max referrals given per day),
       reputation minimums for referrers, and duplicate-job detection.
     - Add fraud signals (rapid referrals across many accounts, identical resumes/links).

  2) Pagination
     - Use cursor-based pagination for inboxes/feeds instead of skip/take at scale.
       Cursor pagination provides stable, efficient pagination for high offsets.

  3) Indexes
     - We've added targeted indexes to `ReferralRequest`.
     - Monitor slow queries and add composite indexes as needed.

*/

export const createReferralRequest = async (
  requesterId: string,
  receiverId: string,
  data: any,
) => {
  if (requesterId === receiverId) {
    throw new AppError("Cannot request referral from yourself", 400);
  }

  // Find company by id, slug, or name using OR query
  const conditions: any[] = [];
  if (data.companyId) conditions.push({ id: data.companyId });
  if (data.companySlug) conditions.push({ slug: data.companySlug });
  if (data.companyName) conditions.push({ name: data.companyName });

  if (conditions.length === 0) {
    throw new AppError("Company identification not provided", 400);
  }

  // Pure database checks and creation operation inside a Serializable transaction block
  const request = await prisma.$transaction(async (tx) => {
    const company = await tx.company.findFirst({
      where: {
        OR: conditions,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!company) {
      throw new AppError("Company not found", 404);
    }

    // Daily anti-spam limit
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRequests = await tx.referralRequest.count({
      where: {
        requesterId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    if (recentRequests >= 10) {
      throw new AppError("Referral request daily limit reached", 429);
    }

    // Verify receiver currently works there with a verified experience
    const currentEmployee = await tx.experience.findFirst({
      where: {
        userId: receiverId,
        companyId: company.id,
        isCurrent: true,
        verified: true,
      },
      select: {
        id: true,
      },
    });

    if (!currentEmployee) {
      throw new AppError(
        "User does not currently work at this company with a verified experience",
        400,
      );
    }

    // Prevent duplicates
    const existingRequest = await tx.referralRequest.findFirst({
      where: {
        requesterId,
        receiverId,
        companyId: company.id,
        jobRole: data.jobRole,
        status: {
          in: ["PENDING", "ACCEPTED"],
        },
      },
      select: {
        id: true,
      },
    });

    if (existingRequest) {
      throw new AppError("Referral request already exists", 400);
    }

    // Requester score check
    const requester = await tx.user.findUnique({
      where: {
        id: requesterId,
      },
      select: {
        engineeringScore: true,
      },
    });

    if ((requester?.engineeringScore || 0) < 20) {
      throw new AppError(
        "Increase your engineering credibility before requesting referrals",
        400,
      );
    }

    // Create request
    return tx.referralRequest.create({
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
          select: {
            username: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
    });
  }, {
    isolationLevel: "Serializable"
  });

  // Post-transaction side effects (external to transactional integrity)
  // Offloaded to a setImmediate macro-task so affinity compute does not block
  // the HTTP response cycle.
  setImmediate(() => {
    Promise.all([
      calculateUserAffinity(requesterId, receiverId),
      calculateUserAffinity(receiverId, requesterId),
    ]).catch(console.error);
  });

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

  // Enforce explicit state machine for referral status transitions.
  // Allowed transitions:
  // PENDING -> ACCEPTED | REJECTED
  // ACCEPTED -> REFERRED
  // REJECTED -> (none)
  // REFERRED -> (none)
  const allowedTransitions: Record<string, string[]> = {
    PENDING: ["ACCEPTED", "REJECTED"],
    ACCEPTED: ["REFERRED"],
    REJECTED: [],
    REFERRED: [],
  };

  const currentStatus = request.status as string;

  const allowed = allowedTransitions[currentStatus] || [];

  if (!allowed.includes(status)) {
    throw new AppError(
      `Invalid status transition from ${currentStatus} to ${status}`,
      400,
    );
  }

  // Receiver cooldown: limit number of successful REFERRED actions per receiver per day
  if (status === "REFERRED") {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const referralsGiven = await prisma.referralRequest.count({
      where: {
        receiverId: userId,
        status: "REFERRED",
        referredAt: {
          gte: oneDayAgo,
        },
      },
    });

    const DAILY_REFERRED_LIMIT = 5; // configurable threshold

    if (referralsGiven >= DAILY_REFERRED_LIMIT) {
      throw new AppError(
        "Referral cooldown: daily referral limit reached",
        429,
      );
    }
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
  // Affinity update — offloaded so it does not block the response cycle.
  //
  setImmediate(() => {
    Promise.all([
      calculateUserAffinity(request.requesterId, request.receiverId),
      calculateUserAffinity(request.receiverId, request.requesterId),
    ]).catch(console.error);
  });

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
    // Strong affinity update — separate setImmediate from the general-path
    // affinity update above so ordering is preserved as independent macro-tasks.
    //
    setImmediate(() => {
      Promise.all([
        calculateUserAffinity(request.requesterId, request.receiverId),
        calculateUserAffinity(request.receiverId, request.requesterId),
      ]).catch(console.error);
    });

    //
    // Reward referrer
    //
    addReputation(
      userId,

      "SUCCESSFUL_REFERRAL",

      75,

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

export const getReceivedReferralRequests = async (
  userId: string,
  params: { cursor?: string; limit?: number } = {},
) => {
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  const cursorId = params.cursor;
  const requests = await prisma.referralRequest.findMany({
    where: { receiverId: userId },
    include: {
      company: { select: { id: true, name: true } },
      requester: {
        select: {
          username: true,
          engineeringScore: true,
          reputationScore: true,
          profile: { select: { fullName: true } },
          skills: {
            take: 10,
            select: {
              id: true,
              level: true,
              skill: { select: { id: true, name: true } },
            },
          },
          experiences: {
            where: { isCurrent: true },
            select: {
              id: true,
              title: true,
              companyName: true,
              employmentType: true,
              startDate: true,
              endDate: true,
            },
          },
          targetAffinities: {
            where: {
              userId,
            },
            select: {
              score: true,
              interactionCount: true,
              messageScore: true,
              collaborationScore: true,
              skillSimilarityScore: true,
              socialScore: true,
              recruiterScore: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    take: limit,
  });

  const hasNextPage = requests.length === limit;
  const nextCursor = hasNextPage ? requests[requests.length - 1].id : null;

  return { limit, nextCursor, hasNextPage, requests };
};

export const getSentReferralRequests = async (
  userId: string,
  params: { cursor?: string; limit?: number } = {},
) => {
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  const cursorId = params.cursor;
  const requests = await prisma.referralRequest.findMany({
    where: { requesterId: userId },
    include: {
      company: { select: { id: true, name: true } },
      receiver: {
        select: {
          username: true,
          engineeringScore: true,
          reputationScore: true,
          profile: { select: { fullName: true } },
          experiences: {
            where: { isCurrent: true },
            select: {
              id: true,
              title: true,
              companyName: true,
              employmentType: true,
              startDate: true,
              endDate: true,
            },
          },
          targetAffinities: {
            where: {
              userId,
            },
            select: {
              score: true,
              interactionCount: true,
              messageScore: true,
              collaborationScore: true,
              skillSimilarityScore: true,
              socialScore: true,
              recruiterScore: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    take: limit,
  });

  const hasNextPage = requests.length === limit;
  const nextCursor = hasNextPage ? requests[requests.length - 1].id : null;

  return { limit, nextCursor, hasNextPage, requests };
};

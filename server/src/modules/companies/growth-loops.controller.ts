import { Request, Response } from "express";
import crypto from "crypto";
import winston from "winston";
import { z } from "zod";

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import AppError from "shared/errors/AppError";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import { createNotification } from "modules/notificatios/notifications.service";
import { NotificationType } from "@prisma/client";
import { sendOtpEmail } from "infra/mail/brevo-mailer.service";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [GrowthLoops] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/** OTP validity window in seconds (10 minutes). */
const OTP_TTL_SECONDS = 600;

/** Redis key prefix for company-claim OTPs. */
const CLAIM_OTP_PREFIX = "company-claim";

/** OTP is a 6-digit numeric code. */
const OTP_LENGTH = 6;

// ---------------------------------------------------------------------------
// VALIDATION SCHEMAS
// ---------------------------------------------------------------------------

const tpoOnboardSchema = z.object({
  collegeName: z.string().min(3).max(300),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  website: z.string().url().optional(),
  aisheCode: z.string().max(50).optional(),
  officialEmail: z.string().email(),
  authorityLetterheadDoc: z.string().url().optional(),
});

const claimInitiateSchema = z.object({
  companyId: z.string().uuid(),
  businessEmail: z.string().email(),
});

const claimVerifySchema = z.object({
  companyId: z.string().uuid(),
  otp: z.string().length(OTP_LENGTH),
});

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically random 6-digit numeric OTP string.
 */
function generateOtp(): string {
  // Use crypto.randomInt for uniform distribution over [0, 1_000_000)
  const value = crypto.randomInt(0, 1_000_000);
  return value.toString().padStart(OTP_LENGTH, "0");
}

/**
 * Extracts the domain part from an email address.
 * Example: "alice@company.io" → "company.io"
 */
function extractEmailDomain(email: string): string {
  const parts = email.toLowerCase().split("@");
  if (parts.length !== 2 || !parts[1]) {
    throw new AppError("Invalid email format", 400);
  }
  return parts[1];
}

/**
 * Composes the Redis key for a company-claim OTP.
 * Key: "company-claim:{companyId}:{userId}"
 */
function buildOtpKey(companyId: string, userId: string): string {
  return `${CLAIM_OTP_PREFIX}:${companyId}:${userId}`;
}

/**
 * Fetches all platform super-admin users to send notifications.
 */
async function getSuperAdminIds(): Promise<string[]> {
  const admins = await prisma.userRole.findMany({
    where: { role: { name: { in: ["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN"] } } },
    select: { userId: true },
  });
  return admins.map((a) => a.userId);
}

// ---------------------------------------------------------------------------
// HANDLER: POST /api/tpo/onboard-college
// ---------------------------------------------------------------------------

/**
 * TPO College Onboarding Endpoint.
 *
 * Allows a TPO (Training & Placement Officer) to submit their college for
 * institutional onboarding. Uses the existing `CollegeRequest` model with
 * the `VERIFIED` status for pre-validated submissions or `PENDING` for
 * admin-approval flows.
 *
 * Flow:
 *  1. Validate request body.
 *  2. Normalize college name and check for duplicates.
 *  3. Create a CollegeRequest with required institutional fields.
 *  4. Send in-app notification to all super-admin users.
 *  5. Return the created request.
 */
export const tpoOnboardCollegeHandler = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.user.id as string;

    // Validate
    const data = tpoOnboardSchema.parse(req.body);

    logger.info(`TPO onboard request from user ${userId} for college "${data.collegeName}".`);

    // Check if a request from this user for this college already exists (dedup)
    const existingRequest = await prisma.collegeRequest.findFirst({
      where: {
        userId,
        name: { equals: data.collegeName, mode: "insensitive" },
        status: { in: ["PENDING", "VERIFIED"] },
      },
      select: { id: true, status: true },
    });

    if (existingRequest) {
      throw new AppError(
        `A college request for "${data.collegeName}" is already ${existingRequest.status.toLowerCase()} for your account. ` +
          `Request ID: ${existingRequest.id}`,
        409
      );
    }

    // Check if the college already exists in the platform catalog
    const normalizedKey = data.collegeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existingCollege = await prisma.college.findFirst({
      where: { normalizedKey },
      select: { id: true, name: true },
    });

    if (existingCollege) {
      // College exists: create request to link the TPO to it
      logger.info(
        `College "${existingCollege.name}" already in catalog (id: ${existingCollege.id}). Creating linking request.`
      );
    }

    // Create the CollegeRequest (PENDING status — admin approval required)
    const request = await prisma.collegeRequest.create({
      data: {
        userId,
        name: data.collegeName,
        city: data.city,
        state: data.state,
        country: data.country,
        website: data.website,
        aisheCode: data.aisheCode,
        officialEmail: data.officialEmail,
        authorityLetterheadDoc: data.authorityLetterheadDoc,
        status: "PENDING",
      },
      select: {
        id: true,
        name: true,
        status: true,
        officialEmail: true,
        aisheCode: true,
        createdAt: true,
      },
    });

    logger.info(`TPO onboard CollegeRequest created: id=${request.id} for "${request.name}".`);

    // Notify all super-admins about the new institutional onboarding request
    const adminIds = await getSuperAdminIds();
    const notificationPromises = adminIds.map((adminId) =>
      createNotification({
        userId: adminId,
        type: NotificationType.SYSTEM,
        actorId: userId,
        title: "New TPO College Onboarding Request",
        message: `New TPO college onboarding request: "${data.collegeName}" by ${data.officialEmail}. Request ID: ${request.id}`,
        entityType: "college_request",
        entityId: request.id,
        actionUrl: `/admin/college-requests/${request.id}`,
      }).catch((err) => {
        logger.warn(`Failed to notify admin ${adminId}: ${err.message}`);
      })
    );
    await Promise.allSettled(notificationPromises);

    logger.info(`Notified ${adminIds.length} admin(s) about TPO request ${request.id}.`);

    return res.status(201).json(
      successResponse(
        {
          collegeRequestId: request.id,
          collegeName: request.name,
          status: request.status,
          officialEmail: request.officialEmail,
          message:
            "Your institutional onboarding request has been submitted. Our team will review and reach out within 2-3 business days.",
        },
        "College onboarding request submitted successfully"
      )
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: POST /api/companies/claim/initiate
// ---------------------------------------------------------------------------

/**
 * Company Claim — Initiate (Step 1 of 2).
 *
 * Allows a recruiter to initiate a claim on their company profile.
 *
 * Security flow:
 *  1. Validate companyId and businessEmail.
 *  2. Extract domain from businessEmail.
 *  3. Cross-check domain against Company.emailDomains[].
 *  4. If mismatch → 403 Forbidden.
 *  5. If match → generate 6-digit OTP, store in Redis with 10-min TTL.
 *  6. Send OTP to recruiter's business email via Brevo transactional API.
 *  7. OTP is NEVER returned in the HTTP response body (even in dev mode).
 */
export const claimInitiateHandler = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.user.id as string;

    const { companyId, businessEmail } = claimInitiateSchema.parse(req.body);

    logger.info(
      `Claim initiate: user=${userId}, company=${companyId}, email=${businessEmail}`
    );

    // Load the target company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        emailDomains: true,
        verificationStatus: true,
        claimedAt: true,
      },
    });

    if (!company) {
      throw new AppError("Company not found", 404);
    }

    // Prevent double-claiming of an already verified company
    if (company.verificationStatus === "VERIFIED" && company.claimedAt) {
      throw new AppError(
        `Company "${company.name}" is already claimed and verified. Contact support if you believe this is an error.`,
        409
      );
    }

    // --- Domain validation ---
    const incomingDomain = extractEmailDomain(businessEmail);

    const domainMatches =
      company.emailDomains.length > 0 &&
      company.emailDomains.some((d) => d.toLowerCase() === incomingDomain);

    if (!domainMatches) {
      logger.warn(
        `Claim domain mismatch for company "${company.name}": ` +
          `incoming="${incomingDomain}", allowed=${JSON.stringify(company.emailDomains)}`
      );
      throw new AppError(
        `Business email domain "@${incomingDomain}" does not match the registered domains for "${company.name}". ` +
          `If your company's domain is not listed, please contact support.`,
        403
      );
    }

    // --- Generate and store OTP in Redis ---
    const otp = generateOtp();
    const redisKey = buildOtpKey(companyId, userId);

    await redis.set(redisKey, otp, "EX", OTP_TTL_SECONDS);

    logger.info(
      `OTP generated for company claim: company=${companyId}, user=${userId}, ttl=${OTP_TTL_SECONDS}s`
    );

    // --- Dispatch OTP via Brevo transactional email ---
    // OTP is NEVER placed in the HTTP response body.
    // In dev mode (no BREVO_API_KEY), sendOtpEmail logs it via Winston and returns { sent: false }.
    const emailResult = await sendOtpEmail({
      to: businessEmail,
      otp,
      companyName: company.name,
    });

    return res.status(200).json(
      successResponse(
        {
          companyId,
          companyName: company.name,
          businessEmail,
          otpExpiresInSeconds: OTP_TTL_SECONDS,
          emailSent: emailResult.sent,
          message: emailResult.sent
            ? `A verification code has been sent to ${businessEmail}. It expires in 10 minutes.`
            : `Verification initiated. Check server logs for OTP (dev mode — email not configured).`,
        },
        "Verification initiated"
      )
    );
  }
);

// ---------------------------------------------------------------------------
// HANDLER: POST /api/companies/claim/verify
// ---------------------------------------------------------------------------

/**
 * Company Claim — Verify (Step 2 of 2).
 *
 * Validates the OTP and creates a CompanyRequest (COMPANY_CLAIM) for admin review.
 *
 * Security flow:
 *  1. Validate companyId and 6-digit OTP.
 *  2. Fetch OTP from Redis.
 *  3. If key missing or expired → 410 Gone.
 *  4. If OTP mismatch → 401 Unauthorized.
 *  5. If match → delete Redis key (OTP is consumed / single-use), create CompanyRequest, notify admins.
 */
export const claimVerifyHandler = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.user.id as string;

    const { companyId, otp } = claimVerifySchema.parse(req.body);

    logger.info(`Claim verify: user=${userId}, company=${companyId}`);

    // --- Load OTP from Redis ---
    const redisKey = buildOtpKey(companyId, userId);
    const storedOtp = await redis.get(redisKey);

    if (!storedOtp) {
      throw new AppError(
        "OTP has expired or was not found. Please initiate a new claim verification.",
        410
      );
    }

    if (storedOtp !== otp) {
      logger.warn(`OTP mismatch for company=${companyId}, user=${userId}.`);
      throw new AppError("Invalid OTP. Please check the code and try again.", 401);
    }

    // --- OTP is valid — consume it immediately (single-use) ---
    await redis.del(redisKey);
    logger.info(`OTP consumed for company=${companyId}, user=${userId}.`);

    // Load company for context
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, verificationStatus: true },
    });

    if (!company) {
      throw new AppError("Company not found", 404);
    }

    // Check for an existing pending claim from this user for this company
    const existingClaim = await prisma.companyRequest.findFirst({
      where: {
        requestedById: userId,
        companyId,
        requestType: "COMPANY_CLAIM",
        status: "PENDING",
      },
      select: { id: true },
    });

    if (existingClaim) {
      throw new AppError(
        `You already have a pending claim request for "${company.name}" (request id: ${existingClaim.id}).`,
        409
      );
    }

    // --- Create CompanyRequest (COMPANY_CLAIM) ---
    const claimRequest = await prisma.companyRequest.create({
      data: {
        requestedById: userId,
        companyId,
        companyName: company.name,
        requestType: "COMPANY_CLAIM",
        status: "PENDING",
        pendingJobData: {}, // Required field — no pending job for a claim request
        businessEmail: req.body.businessEmail || null, // Forward from initiate if included
      },
      select: {
        id: true,
        companyName: true,
        requestType: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info(
      `CompanyRequest (CLAIM) created: id=${claimRequest.id} for company="${company.name}" by user=${userId}.`
    );

    // Notify all super-admins
    const adminIds = await getSuperAdminIds();
    const notificationPromises = adminIds.map((adminId) =>
      createNotification({
        userId: adminId,
        type: NotificationType.SYSTEM,
        actorId: userId,
        title: "Company Claim Request Submitted",
        message: `Company claim request for "${company.name}" (id: ${companyId}) by verified recruiter. Request ID: ${claimRequest.id}`,
        entityType: "company_request",
        entityId: claimRequest.id,
        actionUrl: `/admin/company-requests/${claimRequest.id}`,
      }).catch((err) => {
        logger.warn(`Failed to notify admin ${adminId}: ${err.message}`);
      })
    );
    await Promise.allSettled(notificationPromises);

    logger.info(
      `Notified ${adminIds.length} admin(s) about claim request ${claimRequest.id}.`
    );

    return res.status(201).json(
      successResponse(
        {
          companyRequestId: claimRequest.id,
          companyName: claimRequest.companyName,
          requestType: claimRequest.requestType,
          status: claimRequest.status,
          message:
            "Your company claim has been verified and submitted for admin review. You will be notified once it is processed.",
        },
        "Company claim submitted successfully"
      )
    );
  }
);

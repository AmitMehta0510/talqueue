/**
 * payments.service.ts
 *
 * Core payment operations:
 *  - Razorpay instance singleton
 *  - Order creation (with idempotency key)
 *  - Frontend payment signature verification
 *  - Plan listing helpers
 */

import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { env } from "shared/config/env";
import logger from "shared/logger";
import { PaymentOrderStatus } from "@prisma/client";
import { validateCoupon, recordCouponUsage } from "./coupon.service";

// ---------------------------------------------------------------------------
// Razorpay singleton — lazy-initialised so the server starts even without keys
// ---------------------------------------------------------------------------

let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new AppError(
        "Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        503,
      );
    }
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const getActivePlans = async (targetRole?: string) => {
  return prisma.plan.findMany({
    where: {
      isActive: true,
      ...(targetRole ? { targetRole: { in: [targetRole, "ANY"] } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { priceInPaise: "asc" }],
  });
};

export const getPlanBySlug = async (slug: string) => {
  const plan = await prisma.plan.findUnique({ where: { slug } });
  if (!plan) throw new AppError(`Plan not found: ${slug}`, 404);
  return plan;
};

// ---------------------------------------------------------------------------
// Order creation
// ---------------------------------------------------------------------------

/**
 * Creates a Razorpay order and a local PaymentOrder record.
 *
 * Idempotency: if the user already has an unexpired CREATED order for the same
 * plan, we reuse it instead of creating a duplicate Razorpay order.
 *
 * Coupon: if couponCode is provided, validates and applies the discount before
 * creating the Razorpay order with the discounted amount.
 */
export const createPaymentOrder = async (
  userId: string,
  planSlug: string,
  subscriptionId?: string,
  couponCode?: string,
) => {
  const plan = await getPlanBySlug(planSlug);

  // ── Coupon validation (before idempotency check so reused orders stay clean) ──
  let discountInPaise = 0;
  let finalAmountInPaise = plan.priceInPaise;
  let appliedCouponId: string | undefined;

  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, planSlug, userId, plan.priceInPaise);
    discountInPaise = couponResult.discountInPaise;
    finalAmountInPaise = couponResult.finalAmountInPaise;
    appliedCouponId = couponResult.couponId;
  }

  // Idempotency check — reuse existing pending order (expires in 15 min)
  const existingOrder = await prisma.paymentOrder.findFirst({
    where: {
      userId,
      planId: plan.id,
      status: PaymentOrderStatus.CREATED,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingOrder?.gatewayOrderId) {
    logger.info(
      `Reusing existing PaymentOrder ${existingOrder.id} for user ${userId}`,
    );
    return {
      orderId: existingOrder.gatewayOrderId,
      localOrderId: existingOrder.id,
      amount: existingOrder.amountInPaise,
      currency: existingOrder.currency,
      keyId: env.RAZORPAY_KEY_ID,
      discountInPaise: existingOrder.discountInPaise,
      originalAmountInPaise: plan.priceInPaise,
    };
  }

  // Build idempotency key
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${userId}:${plan.id}:${Date.now()}`)
    .digest("hex");

  // Create Razorpay order with discounted amount
  const razorpay = getRazorpay();
  let gatewayOrder: any;
  try {
    gatewayOrder = await razorpay.orders.create({
      amount: finalAmountInPaise,
      currency: "INR",
      receipt: idempotencyKey.slice(0, 40), // Razorpay: max 40 chars
      notes: {
        userId,
        planSlug: plan.slug,
        planName: plan.name,
        couponCode: couponCode ?? "",
        discountInPaise: String(discountInPaise),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Razorpay order creation failed");
    throw new AppError("Payment gateway error. Please try again.", 502);
  }

  // Persist local record with coupon info
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const localOrder = await prisma.paymentOrder.create({
    data: {
      userId,
      planId: plan.id,
      subscriptionId: subscriptionId ?? null,
      amountInPaise: finalAmountInPaise,
      currency: "INR",
      status: PaymentOrderStatus.CREATED,
      idempotencyKey,
      gatewayOrderId: gatewayOrder.id,
      notes: { planName: plan.name, couponCode },
      expiresAt,
      couponId: appliedCouponId ?? null,
      discountInPaise,
    },
  });

  // Record coupon usage atomically
  if (appliedCouponId) {
    await recordCouponUsage(appliedCouponId, userId, localOrder.id, discountInPaise);
  }

  logger.info(
    `PaymentOrder created: localId=${localOrder.id} gatewayOrderId=${gatewayOrder.id} discount=${discountInPaise}`,
  );

  return {
    orderId: gatewayOrder.id,
    localOrderId: localOrder.id,
    amount: finalAmountInPaise,
    currency: "INR",
    keyId: env.RAZORPAY_KEY_ID,
    discountInPaise,
    originalAmountInPaise: plan.priceInPaise,
  };
};

// ---------------------------------------------------------------------------
// Frontend signature verification (UX confirmation only — source of truth is webhook)
// ---------------------------------------------------------------------------

/**
 * Verifies the HMAC signature from Razorpay checkout success callback.
 * Does NOT activate subscription — that happens in the webhook handler.
 * This just confirms the payment_id is genuine for a good UX response.
 */
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string,
): boolean => {
  if (!env.RAZORPAY_KEY_SECRET) return false;

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(signature, "hex"),
  );
};

// ---------------------------------------------------------------------------
// Order status helpers
// ---------------------------------------------------------------------------

export const getPaymentOrderByGatewayId = (gatewayOrderId: string) =>
  prisma.paymentOrder.findUnique({ where: { gatewayOrderId } });

export const markOrderAttempted = (localOrderId: string) =>
  prisma.paymentOrder.update({
    where: { id: localOrderId },
    data: { status: PaymentOrderStatus.ATTEMPTED },
  });

export const markOrderPaid = (localOrderId: string) =>
  prisma.paymentOrder.update({
    where: { id: localOrderId },
    data: { status: PaymentOrderStatus.PAID },
  });

export const markOrderFailed = (localOrderId: string) =>
  prisma.paymentOrder.update({
    where: { id: localOrderId },
    data: { status: PaymentOrderStatus.FAILED },
  });

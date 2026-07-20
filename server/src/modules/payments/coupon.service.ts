/**
 * coupon.service.ts
 *
 * Coupon code validation and usage recording.
 *
 * Supported discount types:
 *  - PERCENTAGE: reduces price by a percentage (e.g. 20% off)
 *  - FLAT: reduces price by a fixed amount in paise (e.g. ₹500 off)
 *  - FREE_TRIAL: grants extra trial days, final amount becomes 0
 *
 * Validation checks (in order):
 *  1. Code exists and is active
 *  2. Within valid date range (validFrom ≤ now ≤ validUntil)
 *  3. Usage limit not exceeded
 *  4. User hasn't already used this coupon
 *  5. Plan is in applicablePlans (if restricted)
 *  6. User is in applicableUsers (if restricted)
 *  7. Order amount meets minimum threshold
 */

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import logger from "shared/logger";
import { DiscountType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CouponValidationResult {
  couponId: string;
  discountType: DiscountType;
  discountValue: number;
  discountInPaise: number; // Actual amount saved
  finalAmountInPaise: number; // What user pays after discount
  savingsLabel: string; // Human-readable: "Save ₹500" or "20% off"
}

// ---------------------------------------------------------------------------
// Validate a coupon code
// ---------------------------------------------------------------------------

export async function validateCoupon(
  code: string,
  planSlug: string,
  userId: string,
  originalAmountInPaise: number,
): Promise<CouponValidationResult> {
  const upperCode = code.toUpperCase().trim();

  // 1. Fetch coupon
  const coupon = await prisma.couponCode.findUnique({
    where: { code: upperCode },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError("Invalid or inactive coupon code.", 400);
  }

  // 2. Date range check
  const now = new Date();
  if (coupon.validFrom > now) {
    throw new AppError("This coupon is not yet active.", 400);
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    throw new AppError("This coupon has expired.", 400);
  }

  // 3. Usage limit check
  if (coupon.maxUsages !== null && coupon.usedCount >= coupon.maxUsages) {
    throw new AppError("This coupon has reached its maximum usage limit.", 400);
  }

  // 4. Per-user uniqueness check
  const alreadyUsed = await prisma.couponUsage.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId } },
  });
  if (alreadyUsed) {
    throw new AppError("You have already used this coupon.", 400);
  }

  // 5. Plan applicability check
  if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planSlug)) {
    throw new AppError("This coupon is not applicable to the selected plan.", 400);
  }

  // 6. User restriction check
  if (coupon.applicableUsers.length > 0 && !coupon.applicableUsers.includes(userId)) {
    throw new AppError("This coupon is not available for your account.", 400);
  }

  // 7. Minimum order check
  if (coupon.minOrderInPaise !== null && originalAmountInPaise < coupon.minOrderInPaise) {
    const minRupees = (coupon.minOrderInPaise / 100).toLocaleString("en-IN");
    throw new AppError(`This coupon requires a minimum order of ₹${minRupees}.`, 400);
  }

  // ---------------------------------------------------------------------------
  // Calculate discount
  // ---------------------------------------------------------------------------
  let discountInPaise = 0;
  let finalAmountInPaise = originalAmountInPaise;
  let savingsLabel = "";

  if (coupon.discountType === DiscountType.PERCENTAGE) {
    discountInPaise = Math.round((originalAmountInPaise * coupon.discountValue) / 100);
    finalAmountInPaise = Math.max(0, originalAmountInPaise - discountInPaise);
    savingsLabel = `${coupon.discountValue}% off`;
  } else if (coupon.discountType === DiscountType.FLAT) {
    discountInPaise = Math.min(coupon.discountValue, originalAmountInPaise);
    finalAmountInPaise = Math.max(0, originalAmountInPaise - discountInPaise);
    savingsLabel = `Save ₹${(discountInPaise / 100).toLocaleString("en-IN")}`;
  } else if (coupon.discountType === DiscountType.FREE_TRIAL) {
    // Free trial: user pays nothing, gets extra trial days
    discountInPaise = originalAmountInPaise;
    finalAmountInPaise = 0;
    savingsLabel = `${coupon.discountValue}-day free trial`;
  }

  logger.info(
    { code: upperCode, userId, planSlug, discountInPaise, finalAmountInPaise },
    "Coupon validated successfully",
  );

  return {
    couponId: coupon.id,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountInPaise,
    finalAmountInPaise,
    savingsLabel,
  };
}

// ---------------------------------------------------------------------------
// Record coupon usage — called atomically with order creation
// ---------------------------------------------------------------------------

/**
 * Records coupon usage and increments usedCount atomically inside a transaction.
 * Must be called after the PaymentOrder has been persisted.
 */
export async function recordCouponUsage(
  couponId: string,
  userId: string,
  orderId: string,
  discountApplied: number,
): Promise<void> {
  await prisma.$transaction([
    prisma.couponUsage.create({
      data: {
        couponId,
        userId,
        orderId,
        discountApplied,
      },
    }),
    prisma.couponCode.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    }),
  ]);

  logger.info({ couponId, userId, orderId, discountApplied }, "Coupon usage recorded");
}

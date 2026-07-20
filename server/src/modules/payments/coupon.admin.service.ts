/**
 * coupon.admin.service.ts
 *
 * Admin-only CRUD operations for coupon codes.
 * All writes are restricted to platform admins via middleware.
 */

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import { DiscountType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUsages?: number;
  applicablePlans?: string[];   // empty = all plans
  applicableUsers?: string[];   // empty = all users
  minOrderInPaise?: number;
  validFrom?: Date;
  validUntil?: Date;
}

export interface UpdateCouponInput {
  description?: string;
  discountValue?: number;
  maxUsages?: number;
  applicablePlans?: string[];
  applicableUsers?: string[];
  minOrderInPaise?: number;
  isActive?: boolean;
  validUntil?: Date;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function adminListCoupons(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [coupons, total] = await Promise.all([
    prisma.couponCode.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { usages: true } },
      },
    }),
    prisma.couponCode.count(),
  ]);

  return { coupons, total, page, limit };
}

export async function adminGetCoupon(id: string) {
  const coupon = await prisma.couponCode.findUnique({
    where: { id },
    include: {
      usages: {
        include: { user: { select: { id: true, username: true, email: true } } },
        orderBy: { appliedAt: "desc" },
        take: 50,
      },
      _count: { select: { usages: true } },
    },
  });
  if (!coupon) throw new AppError("Coupon not found.", 404);
  return coupon;
}

export async function adminCreateCoupon(data: CreateCouponInput) {
  const upperCode = data.code.toUpperCase().trim();

  // Prevent duplicate codes
  const existing = await prisma.couponCode.findUnique({ where: { code: upperCode } });
  if (existing) throw new AppError(`Coupon code "${upperCode}" already exists.`, 409);

  // Validate discountValue
  if (data.discountType === DiscountType.PERCENTAGE) {
    if (data.discountValue <= 0 || data.discountValue > 100) {
      throw new AppError("Percentage discount must be between 1 and 100.", 400);
    }
  } else if (data.discountType === DiscountType.FLAT) {
    if (data.discountValue <= 0) {
      throw new AppError("Flat discount must be greater than 0 paise.", 400);
    }
  } else if (data.discountType === DiscountType.FREE_TRIAL) {
    if (data.discountValue <= 0) {
      throw new AppError("Free trial days must be greater than 0.", 400);
    }
  }

  return prisma.couponCode.create({
    data: {
      code: upperCode,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxUsages: data.maxUsages ?? null,
      applicablePlans: data.applicablePlans ?? [],
      applicableUsers: data.applicableUsers ?? [],
      minOrderInPaise: data.minOrderInPaise ?? null,
      validFrom: data.validFrom ?? new Date(),
      validUntil: data.validUntil ?? null,
    },
  });
}

export async function adminUpdateCoupon(id: string, data: UpdateCouponInput) {
  await adminGetCoupon(id); // 404 check
  return prisma.couponCode.update({
    where: { id },
    data: {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
      ...(data.maxUsages !== undefined && { maxUsages: data.maxUsages }),
      ...(data.applicablePlans !== undefined && { applicablePlans: data.applicablePlans }),
      ...(data.applicableUsers !== undefined && { applicableUsers: data.applicableUsers }),
      ...(data.minOrderInPaise !== undefined && { minOrderInPaise: data.minOrderInPaise }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.validUntil !== undefined && { validUntil: data.validUntil }),
    },
  });
}

export async function adminToggleCoupon(id: string, isActive: boolean) {
  await adminGetCoupon(id);
  return prisma.couponCode.update({ where: { id }, data: { isActive } });
}

export async function adminDeleteCoupon(id: string) {
  await adminGetCoupon(id);
  // Only allow deletion if no usages exist
  const usageCount = await prisma.couponUsage.count({ where: { couponId: id } });
  if (usageCount > 0) {
    throw new AppError(
      `Cannot delete: coupon has been used ${usageCount} time(s). Deactivate it instead.`,
      400,
    );
  }
  return prisma.couponCode.delete({ where: { id } });
}

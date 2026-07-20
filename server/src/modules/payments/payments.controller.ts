/**
 * payments.controller.ts
 *
 * HTTP handlers for the payments module.
 * All business logic lives in the service layer.
 */

import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import AppError from "shared/errors/AppError";

import {
  getActivePlans,
  getPlanBySlug,
  createPaymentOrder,
  verifyPaymentSignature,
} from "./payments.service";
import {
  getSubscriptionForUser,
  cancelSubscription,
  getActiveSubscription,
} from "./subscription.service";
import { getUserInvoices, getInvoiceById } from "./invoice.service";
import { getAllBalances } from "./credit.service";
import { processWebhookEvent } from "./webhook.handler";
import { validateCoupon } from "./coupon.service";
import {
  adminListCoupons,
  adminGetCoupon,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminToggleCoupon,
  adminDeleteCoupon,
} from "./coupon.admin.service";


// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const listPlansHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const targetRole = Array.isArray(req.query.targetRole)
      ? (req.query.targetRole[0] as string)
      : (req.query.targetRole as string | undefined);
    const plans = await getActivePlans(targetRole);
    res.json(successResponse(plans, "Available plans"));
  },
);

export const getPlanBySlugHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const slug = req.params.slug as string;
    const plan = await getPlanBySlug(slug);
    res.json(successResponse(plan));
  },
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const createOrderHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { planSlug, subscriptionId, couponCode } = req.body as {
      planSlug: string;
      subscriptionId?: string;
      couponCode?: string;
    };

    const result = await createPaymentOrder(
      req.user.id,
      planSlug,
      subscriptionId,
      couponCode,
    );

    res.status(201).json(
      successResponse(result, "Payment order created"),
    );
  },
);

// ---------------------------------------------------------------------------
// Coupon Validation
// ---------------------------------------------------------------------------

export const validateCouponHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { code, planSlug } = req.body as { code: string; planSlug: string };

    if (!code || !planSlug) {
      throw new AppError("code and planSlug are required.", 400);
    }

    // Get plan to determine original amount
    const plan = await getPlanBySlug(planSlug);

    const result = await validateCoupon(code, planSlug, req.user.id, plan.priceInPaise);

    res.json(
      successResponse(
        {
          valid: true,
          discountType: result.discountType,
          discountValue: result.discountValue,
          discountInPaise: result.discountInPaise,
          finalAmountInPaise: result.finalAmountInPaise,
          originalAmountInPaise: plan.priceInPaise,
          savingsLabel: result.savingsLabel,
        },
        "Coupon is valid",
      ),
    );
  },
);

// ---------------------------------------------------------------------------
// Verify (frontend confirmation — NOT the source of truth)
// ---------------------------------------------------------------------------

export const verifyPaymentHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.body as {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
      };

    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isValid) {
      throw new AppError("Payment signature verification failed.", 400);
    }

    // Note: subscription is activated by the webhook, not here.
    // This endpoint is for UX feedback only.
    res.json(
      successResponse(
        { verified: true, paymentId: razorpayPaymentId },
        "Payment verified. Your subscription is being activated.",
      ),
    );
  },
);

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export const getMySubscriptionHandler = asyncHandler(
  async (req: any, res: Response) => {
    const data = await getSubscriptionForUser(req.user.id);
    res.json(successResponse(data));
  },
);

export const cancelMySubscriptionHandler = asyncHandler(
  async (req: any, res: Response) => {
    const active = await getActiveSubscription(req.user.id);
    if (!active) {
      throw new AppError("No active subscription found.", 404);
    }

    const cancelled = await cancelSubscription(active.id);
    res.json(
      successResponse(
        cancelled,
        "Subscription cancelled. You retain access until the current period ends.",
      ),
    );
  },
);

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const listInvoicesHandler = asyncHandler(
  async (req: any, res: Response) => {
    const invoices = await getUserInvoices(req.user.id);
    res.json(successResponse(invoices));
  },
);

export const getInvoiceHandler = asyncHandler(
  async (req: any, res: Response) => {
    const invoice = await getInvoiceById(req.params.id, req.user.id);
    if (!invoice) throw new AppError("Invoice not found.", 404);
    res.json(successResponse(invoice));
  },
);

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export const getMyCreditsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const balances = await getAllBalances(req.user.id);
    res.json(successResponse(balances));
  },
);

// ---------------------------------------------------------------------------
// Webhook (called by Razorpay — raw body required)
// ---------------------------------------------------------------------------

export const razorpayWebhookHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      throw new AppError("Missing X-Razorpay-Signature header", 400);
    }

    // rawBody is set by express.raw() middleware on the webhook route
    const rawBody = (req as any).rawBody as string;
    if (!rawBody) {
      throw new AppError("Missing raw body for webhook verification", 400);
    }

    await processWebhookEvent(rawBody, signature);

    // Always return 200 — Razorpay retries on non-200 responses
    res.status(200).json({ status: "ok" });
  },
);

// ---------------------------------------------------------------------------
// Admin — Coupon CRUD (Platform Admin only — guarded at route level)
// ---------------------------------------------------------------------------

export const adminListCouponsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await adminListCoupons(page, limit);
    res.json(successResponse(data));
  },
);

export const adminGetCouponHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await adminGetCoupon(req.params.id as string);
    res.json(successResponse(coupon));
  },
);


export const adminCreateCouponHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await adminCreateCoupon(req.body);
    res.status(201).json(successResponse(coupon, "Coupon created"));
  },
);

export const adminUpdateCouponHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await adminUpdateCoupon(req.params.id as string, req.body);
    res.json(successResponse(coupon, "Coupon updated"));
  },
);


export const adminToggleCouponHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { isActive } = req.body as { isActive: boolean };
    const coupon = await adminToggleCoupon(req.params.id as string, isActive);
    res.json(successResponse(coupon, `Coupon ${isActive ? "activated" : "deactivated"}`));
  },
);


export const adminDeleteCouponHandler = asyncHandler(
  async (req: Request, res: Response) => {
    await adminDeleteCoupon(req.params.id as string);
    res.json(successResponse(null, "Coupon deleted"));
  },
);


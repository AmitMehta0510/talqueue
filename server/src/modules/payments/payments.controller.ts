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
    const { planSlug, subscriptionId } = req.body as {
      planSlug: string;
      subscriptionId?: string;
    };

    const result = await createPaymentOrder(
      req.user.id,
      planSlug,
      subscriptionId,
    );

    res.status(201).json(
      successResponse(result, "Payment order created"),
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

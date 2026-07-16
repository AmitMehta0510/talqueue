/**
 * subscription.service.ts
 *
 * Manages subscription lifecycle:
 *  - activateSubscription   → called by webhook.handler after payment.captured
 *  - cancelSubscription     → sets cancelAtPeriodEnd=true (LinkedIn-style)
 *  - expireSubscription     → downgrades access (called on subscription.halted)
 *  - getActiveSubscription  → used by requireSubscription middleware
 *  - getSubscriptionForUser → full subscription details for billing page
 *
 * Tier sync:
 *  After activation/expiry, we write CompanyAdmin.tier so existing RESDEX gating
 *  logic (which reads `tier`) continues to work without any changes.
 */

import prisma from "shared/database/prisma";
import logger from "shared/logger";
import { Plan, SubscriptionStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate period end based on billing interval */
function calcPeriodEnd(plan: Plan): Date {
  const now = new Date();
  switch (plan.billingInterval) {
    case "MONTHLY":
      return new Date(now.setMonth(now.getMonth() + 1));
    case "YEARLY":
      return new Date(now.setFullYear(now.getFullYear() + 1));
    case "ONE_TIME":
      // One-time plans grant access for 1 year (e.g. job credit packs)
      return new Date(now.setFullYear(now.getFullYear() + 1));
    default:
      return new Date(now.setMonth(now.getMonth() + 1));
  }
}

/** Sync CompanyAdmin.tier based on whether the plan grants RESDEX premium */
async function syncRecruiterTier(
  userId: string,
  isActive: boolean,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) {
  const features = {} as Record<string, unknown>;
  // Only RECRUITER-targeted plans upgrade the tier
  const admin = await tx.companyAdmin.findFirst({ where: { userId } });
  if (!admin) return;

  const newTier = isActive ? "PREMIUM" : "BASIC";
  if (admin.tier !== newTier) {
    await tx.companyAdmin.updateMany({
      where: { userId },
      data: { tier: newTier as any },
    });
    logger.info(
      { userId, newTier },
      `CompanyAdmin.tier synced to ${newTier}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Activate
// ---------------------------------------------------------------------------

/**
 * Creates or renews a subscription after successful payment.
 * Called exclusively from webhook.handler (inside a DB transaction).
 */
export async function activateSubscription(
  userId: string,
  plan: Plan,
  gatewaySubscriptionId: string | null,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) {
  const now = new Date();
  const periodEnd = calcPeriodEnd(plan);
  const trialEndsAt =
    plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;

  // Check for an existing subscription for this user+plan
  const existing = await tx.subscription.findFirst({
    where: {
      userId,
      planId: plan.id,
      status: { notIn: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED] },
    },
  });

  let subscription;

  if (existing) {
    // Renew: extend the period
    subscription = await tx.subscription.update({
      where: { id: existing.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        ...(gatewaySubscriptionId ? { gatewaySubscriptionId } : {}),
      },
    });
  } else {
    // New subscription
    subscription = await tx.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: trialEndsAt ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
        cancelAtPeriodEnd: false,
        ...(gatewaySubscriptionId ? { gatewaySubscriptionId } : {}),
      },
    });
  }

  // Sync recruiter tier if this is a recruiter plan
  if (plan.targetRole === "RECRUITER" || plan.targetRole === "ANY") {
    await syncRecruiterTier(userId, true, tx);
  }

  return subscription;
}

// ---------------------------------------------------------------------------
// Cancel (LinkedIn-style: access until period end)
// ---------------------------------------------------------------------------

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
      status: SubscriptionStatus.CANCELLED,
    },
    include: { plan: true },
  });

  logger.info(
    { subscriptionId, userId: subscription.userId },
    "Subscription cancelled (access until period end)",
  );

  return subscription;
}

// ---------------------------------------------------------------------------
// Expire (subscription.halted — Razorpay gave up on retries)
// ---------------------------------------------------------------------------

export async function expireSubscription(subscriptionId: string) {
  const subscription = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.EXPIRED,
        cancelledAt: new Date(),
      },
      include: { plan: true },
    });

    // Downgrade recruiter tier
    if (sub.plan.targetRole === "RECRUITER" || sub.plan.targetRole === "ANY") {
      await syncRecruiterTier(sub.userId, false, tx);
    }

    return sub;
  });

  logger.info(
    { subscriptionId, userId: subscription.userId },
    "Subscription EXPIRED — tier downgraded",
  );

  return subscription;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Returns the user's current active subscription (or null). */
export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      currentPeriodEnd: { gte: new Date() },
    },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          slug: true,
          billingInterval: true,
          priceInPaise: true,
          features: true,
          targetRole: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Grace period check — PAST_DUE subs within 3 days are still treated as active. */
export async function isInGracePeriod(userId: string): Promise<boolean> {
  const graceCutoff = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const pastDue = await prisma.subscription.findFirst({
    where: {
      userId,
      status: SubscriptionStatus.PAST_DUE,
      currentPeriodEnd: { gte: new Date(), lte: graceCutoff },
    },
  });
  return Boolean(pastDue);
}

/** Full subscription details for billing page. */
export async function getSubscriptionForUser(userId: string) {
  const [active, history] = await Promise.all([
    getActiveSubscription(userId),
    prisma.subscription.findMany({
      where: { userId, status: { in: [SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED] } },
      include: { plan: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return { active, history };
}

/** Cron-safe: expire all subscriptions whose period has ended. */
export async function expireOverdueSubscriptions() {
  const overdue = await prisma.subscription.findMany({
    where: {
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] },
      currentPeriodEnd: { lt: new Date() },
    },
    select: { id: true },
  });

  for (const sub of overdue) {
    await expireSubscription(sub.id).catch((err) =>
      logger.error({ err, subscriptionId: sub.id }, "Failed to expire subscription"),
    );
  }

  return overdue.length;
}

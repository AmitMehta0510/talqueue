/**
 * seed-plans.ts
 *
 * Seed the Plan table with initial pricing plans.
 * Run: npx ts-node prisma/seed-plans.ts
 *
 * Prices are PLACEHOLDER — update in DB anytime without code redeploy.
 * All prices in PAISE (1 rupee = 100 paise).
 */

/// <reference types="node" />
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  // ── RESDEX Premium (Monthly) ─────────────────────────────────────────────
  {
    name: "RESDEX Premium",
    slug: "resdex-premium",
    description:
      "Unlimited student search, full contact unlock, and campus outreach access.",
    targetRole: "RECRUITER",
    billingInterval: "MONTHLY" as const,
    priceInPaise: 299900, // ₹2,999/month
    trialDays: 14,
    features: {
      resdexSearches: -1,      // -1 = unlimited
      contactUnlocks: -1,
      campusOutreach: true,
      priorityPlacement: false,
    },
    isActive: true,
    sortOrder: 1,
  },

  // ── RESDEX Premium (Yearly) — ~33% savings ───────────────────────────────
  {
    name: "RESDEX Premium (Annual)",
    slug: "resdex-premium-yearly",
    description:
      "Everything in RESDEX Premium at a 33% annual discount. Best value.",
    targetRole: "RECRUITER",
    billingInterval: "YEARLY" as const,
    priceInPaise: 2399900, // ₹23,999/year (₹1,999/month effective)
    trialDays: 14,
    features: {
      resdexSearches: -1,
      contactUnlocks: -1,
      campusOutreach: true,
      priorityPlacement: false,
    },
    isActive: true,
    sortOrder: 2,
  },

  // ── Job Credits — 10 Pack ─────────────────────────────────────────────────
  {
    name: "Job Credits — 10 Pack",
    slug: "job-credits-10",
    description:
      "Post up to 10 jobs on the platform. Credits never expire.",
    targetRole: "ANY",
    billingInterval: "ONE_TIME" as const,
    priceInPaise: 49900, // ₹499 one-time
    trialDays: 0,
    features: {
      jobPosts: 10,
    },
    isActive: true,
    sortOrder: 3,
  },

  // ── Job Credits — 50 Pack ─────────────────────────────────────────────────
  {
    name: "Job Credits — 50 Pack",
    slug: "job-credits-50",
    description:
      "Post up to 50 jobs. Bulk discount. Best for high-volume hiring.",
    targetRole: "ANY",
    billingInterval: "ONE_TIME" as const,
    priceInPaise: 199900, // ₹1,999 one-time
    trialDays: 0,
    features: {
      jobPosts: 50,
    },
    isActive: true,
    sortOrder: 4,
  },

  // ── College Institutional ─────────────────────────────────────────────────
  {
    name: "College Institutional",
    slug: "college-institutional",
    description:
      "Full platform access for TPO teams. Unlimited students, priority support, white-label reports.",
    targetRole: "COLLEGE",
    billingInterval: "YEARLY" as const,
    priceInPaise: 4999900, // ₹49,999/year
    trialDays: 30,
    features: {
      unlimitedStudents: true,
      prioritySupport: true,
      whitelabelReports: true,
      cdcrAccess: true,
    },
    isActive: false, // Not active yet — enable when college billing is ready
    sortOrder: 5,
  },
];

async function seedPlans() {
  console.log("🌱 Seeding payment plans...");

  for (const plan of plans) {
    const result = await (prisma as any).plan.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        priceInPaise: plan.priceInPaise,
        trialDays: plan.trialDays,
        features: plan.features,
        sortOrder: plan.sortOrder,
        // isActive intentionally NOT updated — preserve manual overrides
      },
    });
    console.log(`  ✓ ${result.name} (${result.slug}) — ₹${result.priceInPaise / 100}`);
  }

  console.log(`\n✅ ${plans.length} plans seeded successfully.`);
  console.log("💡 Tip: Update prices directly in the DB — no code redeploy needed.");
}

seedPlans()
  .catch((err) => {
    console.error("❌ Plan seeding failed:", err);
    (process as any).exit(1);
  })
  .finally(() => prisma.$disconnect());

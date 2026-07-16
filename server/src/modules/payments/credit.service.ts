/**
 * credit.service.ts
 *
 * Append-only credit ledger for feature-based credits (job postings, RESDEX unlocks, etc.)
 *
 * Rules:
 *  - NEVER update or delete ledger rows (immutable audit trail)
 *  - Use getBalance() which sums all deltas for a user+creditType (source of truth)
 *  - runningBalance is a snapshot — useful for display but NOT authoritative
 *
 * Credit types:
 *  JOB_POST       → 1 debit per job posting
 *  RESDEX_UNLOCK  → 1 debit per contact detail unlock
 *  INVITE_SEND    → 1 debit per recruiter invite sent (if credit-gated)
 */

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

export type CreditType = "JOB_POST" | "RESDEX_UNLOCK" | "INVITE_SEND";

// ---------------------------------------------------------------------------
// Get balance (always from SUM — never trust snapshot)
// ---------------------------------------------------------------------------

export async function getBalance(
  userId: string,
  creditType: CreditType,
): Promise<number> {
  const result = await prisma.creditLedger.aggregate({
    where: { userId, creditType },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

export async function getAllBalances(userId: string) {
  const types: CreditType[] = ["JOB_POST", "RESDEX_UNLOCK", "INVITE_SEND"];
  const balances = await Promise.all(
    types.map(async (creditType) => ({
      creditType,
      balance: await getBalance(userId, creditType),
    })),
  );
  return Object.fromEntries(balances.map(({ creditType, balance }) => [creditType, balance]));
}

// ---------------------------------------------------------------------------
// Credit (add credits)
// ---------------------------------------------------------------------------

export async function creditUser(params: {
  userId: string;
  creditType: CreditType;
  amount: number;
  reason: string;
  transactionId?: string;
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
}) {
  const { userId, creditType, amount, reason, transactionId, tx } = params;
  const client = tx ?? prisma;

  const currentBalance = await getBalance(userId, creditType);

  return (client as typeof prisma).creditLedger.create({
    data: {
      userId,
      creditType,
      delta: Math.abs(amount), // always positive for credits
      runningBalance: currentBalance + Math.abs(amount),
      reason,
      transactionId: transactionId ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Debit (consume a credit)
// ---------------------------------------------------------------------------

export async function debitUser(params: {
  userId: string;
  creditType: CreditType;
  reason: string;
  referenceId?: string;
}) {
  const { userId, creditType, reason, referenceId } = params;

  return prisma.$transaction(async (tx) => {
    const balance = await getBalance(userId, creditType);

    if (balance < 1) {
      throw new AppError(
        `Insufficient ${creditType.replace("_", " ").toLowerCase()} credits. Please purchase more.`,
        402,
      );
    }

    return tx.creditLedger.create({
      data: {
        userId,
        creditType,
        delta: -1,
        runningBalance: balance - 1,
        reason,
        referenceId: referenceId ?? null,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function getCreditHistory(
  userId: string,
  creditType?: CreditType,
  limit = 20,
) {
  return prisma.creditLedger.findMany({
    where: {
      userId,
      ...(creditType ? { creditType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

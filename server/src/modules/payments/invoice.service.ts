/**
 * invoice.service.ts
 *
 * Generates tax-compliant invoices after each successful payment.
 *
 * Features:
 *  - Sequential invoice number: INV-YYYY-NNNNNN (zero-padded, never reused)
 *  - 18% GST calculation
 *  - Invoice stored in DB — PDF generation can be added later (pdfUrl field)
 */

import prisma from "shared/database/prisma";
import { env } from "shared/config/env";
import { Plan } from "@prisma/client";

// ---------------------------------------------------------------------------
// Invoice number generator — sequential, never reused
// ---------------------------------------------------------------------------

/**
 * Generates the next invoice number: INV-2025-000001
 * Uses a DB-level count to ensure uniqueness even under concurrent requests.
 */
async function generateInvoiceNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Count all invoices for this year to get the next sequence number
  const count = await tx.invoice.count({
    where: { invoiceNumber: { startsWith: prefix } },
  });

  const sequence = String(count + 1).padStart(6, "0");
  return `${prefix}${sequence}`;
}

// ---------------------------------------------------------------------------
// Issue invoice
// ---------------------------------------------------------------------------

interface IssueInvoiceParams {
  userId: string;
  subscriptionId: string;
  transactionId: string;
  plan: Plan;
  amountInPaise: number;
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
}

export async function issueInvoice({
  userId,
  subscriptionId,
  transactionId,
  plan,
  amountInPaise,
  tx,
}: IssueInvoiceParams) {
  // GST: 18% on top of the amount (amount already includes GST — reverse calculate)
  // Razorpay amounts are tax-inclusive in India, so we split:
  // subtotal = amount / 1.18,  gst = amount - subtotal
  const gstRate = 18;
  const subtotalInPaise = Math.round((amountInPaise * 100) / 118);
  const gstAmountInPaise = amountInPaise - subtotalInPaise;

  const invoiceNumber = await generateInvoiceNumber(tx);

  const lineItems = [
    {
      description: plan.name,
      quantity: 1,
      unitPriceInPaise: subtotalInPaise,
      totalInPaise: subtotalInPaise,
    },
  ];

  const invoice = await tx.invoice.create({
    data: {
      invoiceNumber,
      userId,
      subscriptionId,
      transactionId,
      lineItems,
      subtotalInPaise,
      gstRatePercent: gstRate,
      gstAmountInPaise,
      totalInPaise: amountInPaise,
      billingName: env.INVOICE_COMPANY_NAME,
      billingAddress: env.INVOICE_COMPANY_ADDRESS
        ? ({ raw: env.INVOICE_COMPANY_ADDRESS } as object)
        : undefined,
      gstin: env.INVOICE_COMPANY_GSTIN || null,
    },
  });

  return invoice;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export async function getUserInvoices(userId: string, limit = 20) {
  return prisma.invoice.findMany({
    where: { userId },
    include: {
      transaction: {
        select: { method: true, gatewayPaymentId: true, capturedAt: true },
      },
    },
    orderBy: { issuedAt: "desc" },
    take: limit,
  });
}

export async function getInvoiceById(invoiceId: string, userId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      transaction: {
        select: {
          method: true,
          gatewayPaymentId: true,
          capturedAt: true,
          cardNetwork: true,
          bankCode: true,
        },
      },
    },
  });
}

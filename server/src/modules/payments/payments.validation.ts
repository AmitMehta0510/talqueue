import { z } from "zod";

export const createOrderSchema = z.object({
  body: z.object({
    planSlug: z.string().min(1),
    subscriptionId: z.string().uuid().optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
});

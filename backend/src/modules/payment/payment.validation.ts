import { z } from 'zod';

export const paymentIdSchema = z.object({
  id: z.string().uuid(),
});

export const createPaymentSchema = z.object({
  rideId: z.string().uuid(),
  amountCents: z.number().int().min(0),
  currency: z.string().default('INR'),
  provider: z.string().default('manual'),
  paymentMethod: z
    .enum(['cash', 'card', 'upi', 'wallet'])
    .default('cash'),
});

export const capturePaymentSchema = z.object({
  providerPaymentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const refundPaymentSchema = z.object({
  amountCents: z.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
});

export const createPayoutSchema = z.object({
  driverId: z.string().uuid(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});



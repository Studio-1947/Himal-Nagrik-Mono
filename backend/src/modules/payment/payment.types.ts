import type { z } from 'zod';
import type {
  createPaymentSchema,
  capturePaymentSchema,
  refundPaymentSchema,
  paymentIdSchema,
} from './payment.validation';

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type PaymentIdParams = z.infer<typeof paymentIdSchema>;

export interface PaymentRecord {
  id: string;
  rideId: string;
  passengerId: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
  provider: string;
  providerPaymentId: string | null;
  capturedAt: Date | null;
  refundedAmountCents: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentResponse {
  id: string;
  rideId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  capturedAt?: string;
}

export interface PayoutRecord {
  id: string;
  driverId: string;
  amountCents: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, unknown> | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutResponse {
  id: string;
  driverId: string;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  processedAt?: string;
  createdAt: string;
}

export interface PaymentSummary {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  currency: string;
}




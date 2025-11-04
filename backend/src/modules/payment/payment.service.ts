import { publishRealtimeEvent } from '../../infra/realtime';
import type { DbUser } from '../auth/auth.types';
import { tripRepository } from '../trip/trip.repository';
import { paymentRepository } from './payment.repository';
import type {
  CreatePaymentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  PaymentResponse,
  PayoutResponse,
  PaymentSummary,
} from './payment.types';

class PaymentError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'PaymentError';
  }
}

const PLATFORM_COMMISSION_PERCENT = 15; // Platform takes 15% commission

const mapPaymentToResponse = (payment: any): PaymentResponse => ({
  id: payment.id,
  rideId: payment.rideId,
  amount: payment.amountCents / 100,
  currency: payment.currency,
  status: payment.status,
  provider: payment.provider,
  createdAt: payment.createdAt.toISOString(),
  capturedAt: payment.capturedAt?.toISOString(),
});

const mapPayoutToResponse = (payout: any): PayoutResponse => ({
  id: payout.id,
  driverId: payout.driverId,
  amount: payout.amountCents / 100,
  currency: payout.currency,
  periodStart: payout.periodStart.toISOString(),
  periodEnd: payout.periodEnd.toISOString(),
  status: payout.status,
  processedAt: payout.processedAt?.toISOString(),
  createdAt: payout.createdAt.toISOString(),
});

export const paymentService = {
  async createPayment(
    passengerId: string,
    input: CreatePaymentInput,
  ): Promise<PaymentResponse> {
    // Verify ride exists and belongs to passenger
    const ride = await tripRepository.getRideById(input.rideId);
    if (!ride) {
      throw new PaymentError('Ride not found', 404);
    }

    if (ride.passengerId !== passengerId) {
      throw new PaymentError('You are not authorized for this ride', 403);
    }

    if (ride.status !== 'completed') {
      throw new PaymentError('Ride must be completed before payment', 409);
    }

    // Check if payment already exists
    const existing = await paymentRepository.getPaymentByRideId(input.rideId);
    if (existing) {
      throw new PaymentError('Payment already exists for this ride', 409);
    }

    const payment = await paymentRepository.createPayment({
      rideId: input.rideId,
      passengerId,
      amountCents: input.amountCents,
      currency: input.currency,
      provider: input.provider,
      metadata: {
        paymentMethod: input.paymentMethod,
      },
    });

    publishRealtimeEvent(`passenger:${passengerId}`, 'payment.created', {
      paymentId: payment.id,
      rideId: input.rideId,
    });

    return mapPaymentToResponse(payment);
  },

  async capturePayment(
    paymentId: string,
    input: CapturePaymentInput,
  ): Promise<PaymentResponse> {
    const payment = await paymentRepository.getPaymentById(paymentId);
    if (!payment) {
      throw new PaymentError('Payment not found', 404);
    }

    if (payment.status === 'captured') {
      throw new PaymentError('Payment already captured', 409);
    }

    if (payment.status === 'refunded') {
      throw new PaymentError('Cannot capture refunded payment', 409);
    }

    const updated = await paymentRepository.updatePayment(paymentId, {
      status: 'captured',
      capturedAt: new Date(),
      providerPaymentId: input.providerPaymentId,
      metadata: {
        ...(payment.metadata as Record<string, unknown>),
        ...input.metadata,
      },
    });

    if (!updated) {
      throw new PaymentError('Failed to capture payment', 500);
    }

    publishRealtimeEvent(`passenger:${payment.passengerId}`, 'payment.captured', {
      paymentId: payment.id,
      rideId: payment.rideId,
    });

    return mapPaymentToResponse(updated);
  },

  async refundPayment(
    paymentId: string,
    input: RefundPaymentInput,
  ): Promise<PaymentResponse> {
    const payment = await paymentRepository.getPaymentById(paymentId);
    if (!payment) {
      throw new PaymentError('Payment not found', 404);
    }

    if (payment.status !== 'captured') {
      throw new PaymentError('Can only refund captured payments', 409);
    }

    const refundAmount = input.amountCents || payment.amountCents;
    if (refundAmount > payment.amountCents) {
      throw new PaymentError('Refund amount exceeds payment amount', 400);
    }

    const updated = await paymentRepository.updatePayment(paymentId, {
      status: 'refunded',
      refundedAmountCents: refundAmount,
      metadata: {
        ...(payment.metadata as Record<string, unknown>),
        refundReason: input.reason,
        refundedAt: new Date().toISOString(),
      },
    });

    if (!updated) {
      throw new PaymentError('Failed to process refund', 500);
    }

    publishRealtimeEvent(`passenger:${payment.passengerId}`, 'payment.refunded', {
      paymentId: payment.id,
      rideId: payment.rideId,
      amount: refundAmount / 100,
    });

    return mapPaymentToResponse(updated);
  },

  async getPayment(paymentId: string, user: DbUser): Promise<PaymentResponse> {
    const payment = await paymentRepository.getPaymentById(paymentId);
    if (!payment) {
      throw new PaymentError('Payment not found', 404);
    }

    // Check access permission
    if (user.role === 'passenger' && payment.passengerId !== user.id) {
      throw new PaymentError('You do not have access to this payment', 403);
    }

    // For drivers, check if they were the driver for this ride
    if (user.role === 'driver') {
      const ride = await tripRepository.getRideById(payment.rideId);
      if (!ride || ride.driverId !== user.id) {
        throw new PaymentError('You do not have access to this payment', 403);
      }
    }

    return mapPaymentToResponse(payment);
  },

  async getPaymentHistory(user: DbUser, limit = 20) {
    if (user.role !== 'passenger') {
      throw new PaymentError('Only passengers can view payment history', 403);
    }

    const payments = await paymentRepository.getPaymentsByPassenger(
      user.id,
      limit,
    );
    return payments.map(mapPaymentToResponse);
  },

  async createPayout(
    driverId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<PayoutResponse> {
    // Calculate driver earnings for the period
    const { totalEarningsCents, rideCount } =
      await paymentRepository.getDriverEarnings(driverId, periodStart, periodEnd);

    if (totalEarningsCents === 0) {
      throw new PaymentError('No earnings found for this period', 404);
    }

    // Calculate payout amount after platform commission
    const commission = Math.floor(
      (totalEarningsCents * PLATFORM_COMMISSION_PERCENT) / 100,
    );
    const payoutAmount = totalEarningsCents - commission;

    const payout = await paymentRepository.createPayout({
      driverId,
      amountCents: payoutAmount,
      currency: 'INR',
      periodStart,
      periodEnd,
      metadata: {
        rideCount,
        totalEarnings: totalEarningsCents / 100,
        commission: commission / 100,
        commissionPercent: PLATFORM_COMMISSION_PERCENT,
      },
    });

    publishRealtimeEvent(`driver:${driverId}`, 'payout.created', {
      payoutId: payout.id,
      amount: payoutAmount / 100,
    });

    return mapPayoutToResponse(payout);
  },

  async processPayout(payoutId: string): Promise<PayoutResponse> {
    const payout = await paymentRepository.getPayoutById(payoutId);
    if (!payout) {
      throw new PaymentError('Payout not found', 404);
    }

    if (payout.status !== 'pending') {
      throw new PaymentError('Payout already processed', 409);
    }

    // Update to processing status
    await paymentRepository.updatePayout(payoutId, {
      status: 'processing',
    });

    // Simulate payment processing (in real app, integrate with payment gateway)
    // For now, mark as completed immediately
    const updated = await paymentRepository.updatePayout(payoutId, {
      status: 'completed',
      processedAt: new Date(),
    });

    if (!updated) {
      throw new PaymentError('Failed to process payout', 500);
    }

    publishRealtimeEvent(`driver:${payout.driverId}`, 'payout.completed', {
      payoutId: payout.id,
      amount: payout.amountCents / 100,
    });

    return mapPayoutToResponse(updated);
  },

  async getPayoutHistory(driverId: string, limit = 20) {
    const payouts = await paymentRepository.getPayoutsByDriver(driverId, limit);
    return payouts.map(mapPayoutToResponse);
  },

  async getDriverPaymentSummary(driverId: string): Promise<PaymentSummary> {
    const payouts = await paymentRepository.getPayoutsByDriver(driverId, 100);

    let totalEarnings = 0;
    let pendingPayouts = 0;
    let completedPayouts = 0;

    for (const payout of payouts) {
      const amount = payout.amountCents / 100;
      totalEarnings += amount;

      if (payout.status === 'completed') {
        completedPayouts += amount;
      } else if (payout.status === 'pending' || payout.status === 'processing') {
        pendingPayouts += amount;
      }
    }

    return {
      totalEarnings,
      pendingPayouts,
      completedPayouts,
      currency: 'INR',
    };
  },
};

export { PaymentError };







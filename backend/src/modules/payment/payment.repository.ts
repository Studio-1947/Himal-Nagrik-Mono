import { randomUUID } from 'node:crypto';
import { and, between, eq, gte, lte } from 'drizzle-orm';
import { db } from '../../infra/database';
import { payments, payouts, rides } from '../../infra/database/schema/users';

export const paymentRepository = {
  async createPayment(data: {
    rideId: string;
    passengerId: string;
    amountCents: number;
    currency: string;
    provider: string;
    metadata?: Record<string, unknown>;
  }) {
    const [payment] = await db
      .insert(payments)
      .values({
        id: randomUUID(),
        rideId: data.rideId,
        passengerId: data.passengerId,
        amountCents: data.amountCents,
        currency: data.currency,
        status: 'pending',
        provider: data.provider,
        metadata: data.metadata || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return payment;
  },

  async getPaymentById(paymentId: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId));
    return payment;
  },

  async getPaymentByRideId(rideId: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.rideId, rideId));
    return payment;
  },

  async updatePayment(
    paymentId: string,
    updates: {
      status?: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
      providerPaymentId?: string;
      capturedAt?: Date;
      refundedAmountCents?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const [updated] = await db
      .update(payments)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();
    return updated;
  },

  async getPaymentsByPassenger(passengerId: string, limit = 20) {
    return db
      .select()
      .from(payments)
      .where(eq(payments.passengerId, passengerId))
      .orderBy(payments.createdAt)
      .limit(limit);
  },

  async createPayout(data: {
    driverId: string;
    amountCents: number;
    currency: string;
    periodStart: Date;
    periodEnd: Date;
    metadata?: Record<string, unknown>;
  }) {
    const [payout] = await db
      .insert(payouts)
      .values({
        id: randomUUID(),
        driverId: data.driverId,
        amountCents: data.amountCents,
        currency: data.currency,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        status: 'pending',
        metadata: data.metadata || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return payout;
  },

  async getPayoutById(payoutId: string) {
    const [payout] = await db
      .select()
      .from(payouts)
      .where(eq(payouts.id, payoutId));
    return payout;
  },

  async getPayoutsByDriver(driverId: string, limit = 20) {
    return db
      .select()
      .from(payouts)
      .where(eq(payouts.driverId, driverId))
      .orderBy(payouts.createdAt)
      .limit(limit);
  },

  async updatePayout(
    payoutId: string,
    updates: {
      status?: 'pending' | 'processing' | 'completed' | 'failed';
      processedAt?: Date;
      metadata?: Record<string, unknown>;
    },
  ) {
    const [updated] = await db
      .update(payouts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId))
      .returning();
    return updated;
  },

  async getDriverEarnings(
    driverId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const completedRides = await db
      .select({
        id: rides.id,
        fareActual: rides.fareActual,
        completedAt: rides.completedAt,
      })
      .from(rides)
      .where(
        and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'completed'),
          gte(rides.completedAt, periodStart),
          lte(rides.completedAt, periodEnd),
        ),
      );

    let totalEarningsCents = 0;
    for (const ride of completedRides) {
      const fareActual = ride.fareActual as { amount?: number } | null;
      if (fareActual?.amount) {
        totalEarningsCents += fareActual.amount * 100; // Convert to cents
      }
    }

    return {
      totalEarningsCents,
      rideCount: completedRides.length,
    };
  },
};






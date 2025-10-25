import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { database } from '../../infra/database';
import { rides } from '../../infra/database/schema';
import type {
  BookingRecord,
  CreateBookingInput,
  FareQuote,
  LocationPoint,
  UpdateBookingInput,
} from './booking.types';

const serializeLocation = (location: LocationPoint): Record<string, unknown> =>
  JSON.parse(JSON.stringify(location)) as Record<string, unknown>;

export const bookingRepository = {
  async createBooking(
    passengerId: string,
    payload: CreateBookingInput,
    fareQuote?: FareQuote,
  ): Promise<BookingRecord> {
    const now = new Date();
    const [record] = await database.db
      .insert(rides)
      .values({
        id: randomUUID(),
        passengerId,
        status: 'requested',
        pickupLocation: serializeLocation(payload.pickup),
        dropoffLocation: serializeLocation(payload.dropoff),
        requestedAt: now,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        fareQuote: fareQuote ? JSON.parse(JSON.stringify(fareQuote)) : null,
        metadata: JSON.parse(
          JSON.stringify({
            vehicleType: payload.vehicleType,
            notes: payload.notes,
            paymentMethod: payload.paymentMethod ?? 'cash',
          }),
        ),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return record;
  },

  async getBookingById(id: string): Promise<BookingRecord | null> {
    const [record] = await database.db
      .select()
      .from(rides)
      .where(eq(rides.id, id))
      .limit(1);
    return record ?? null;
  },

  async updateBooking(
    id: string,
    updates: UpdateBookingInput,
  ): Promise<BookingRecord | null> {
    const payload: Partial<typeof rides.$inferInsert> = {
      ...updates,
      metadata:
        updates.metadata !== undefined
          ? JSON.parse(JSON.stringify(updates.metadata))
          : undefined,
      updatedAt: new Date(),
    };

    const [record] = await database.db
      .update(rides)
      .set(payload)
      .where(eq(rides.id, id))
      .returning();

    return record ?? null;
  },
};

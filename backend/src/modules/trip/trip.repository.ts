import { eq, and, or } from 'drizzle-orm';
import { database } from '../../infra/database';
import { rides } from '../../infra/database/schema/users';
import type { TripRecord, LocationPoint } from './trip.types';

const db = database.db;

export const tripRepository = {
  async getRideById(rideId: string) {
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
    return ride;
  },

  async updateRideStatus(
    rideId: string,
    updates: {
      status?:
      | 'enroute_pickup'
      | 'passenger_onboard'
      | 'completed'
      | 'cancelled_driver'
      | 'cancelled_passenger';
      arrivedAt?: Date;
      startedAt?: Date;
      completedAt?: Date;
      distanceMeters?: number;
      fareActual?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    },
  ) {
    const [updated] = await db
      .update(rides)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(rides.id, rideId))
      .returning();
    return updated;
  },

  async getActiveRidesByDriver(driverId: string) {
    return db
      .select()
      .from(rides)
      .where(
        and(
          eq(rides.driverId, driverId),
          or(
            eq(rides.status, 'enroute_pickup'),
            eq(rides.status, 'passenger_onboard'),
          ),
        ),
      );
  },

  async getActiveRidesByPassenger(passengerId: string) {
    return db
      .select()
      .from(rides)
      .where(
        and(
          eq(rides.passengerId, passengerId),
          or(
            eq(rides.status, 'enroute_pickup'),
            eq(rides.status, 'passenger_onboard'),
          ),
        ),
      );
  },

  async getRideHistory(userId: string, role: 'passenger' | 'driver', limit = 20) {
    const column = role === 'passenger' ? rides.passengerId : rides.driverId;
    return db
      .select()
      .from(rides)
      .where(eq(column, userId))
      .orderBy(rides.createdAt)
      .limit(limit);
  },
};











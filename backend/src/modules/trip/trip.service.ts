import { getRedisClient } from '../../infra/cache';
import { publishRealtimeEvent } from '../../infra/realtime';
import type { DbUser } from '../auth/auth.types';
import { tripRepository } from './trip.repository';
import type {
  StartTripInput,
  UpdateTripLocationInput,
  CompleteTripInput,
  TripResponse,
  TripLocation,
  LocationPoint,
  ActiveTripSummary,
} from './trip.types';

class TripError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'TripError';
  }
}

const TRIP_LOCATION_KEY = (rideId: string) => `trip:${rideId}:location`;
const TRIP_HISTORY_KEY = (rideId: string) => `trip:${rideId}:history`;
const ACTIVE_TRIPS_KEY = 'trips:active';

const haversineDistance = (from: LocationPoint, to: LocationPoint): number => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

export const tripService = {
  async startTrip(
    driverId: string,
    input: StartTripInput,
  ): Promise<TripResponse> {
    const ride = await tripRepository.getRideById(input.rideId);
    if (!ride) {
      throw new TripError('Ride not found', 404);
    }

    if (ride.driverId !== driverId) {
      throw new TripError('You are not assigned to this ride', 403);
    }

    if (ride.status !== 'driver_assigned' && ride.status !== 'enroute_pickup') {
      throw new TripError('Cannot start trip from current status', 409);
    }

    const newStatus =
      ride.status === 'driver_assigned' ? 'enroute_pickup' : 'passenger_onboard';
    const updates: Parameters<typeof tripRepository.updateRideStatus>[1] = {
      status: newStatus,
    };

    if (newStatus === 'enroute_pickup') {
      updates.arrivedAt = new Date();
    } else if (newStatus === 'passenger_onboard') {
      updates.startedAt = new Date();
    }

    const updated = await tripRepository.updateRideStatus(ride.id, updates);

    // Store initial location in Redis if provided
    if (input.location) {
      const redis = getRedisClient();
      if (redis) {
        await redis.set(
          TRIP_LOCATION_KEY(ride.id),
          JSON.stringify(input.location),
          { EX: 3600 }, // 1 hour expiry
        );

        const locationHistory: TripLocation = {
          location: input.location,
          timestamp: new Date().toISOString(),
        };
        await redis.lPush(
          TRIP_HISTORY_KEY(ride.id),
          JSON.stringify(locationHistory),
        );
        await redis.expire(TRIP_HISTORY_KEY(ride.id), 86400); // 24 hours
        await redis.sAdd(ACTIVE_TRIPS_KEY, ride.id);
      }
    }

    // Broadcast real-time event
    publishRealtimeEvent(`ride:${ride.id}`, 'trip.started', {
      rideId: ride.id,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });

    publishRealtimeEvent(`passenger:${ride.passengerId}`, 'trip.started', {
      rideId: ride.id,
      status: newStatus,
    });

    return {
      rideId: updated.id,
      status: updated.status,
      startedAt: updated.startedAt?.toISOString(),
      arrivedAt: updated.arrivedAt?.toISOString(),
    };
  },

  async updateLocation(
    driverId: string,
    rideId: string,
    input: UpdateTripLocationInput,
  ): Promise<void> {
    const ride = await tripRepository.getRideById(rideId);
    if (!ride) {
      throw new TripError('Ride not found', 404);
    }

    if (ride.driverId !== driverId) {
      throw new TripError('You are not assigned to this ride', 403);
    }

    if (
      ride.status !== 'enroute_pickup' &&
      ride.status !== 'passenger_onboard'
    ) {
      throw new TripError('Trip is not active', 409);
    }

    const redis = getRedisClient();
    if (redis) {
      // Update current location
      await redis.set(
        TRIP_LOCATION_KEY(rideId),
        JSON.stringify(input.location),
        { EX: 3600 },
      );

      // Add to location history
      const locationHistory: TripLocation = {
        location: input.location,
        timestamp: new Date().toISOString(),
        speed: input.speed,
        heading: input.heading,
      };
      await redis.lPush(TRIP_HISTORY_KEY(rideId), JSON.stringify(locationHistory));
      await redis.lTrim(TRIP_HISTORY_KEY(rideId), 0, 999); // Keep last 1000 locations
    }

    // Broadcast real-time location update
    publishRealtimeEvent(`ride:${rideId}`, 'trip.location_update', {
      rideId,
      location: input.location,
      speed: input.speed,
      heading: input.heading,
      timestamp: new Date().toISOString(),
    });

    publishRealtimeEvent(`passenger:${ride.passengerId}`, 'trip.location_update', {
      rideId,
      location: input.location,
      timestamp: new Date().toISOString(),
    });
  },

  async completeTrip(
    driverId: string,
    rideId: string,
    input: CompleteTripInput,
  ): Promise<TripResponse> {
    const ride = await tripRepository.getRideById(rideId);
    if (!ride) {
      throw new TripError('Ride not found', 404);
    }

    if (ride.driverId !== driverId) {
      throw new TripError('You are not assigned to this ride', 403);
    }

    if (ride.status !== 'passenger_onboard') {
      throw new TripError('Trip is not in progress', 409);
    }

    // Calculate distance traveled if we have location history
    let distanceTraveled = ride.distanceMeters;
    const redis = getRedisClient();
    if (redis && !distanceTraveled) {
      const historyJson = await redis.lRange(TRIP_HISTORY_KEY(rideId), 0, -1);
      if (historyJson.length > 1) {
        const locations = historyJson.map((json) =>
          JSON.parse(json),
        ) as TripLocation[];
        let totalDistance = 0;
        for (let i = 1; i < locations.length; i++) {
          totalDistance += haversineDistance(
            locations[i - 1].location,
            locations[i].location,
          );
        }
        distanceTraveled = Math.round(totalDistance);
      }
    }

    const fareActual = input.finalFare
      ? {
          currency: 'INR',
          amount: input.finalFare,
        }
      : ride.fareQuote;

    const updated = await tripRepository.updateRideStatus(rideId, {
      status: 'completed',
      completedAt: new Date(),
      distanceMeters: distanceTraveled,
      fareActual: fareActual as Record<string, unknown>,
      metadata: {
        ...(ride.metadata as Record<string, unknown>),
        completionNotes: input.notes,
      },
    });

    // Clean up Redis data
    if (redis) {
      await redis.del(TRIP_LOCATION_KEY(rideId));
      await redis.sRem(ACTIVE_TRIPS_KEY, rideId);
      // Keep history for 24 hours for review
    }

    // Broadcast completion
    publishRealtimeEvent(`ride:${rideId}`, 'trip.completed', {
      rideId,
      completedAt: updated.completedAt?.toISOString(),
      distanceTraveled,
      fare: fareActual,
    });

    publishRealtimeEvent(`passenger:${ride.passengerId}`, 'trip.completed', {
      rideId,
      completedAt: updated.completedAt?.toISOString(),
      fare: fareActual,
    });

    return {
      rideId: updated.id,
      status: updated.status,
      startedAt: updated.startedAt?.toISOString(),
      completedAt: updated.completedAt?.toISOString(),
      distanceTraveled,
      actualFare: (fareActual as { amount?: number })?.amount,
    };
  },

  async getCurrentTrip(user: DbUser): Promise<ActiveTripSummary | null> {
    const rides =
      user.role === 'driver'
        ? await tripRepository.getActiveRidesByDriver(user.id)
        : await tripRepository.getActiveRidesByPassenger(user.id);

    if (rides.length === 0) {
      return null;
    }

    const ride = rides[0]; // Get most recent active ride
    
    // Get current location from Redis
    let currentLocation: LocationPoint | undefined;
    const redis = getRedisClient();
    if (redis) {
      const locationJson = await redis.get(TRIP_LOCATION_KEY(ride.id));
      if (locationJson) {
        currentLocation = JSON.parse(locationJson) as LocationPoint;
      }
    }

    const pickupLocation = ride.pickupLocation as LocationPoint;
    const dropoffLocation = ride.dropoffLocation as LocationPoint;

    return {
      rideId: ride.id,
      passengerId: ride.passengerId,
      driverId: ride.driverId || '',
      status: ride.status,
      currentLocation,
      pickupLocation,
      dropoffLocation,
      startedAt: ride.startedAt?.toISOString(),
    };
  },

  async getTripHistory(user: DbUser, limit = 20) {
    const rides = await tripRepository.getRideHistory(user.id, user.role, limit);
    return rides.map((ride) => ({
      rideId: ride.id,
      status: ride.status,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      requestedAt: ride.requestedAt.toISOString(),
      completedAt: ride.completedAt?.toISOString(),
      fare: ride.fareActual || ride.fareQuote,
      distanceTraveled: ride.distanceMeters,
    }));
  },

  async getTripDetails(rideId: string, user: DbUser): Promise<TripResponse> {
    const ride = await tripRepository.getRideById(rideId);
    if (!ride) {
      throw new TripError('Trip not found', 404);
    }

    // Check access permission
    if (user.role === 'passenger' && ride.passengerId !== user.id) {
      throw new TripError('You do not have access to this trip', 403);
    }
    if (user.role === 'driver' && ride.driverId !== user.id) {
      throw new TripError('You do not have access to this trip', 403);
    }

    let currentLocation: LocationPoint | undefined;
    const redis = getRedisClient();
    if (redis) {
      const locationJson = await redis.get(TRIP_LOCATION_KEY(rideId));
      if (locationJson) {
        currentLocation = JSON.parse(locationJson) as LocationPoint;
      }
    }

    return {
      rideId: ride.id,
      status: ride.status,
      currentLocation,
      startedAt: ride.startedAt?.toISOString(),
      arrivedAt: ride.arrivedAt?.toISOString(),
      completedAt: ride.completedAt?.toISOString(),
      distanceTraveled: ride.distanceMeters || undefined,
      actualFare: (ride.fareActual as { amount?: number })?.amount,
    };
  },
};

export { TripError };







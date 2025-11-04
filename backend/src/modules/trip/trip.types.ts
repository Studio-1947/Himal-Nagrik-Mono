import type { z } from 'zod';
import type {
  startTripSchema,
  updateTripLocationSchema,
  completeTripSchema,
  tripIdSchema,
} from './trip.validation';

export type StartTripInput = z.infer<typeof startTripSchema>;
export type UpdateTripLocationInput = z.infer<typeof updateTripLocationSchema>;
export type CompleteTripInput = z.infer<typeof completeTripSchema>;
export type TripIdParams = z.infer<typeof tripIdSchema>;

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface TripLocation {
  location: LocationPoint;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface TripRecord {
  rideId: string;
  status:
    | 'enroute_pickup'
    | 'passenger_onboard'
    | 'completed'
    | 'cancelled_driver'
    | 'cancelled_passenger';
  currentLocation?: LocationPoint;
  locationHistory: TripLocation[];
  startedAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;
  distanceTraveled?: number;
  actualFare?: number;
  metadata?: Record<string, unknown>;
}

export interface TripResponse {
  rideId: string;
  status: string;
  currentLocation?: LocationPoint;
  startedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  distanceTraveled?: number;
  actualFare?: number;
}

export interface ActiveTripSummary {
  rideId: string;
  passengerId: string;
  driverId: string;
  status: string;
  currentLocation?: LocationPoint;
  pickupLocation: LocationPoint;
  dropoffLocation: LocationPoint;
  startedAt?: string;
  estimatedArrival?: string;
}



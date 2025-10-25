import type { rides } from '../../infra/database/schema';
import type { PassengerProfile } from '../auth/auth.types';

export type RideStatus =
  | 'requested'
  | 'driver_assigned'
  | 'enroute_pickup'
  | 'passenger_onboard'
  | 'completed'
  | 'cancelled_passenger'
  | 'cancelled_driver'
  | 'cancelled_system';

export type CreateBookingInput = {
  pickup: LocationPoint;
  dropoff: LocationPoint;
  scheduledAt?: string | null;
  vehicleType?: string;
  notes?: string;
  paymentMethod?: 'cash' | 'wallet' | 'upi';
};

export type BookingResponse = {
  id: string;
  passengerId: string;
  status: RideStatus;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  fareQuote?: FareQuote | null;
  driver?: AssignedDriver | null;
  scheduledAt?: string | null;
  requestedAt: string;
  lastUpdatedAt: string;
  metadata?: Record<string, unknown> | null;
};

export type BookingWithPassenger = BookingResponse & {
  passenger: PassengerProfileSummary;
};

export type BookingRecord = typeof rides.$inferSelect;

export type FareQuote = {
  currency: string;
  amount: number;
  breakdown?: Array<{
    label: string;
    amount: number;
  }>;
  surgeMultiplier?: number;
};

export type AssignedDriver = {
  id: string;
  name: string;
  phone?: string | null;
  vehicle?: {
    manufacturer?: string;
    model?: string;
    registrationNumber?: string;
    color?: string | null;
  };
  etaMinutes?: number;
};

export type LocationPoint = {
  latitude: number;
  longitude: number;
  description?: string;
  placeId?: string;
};

export type PassengerProfileSummary = Pick<
  PassengerProfile,
  'id' | 'name' | 'phone'
> & {
  preferences?: PassengerProfile['preferences'];
};

export type CancelBookingInput = {
  reason?: string;
};

export type UpdateBookingInput = {
  status?: RideStatus;
  driverId?: string | null;
  acceptedAt?: Date | null;
  pickupEta?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  metadata?: Record<string, unknown> | null;
};

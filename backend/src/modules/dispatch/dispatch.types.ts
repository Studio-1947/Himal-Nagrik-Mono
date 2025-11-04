import type { LocationPoint } from '../booking/booking.types';

export type DriverHeartbeatInput = {
  status?: 'available' | 'unavailable';
  location?: LocationPoint;
  capacity?: number;
};

export type DriverAvailability = {
  driverId: string;
  status: 'available' | 'unavailable';
  location?: LocationPoint;
  capacity: number;
  lastHeartbeat: number;
};

export type DispatchOffer = {
  id: string;
  bookingId: string;
  passengerId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
};

export type EnrichedDispatchOffer = DispatchOffer & {
  driverId: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  expiresAt: string;
  fareQuote?: {
    amount: number;
    currency: string;
    breakdown?: Array<{ label: string; amount: number }>;
  };
  passenger?: {
    name: string;
    phone?: string;
    rating?: number;
  };
};

export type NearbyDriverAvailability = {
  driverId: string;
  location: LocationPoint;
  distanceKm: number;
  etaMinutes: number;
  capacity: number;
  lastHeartbeat: string;
};

export type DriverAvailabilitySummary = {
  drivers: NearbyDriverAvailability[];
  total: number;
  averageEtaMinutes: number | null;
};

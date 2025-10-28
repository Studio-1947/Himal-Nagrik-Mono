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

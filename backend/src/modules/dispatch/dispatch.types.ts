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
  status: 'pending' | 'accepted' | 'declined';
};

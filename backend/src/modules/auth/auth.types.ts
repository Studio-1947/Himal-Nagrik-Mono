import type { appUsers } from '../../infra/database/schema';
export type AuthRole = 'passenger' | 'driver';

export type DbUser = typeof appUsers.$inferSelect;
export type NewDbUser = typeof appUsers.$inferInsert;

export type PassengerPreferences = {
  preferredSeat?: 'front' | 'middle' | 'back';
  musicPreference?: 'quiet' | 'neutral' | 'lively';
  accessibilityNeeds?: string;
  favouriteRoutes?: string[];
};

export type PassengerRecentTrip = {
  id: string;
  route: string;
  date: string;
  driver: string;
  status: 'completed' | 'cancelled' | 'scheduled';
};

export type DriverVehicle = {
  manufacturer: string;
  model: string;
  registrationNumber: string;
  capacity: number;
  color?: string;
};

export type DriverStats = {
  totalTrips: number;
  rating: number;
  yearsOfExperience: number;
  cancellationRate: number;
};

export type DriverAvailability = {
  weekdays: string[];
  shift: 'morning' | 'day' | 'evening' | 'night';
};

export type PassengerProfile = {
  id: string;
  role: 'passenger';
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation?: string;
  };
  preferences: {
    preferredSeat?: 'front' | 'middle' | 'back';
    musicPreference?: 'quiet' | 'neutral' | 'lively';
    accessibilityNeeds?: string;
    favouriteRoutes: string[];
  };
  recentTrips: PassengerRecentTrip[];
};

export type DriverProfile = {
  id: string;
  role: 'driver';
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  licenseNumber?: string;
  vehicle: DriverVehicle;
  stats: DriverStats;
  availability: DriverAvailability;
};

export type AuthProfile = PassengerProfile | DriverProfile;

export type AuthSession = {
  token: string;
  refreshToken?: string;
  issuedAt: string;
  expiresAt?: string;
  profile: AuthProfile;
};

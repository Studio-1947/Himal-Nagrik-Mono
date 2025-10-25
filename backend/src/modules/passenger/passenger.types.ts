import type { passengerSavedLocations } from '../../infra/database/schema';
import type { PassengerRegisterInput } from '../auth/auth.validation';
import type { PassengerProfile } from '../auth/auth.types';

export type PassengerProfileResponse = PassengerProfile & {
  savedLocations: PassengerSavedLocation[];
};

export type PassengerSavedLocation = {
  id: string;
  passengerId: string;
  label: string;
  address: string;
  location: LocationPoint;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewPassengerSavedLocation = typeof passengerSavedLocations.$inferInsert;

export type LocationPoint = {
  latitude: number;
  longitude: number;
  placeId?: string;
  description?: string;
};

export type CreateSavedLocationInput = {
  label: string;
  address: string;
  location: LocationPoint;
  isDefault?: boolean;
};

export type PassengerOnboardingPayload = PassengerRegisterInput;

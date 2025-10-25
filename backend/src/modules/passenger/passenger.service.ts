import { authRepository } from '../auth/auth.repository';
import { authService } from '../auth/auth.service';
import type { DbUser, PassengerProfile } from '../auth/auth.types';
import type { PassengerProfileUpdateInput } from '../auth/auth.validation';
import { passengerRepository } from './passenger.repository';
import type {
  CreateSavedLocationInput,
  PassengerProfileResponse,
  PassengerSavedLocation,
} from './passenger.types';

class PassengerError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'PassengerError';
  }
}

const sanitizeForJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const assertPassengerUser = (user: DbUser | null): DbUser => {
  if (!user) {
    throw new PassengerError('Passenger not found', 404);
  }
  if (user.role !== 'passenger') {
    throw new PassengerError('Access restricted to passenger accounts', 403);
  }
  return user;
};

const buildPassengerProfileResponse = async (
  passenger: DbUser,
): Promise<PassengerProfileResponse> => {
  const profile = authService.mapUserToProfile(passenger) as PassengerProfile;
  const savedLocations = await passengerRepository.listSavedLocations(passenger.id);

  return {
    ...profile,
    savedLocations,
  };
};

export const passengerService = {
  async getSelfProfile(userId: string): Promise<PassengerProfileResponse> {
    const dbUser = await authRepository.findById(userId);
    const passenger = assertPassengerUser(dbUser);
    return buildPassengerProfileResponse(passenger);
  },

  async updateSelfProfile(
    currentUser: DbUser,
    updates: PassengerProfileUpdateInput,
  ): Promise<PassengerProfileResponse> {
    const passenger = assertPassengerUser(currentUser);
    const updated = await authService.updateProfile(passenger, updates);
    return buildPassengerProfileResponse(updated);
  },

  async listSavedLocations(passengerId: string): Promise<PassengerSavedLocation[]> {
    const passenger = assertPassengerUser(await authRepository.findById(passengerId));
    void passenger;
    return passengerRepository.listSavedLocations(passengerId);
  },

  async addSavedLocation(
    passengerId: string,
    input: CreateSavedLocationInput,
  ): Promise<PassengerSavedLocation> {
    const passenger = assertPassengerUser(await authRepository.findById(passengerId));
    void passenger;

    if (input.isDefault) {
      await passengerRepository.clearDefaultSavedLocations(passengerId);
    }

    return passengerRepository.createSavedLocation(passengerId, {
      ...input,
      location: sanitizeForJson(input.location),
      isDefault: Boolean(input.isDefault),
    });
  },

  async removeSavedLocation(passengerId: string, locationId: string): Promise<void> {
    const passenger = assertPassengerUser(await authRepository.findById(passengerId));
    void passenger;

    const deleted = await passengerRepository.deleteSavedLocation(passengerId, locationId);
    if (!deleted) {
      throw new PassengerError('Saved location not found', 404);
    }
  },
};

export { PassengerError };

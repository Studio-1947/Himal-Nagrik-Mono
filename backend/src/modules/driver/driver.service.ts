import { authRepository } from '../auth/auth.repository';
import { authService } from '../auth/auth.service';
import type { DbUser, DriverProfile } from '../auth/auth.types';
import type { DriverProfileUpdateInput } from '../auth/auth.validation';
import { driverRepository } from './driver.repository';
import type {
  CreateDriverDocumentInput,
  DriverAvailabilityState,
  DriverDocument,
  DriverProfileResponse,
} from './driver.types';

class DriverError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'DriverError';
  }
}

const sanitizeForJson = <T>(value: T): T | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const ensureDriverUser = async (userId: string): Promise<DbUser> => {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new DriverError('Driver not found', 404);
  }
  if (user.role !== 'driver') {
    throw new DriverError('Access restricted to driver accounts', 403);
  }
  return user;
};

const mapAvailability = (user: DbUser): DriverAvailabilityState => {
  const availability =
    (user.availability as DriverAvailabilityState | null) ?? {
      weekdays: [],
      shift: 'day',
      isActive: true,
    };

  return {
    weekdays: availability.weekdays ?? [],
    shift: availability.shift ?? 'day',
    isActive:
      availability.isActive !== undefined ? Boolean(availability.isActive) : true,
  };
};

const buildDriverProfileResponse = async (
  user: DbUser,
): Promise<DriverProfileResponse> => {
  const profile = authService.mapUserToProfile(user) as DriverProfile;
  const documents = await driverRepository.listDocuments(user.id);

  return {
    ...profile,
    availability: mapAvailability(user),
    documents,
  };
};

export const driverService = {
  async getSelfProfile(userId: string): Promise<DriverProfileResponse> {
    const user = await ensureDriverUser(userId);
    return buildDriverProfileResponse(user);
  },

  async updateSelfProfile(
    user: DbUser,
    updates: DriverProfileUpdateInput,
  ): Promise<DriverProfileResponse> {
    const driverUser = await ensureDriverUser(user.id);

    const updatedUser = await authService.updateProfile(driverUser, updates);

    if (updates.vehicle) {
      await driverRepository.upsertVehicle(driverUser.id, {
        manufacturer: updates.vehicle.manufacturer,
        model: updates.vehicle.model,
        registrationNumber: updates.vehicle.registrationNumber,
        capacity: updates.vehicle.capacity,
        color: updates.vehicle.color ?? null,
      });
    }

    return buildDriverProfileResponse(updatedUser);
  },

  async toggleAvailability(
    driverId: string,
    isActive?: boolean,
  ): Promise<DriverProfileResponse> {
    const user = await ensureDriverUser(driverId);
    const currentAvailability = mapAvailability(user);
    const nextAvailability: DriverAvailabilityState = {
      ...currentAvailability,
      isActive:
        typeof isActive === 'boolean' ? isActive : !currentAvailability.isActive,
    };

    const updated = await authRepository.updateUser(driverId, {
      availability: sanitizeForJson(nextAvailability),
      updatedAt: new Date(),
    });

    return buildDriverProfileResponse(updated);
  },

  async submitDocument(
    driverId: string,
    input: CreateDriverDocumentInput,
  ): Promise<DriverProfileResponse> {
    await ensureDriverUser(driverId);
    await driverRepository.createDocument(driverId, input);
    const user = await ensureDriverUser(driverId);
    return buildDriverProfileResponse(user);
  },
};

export { DriverError };

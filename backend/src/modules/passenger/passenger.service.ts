import { authRepository } from '../auth/auth.repository';
import { authService } from '../auth/auth.service';
import type { DbUser, PassengerProfile } from '../auth/auth.types';
import type { PassengerProfileUpdateInput } from '../auth/auth.validation';
import { bookingRepository } from '../booking/booking.repository';
import { mapBookingRecordToResponse } from '../booking/booking.mapper';
import type { BookingRecord } from '../booking/booking.types';
import { dispatchService } from '../dispatch/dispatch.service';
import type { DriverAvailabilitySummary } from '../dispatch/dispatch.types';
import { passengerRepository } from './passenger.repository';
import type {
  CreateSavedLocationInput,
  PassengerDashboardOptions,
  PassengerDashboardSummary,
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

const DEFAULT_DASHBOARD_RADIUS_KM = 3;
const DEFAULT_RECENT_TRIPS = 3;

const createEmptyAvailabilitySummary = (): DriverAvailabilitySummary => ({
  drivers: [],
  total: 0,
  averageEtaMinutes: null,
});

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

const pickDefaultLocation = (
  locations: PassengerSavedLocation[],
): PassengerSavedLocation | null => {
  if (locations.length === 0) {
    return null;
  }
  return locations.find((location) => location.isDefault) ?? locations[0] ?? null;
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

  async getDashboardSummary(
    currentUser: DbUser,
    options: PassengerDashboardOptions = {},
  ): Promise<PassengerDashboardSummary> {
    const passenger = assertPassengerUser(currentUser);

    const savedLocations = await passengerRepository.listSavedLocations(passenger.id);
    const defaultLocation = pickDefaultLocation(savedLocations);

    const referenceLocation = options.location ?? defaultLocation?.location;
    const radiusKm = Math.min(
      Math.max(options.radiusKm ?? DEFAULT_DASHBOARD_RADIUS_KM, 0.1),
      25,
    );
    const limitDrivers = options.limitDrivers;
    const recentTripsRequested = Math.max(
      0,
      Math.min(options.recentTrips ?? DEFAULT_RECENT_TRIPS, 10),
    );

    const recentRecordsPromise =
      recentTripsRequested > 0
        ? bookingRepository.listRecentBookingsForPassenger(
            passenger.id,
            recentTripsRequested,
          )
        : Promise.resolve<BookingRecord[]>([]);

    const [activeRecord, recentRecords] = await Promise.all([
      bookingRepository.getActiveBookingForPassenger(passenger.id),
      recentRecordsPromise,
    ]);

    const activeBooking = activeRecord
      ? mapBookingRecordToResponse(activeRecord)
      : null;

    const recentTrips = recentRecords.map((record) =>
      mapBookingRecordToResponse(record),
    );

    const availabilitySummary: DriverAvailabilitySummary =
      await dispatchService.getNearbyAvailability(referenceLocation ?? null, {
        radiusKm,
        limit: limitDrivers,
      });

    return {
      passenger: {
        id: passenger.id,
        name: passenger.name,
        defaultLocation,
      },
      driverAvailability: {
        ...availabilitySummary,
        radiusKm,
      },
      activeBooking,
      recentTrips,
      savedLocations,
    };
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

import { apiRequest } from "./api-client";
import type {
  PassengerProfile,
  PassengerProfileUpdate,
  PassengerSavedLocation,
} from "./auth-service";
import type { BookingResponse } from "./booking-service";

export type PassengerProfileResponse = PassengerProfile & {
  savedLocations: PassengerSavedLocation[];
};

export type CreateSavedLocationPayload = {
  label: string;
  address: string;
  location: PassengerSavedLocation["location"];
  isDefault?: boolean;
};

export type NearbyDriverAvailability = {
  driverId: string;
  location: {
    latitude: number;
    longitude: number;
    placeId?: string;
    description?: string;
  };
  distanceKm: number;
  etaMinutes: number;
  capacity: number;
  lastHeartbeat: string;
};

export type PassengerDashboardSummary = {
  passenger: {
    id: string;
    name: string;
    defaultLocation: PassengerSavedLocation | null;
  };
  driverAvailability: {
    drivers: NearbyDriverAvailability[];
    total: number;
    averageEtaMinutes: number | null;
    radiusKm: number;
  };
  activeBooking: BookingResponse | null;
  recentTrips: BookingResponse[];
  savedLocations: PassengerSavedLocation[];
};

export type FetchDashboardSummaryParams = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limitDrivers?: number;
  recentTrips?: number;
};

const BASE_PATH = "/passengers";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const buildQueryString = (params?: FetchDashboardSummaryParams): string => {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (typeof params.lat === "number") {
    search.set("lat", params.lat.toString());
  }
  if (typeof params.lng === "number") {
    search.set("lng", params.lng.toString());
  }
  if (typeof params.radiusKm === "number") {
    search.set("radiusKm", params.radiusKm.toString());
  }
  if (typeof params.limitDrivers === "number") {
    search.set("limitDrivers", params.limitDrivers.toString());
  }
  if (typeof params.recentTrips === "number") {
    search.set("recentTrips", params.recentTrips.toString());
  }

  const query = search.toString();
  return query ? `?${query}` : "";
};

export const passengerService = {
  async getProfile(token: string): Promise<PassengerProfileResponse> {
    return apiRequest<PassengerProfileResponse>(`${BASE_PATH}/me`, {
      headers: authHeaders(token),
    });
  },

  async updateProfile(
    token: string,
    payload: PassengerProfileUpdate,
  ): Promise<PassengerProfileResponse> {
    return apiRequest<PassengerProfileResponse>(`${BASE_PATH}/me`, {
      method: "PATCH",
      headers: authHeaders(token),
      json: payload,
    });
  },

  async listSavedLocations(token: string): Promise<PassengerSavedLocation[]> {
    return apiRequest<PassengerSavedLocation[]>(`${BASE_PATH}/me/locations`, {
      headers: authHeaders(token),
    });
  },

  async createSavedLocation(
    token: string,
    payload: CreateSavedLocationPayload,
  ): Promise<PassengerSavedLocation> {
    return apiRequest<PassengerSavedLocation>(`${BASE_PATH}/me/locations`, {
      method: "POST",
      headers: authHeaders(token),
      json: payload,
    });
  },

  async deleteSavedLocation(token: string, locationId: string): Promise<void> {
    await apiRequest<void>(`${BASE_PATH}/me/locations/${locationId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
  },

  async getDashboardSummary(
    token: string,
    params?: FetchDashboardSummaryParams,
  ): Promise<PassengerDashboardSummary> {
    const query = buildQueryString(params);
    return apiRequest<PassengerDashboardSummary>(`${BASE_PATH}/me/summary${query}`, {
      headers: authHeaders(token),
    });
  },
};

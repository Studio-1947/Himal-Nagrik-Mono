import { apiRequest } from "./api-client";
import type {
  PassengerProfile,
  PassengerProfileUpdate,
  PassengerSavedLocation,
} from "./auth-service";

export type PassengerProfileResponse = PassengerProfile & {
  savedLocations: PassengerSavedLocation[];
};

export type CreateSavedLocationPayload = {
  label: string;
  address: string;
  location: PassengerSavedLocation["location"];
  isDefault?: boolean;
};

const BASE_PATH = "/passengers";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

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
};

import { apiRequest } from "./api-client";
import type {
  DriverDocument,
  DriverProfile,
  DriverProfileUpdate,
} from "./auth-service";

export type DriverProfileResponse = DriverProfile & {
  documents: DriverDocument[];
  availability: DriverProfile["availability"] & { isActive: boolean };
};

export type SubmitDriverDocumentPayload = {
  documentType: string;
  metadata?: Record<string, unknown>;
};

const BASE_PATH = "/drivers";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const driverService = {
  async getProfile(token: string): Promise<DriverProfileResponse> {
    return apiRequest<DriverProfileResponse>(`${BASE_PATH}/me`, {
      headers: authHeaders(token),
    });
  },

  async updateProfile(
    token: string,
    payload: DriverProfileUpdate,
  ): Promise<DriverProfileResponse> {
    return apiRequest<DriverProfileResponse>(`${BASE_PATH}/me`, {
      method: "PATCH",
      headers: authHeaders(token),
      json: payload,
    });
  },

  async toggleAvailability(
    token: string,
    isActive?: boolean,
  ): Promise<DriverProfileResponse> {
    return apiRequest<DriverProfileResponse>(`${BASE_PATH}/me/availability/toggle`, {
      method: "POST",
      headers: authHeaders(token),
      json: isActive === undefined ? undefined : { isActive },
    });
  },

  async submitDocument(
    token: string,
    payload: SubmitDriverDocumentPayload,
  ): Promise<DriverProfileResponse> {
    return apiRequest<DriverProfileResponse>(`${BASE_PATH}/me/documents`, {
      method: "POST",
      headers: authHeaders(token),
      json: payload,
    });
  },
};

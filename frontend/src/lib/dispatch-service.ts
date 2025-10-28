import { apiRequest } from "./api-client";
import type { BookingResponse, LocationPoint } from "./booking-service";

export type DriverHeartbeatPayload = {
  status?: "available" | "unavailable";
  capacity?: number;
  location?: LocationPoint;
};

export type DriverAvailability = {
  driverId: string;
  status: "available" | "unavailable";
  capacity: number;
  lastHeartbeat: number;
  location?: LocationPoint;
};

export type DispatchOffer = {
  id: string;
  bookingId: string;
  passengerId: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined" | "expired";
};

export type RejectOfferPayload = {
  etaMinutes?: number;
};

const BASE_PATH = "/dispatch";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const dispatchService = {
  async sendHeartbeat(
    token: string,
    payload: DriverHeartbeatPayload,
  ): Promise<DriverAvailability> {
    return apiRequest<DriverAvailability>(`${BASE_PATH}/availability/heartbeat`, {
      method: "POST",
      headers: authHeaders(token),
      json: payload,
    });
  },

  async listOffers(token: string): Promise<DispatchOffer[]> {
    return apiRequest<DispatchOffer[]>(`${BASE_PATH}/offers`, {
      headers: authHeaders(token),
    });
  },

  async acceptOffer(token: string, offerId: string): Promise<BookingResponse> {
    return apiRequest<BookingResponse>(`${BASE_PATH}/offers/${offerId}/accept`, {
      method: "POST",
      headers: authHeaders(token),
      json: {},
    });
  },

  async rejectOffer(
    token: string,
    offerId: string,
    payload?: RejectOfferPayload,
  ): Promise<void> {
    await apiRequest<void>(`${BASE_PATH}/offers/${offerId}/reject`, {
      method: "POST",
      headers: authHeaders(token),
      json: payload && Object.keys(payload).length > 0 ? payload : undefined,
    });
  },
};

import { apiRequest } from "./api-client";

export type LocationPoint = {
  latitude: number;
  longitude: number;
  description?: string;
  placeId?: string;
};

export type CreateBookingPayload = {
  pickup: LocationPoint;
  dropoff: LocationPoint;
  scheduledAt?: string;
  vehicleType?: string;
  notes?: string;
  paymentMethod?: "cash" | "wallet" | "upi";
};

export type BookingStatus =
  | "requested"
  | "driver_assigned"
  | "enroute_pickup"
  | "passenger_onboard"
  | "completed"
  | "cancelled_passenger"
  | "cancelled_driver"
  | "cancelled_system"
  | "expired";

export type BookingDriver = {
  id: string;
  name: string;
  phone?: string | null;
  vehicle?: {
    manufacturer?: string;
    model?: string;
    registrationNumber?: string;
    color?: string | null;
  } | null;
};

export type BookingResponse = {
  id: string;
  passengerId: string;
  status: BookingStatus;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  fareQuote?: unknown;
  driver?: BookingDriver | null;
  scheduledAt?: string | null;
  requestedAt: string;
  lastUpdatedAt: string;
  metadata?: Record<string, unknown> | null;
};

const BASE_PATH = "/bookings";

const withAuth = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const bookingService = {
  async create(token: string, payload: CreateBookingPayload): Promise<BookingResponse> {
    return apiRequest<BookingResponse>(BASE_PATH, {
      method: "POST",
      headers: withAuth(token),
      json: payload,
    });
  },

  async get(token: string, bookingId: string): Promise<BookingResponse> {
    return apiRequest<BookingResponse>(`${BASE_PATH}/${bookingId}`, {
      headers: withAuth(token),
    });
  },

  async cancel(token: string, bookingId: string, reason?: string): Promise<BookingResponse> {
    return apiRequest<BookingResponse>(`${BASE_PATH}/${bookingId}/cancel`, {
      method: "POST",
      headers: withAuth(token),
      json: reason ? { reason } : undefined,
    });
  },
};

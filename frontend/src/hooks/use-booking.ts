import { useCallback } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  bookingService,
  type CreateBookingPayload,
  type BookingResponse,
} from "@/lib/booking-service";

export const useBooking = () => {
  const { session } = useAuth();
  const token = session?.token;

  const ensureToken = useCallback(() => {
    if (!token) {
      throw new Error("You must be logged in to manage bookings");
    }
    return token;
  }, [token]);

  const createBooking = useCallback(
    async (payload: CreateBookingPayload): Promise<BookingResponse> => {
      return bookingService.create(ensureToken(), payload);
    },
    [ensureToken],
  );

  const getBooking = useCallback(
    async (bookingId: string): Promise<BookingResponse> => {
      return bookingService.get(ensureToken(), bookingId);
    },
    [ensureToken],
  );

  const cancelBooking = useCallback(
    async (bookingId: string, reason?: string): Promise<BookingResponse> => {
      return bookingService.cancel(ensureToken(), bookingId, reason);
    },
    [ensureToken],
  );

  return {
    createBooking,
    getBooking,
    cancelBooking,
  };
};

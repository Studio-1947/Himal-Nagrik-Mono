import type { DbUser } from "../auth/auth.types";
import { dispatchService } from "../dispatch/dispatch.service";
import { bookingRepository } from "./booking.repository";
import { enqueueBookingRequest } from "./booking.queue";
import { triggerDispatchWorker } from "../dispatch/dispatch.worker";
import type {
  BookingRecord,
  BookingResponse,
  CreateBookingInput,
  FareQuote,
} from "./booking.types";
import { mapBookingRecordToResponse } from "./booking.mapper";

class BookingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BookingError";
  }
}

const BASE_FARE_AMOUNT = 120;

const computeFareQuote = (_payload: CreateBookingInput): FareQuote => ({
  currency: "INR",
  amount: BASE_FARE_AMOUNT,
  breakdown: [
    { label: "Base fare", amount: BASE_FARE_AMOUNT - 20 },
    { label: "Fuel surcharge", amount: 20 },
  ],
});

const computePriorityScore = (record: BookingRecord): number =>
  record.scheduledAt instanceof Date
    ? record.scheduledAt.getTime()
    : record.requestedAt instanceof Date
    ? record.requestedAt.getTime()
    : Date.now();

const ensurePassengerUser = (user: DbUser): DbUser => {
  if (user.role !== "passenger") {
    throw new BookingError("Only passengers can request rides", 403);
  }

  return user;
};

export const bookingService = {
  async createBooking(
    user: DbUser,
    payload: CreateBookingInput,
  ): Promise<BookingResponse> {
    const passenger = ensurePassengerUser(user);
    const fareQuote = computeFareQuote(payload);
    const record = await bookingRepository.createBooking(
      passenger.id,
      payload,
      fareQuote,
    );

    await enqueueBookingRequest(record.id, computePriorityScore(record));
    await dispatchService.handleNewBooking(record);
    triggerDispatchWorker();

    return mapBookingRecordToResponse(record);
  },

  async getBooking(
    bookingId: string,
    requester: DbUser,
  ): Promise<BookingResponse> {
    const record = await bookingRepository.getBookingById(bookingId);

    if (!record) {
      throw new BookingError("Booking not found", 404);
    }

    if (requester.role === "passenger" && record.passengerId !== requester.id) {
      throw new BookingError("You are not allowed to view this booking", 403);
    }

    if (
      requester.role === "driver" &&
      record.driverId !== null &&
      record.driverId !== requester.id
    ) {
      throw new BookingError("You are not assigned to this booking", 403);
    }

    return mapBookingRecordToResponse(record);
  },

  async cancelBooking(
    bookingId: string,
    requester: DbUser,
    reason?: string,
  ): Promise<BookingResponse> {
    const record = await bookingRepository.getBookingById(bookingId);

    if (!record) {
      throw new BookingError("Booking not found", 404);
    }

    if (requester.role === "passenger" && record.passengerId !== requester.id) {
      throw new BookingError("You are not allowed to cancel this booking", 403);
    }

    if (
      requester.role === "driver" &&
      record.driverId !== null &&
      record.driverId !== requester.id
    ) {
      throw new BookingError("You are not assigned to this booking", 403);
    }

    const cancellableStatuses: Array<BookingRecord["status"]> = [
      "requested",
      "driver_assigned",
    ];

    if (!cancellableStatuses.includes(record.status)) {
      throw new BookingError("Booking cannot be cancelled at this stage", 409);
    }

    const status =
      requester.role === "driver"
        ? "cancelled_driver"
        : requester.role === "passenger"
        ? "cancelled_passenger"
        : "cancelled_system";

    const metadataBase =
      (record.metadata as Record<string, unknown> | null) ?? {};

    const updated = await bookingRepository.updateBooking(bookingId, {
      status,
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
      metadata: {
        ...metadataBase,
        cancellation: {
          by: requester.role,
          reason: reason ?? null,
        },
      },
    });

    if (!updated) {
      throw new BookingError("Failed to update booking", 500);
    }

    return mapBookingRecordToResponse(updated);
  },
};

export { BookingError };

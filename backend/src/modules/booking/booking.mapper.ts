import type {
  BookingRecord,
  BookingResponse,
  FareQuote,
  LocationPoint,
} from "./booking.types";

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const mapLocation = (value: unknown): LocationPoint => {
  if (!value || typeof value !== "object") {
    return { latitude: 0, longitude: 0 };
  }

  const record = value as Record<string, unknown>;

  return {
    latitude: toNumber(record.latitude),
    longitude: toNumber(record.longitude),
    description:
      typeof record.description === "string" ? record.description : undefined,
    placeId: typeof record.placeId === "string" ? record.placeId : undefined,
  };
};

export const mapBookingRecordToResponse = (
  record: BookingRecord,
): BookingResponse => {
  const requestedAtIso =
    record.requestedAt instanceof Date
      ? record.requestedAt.toISOString()
      : new Date().toISOString();

  const updatedAtIso =
    record.updatedAt instanceof Date
      ? record.updatedAt.toISOString()
      : requestedAtIso;

  const scheduledAtIso =
    record.scheduledAt instanceof Date
      ? record.scheduledAt.toISOString()
      : record.scheduledAt ?? null;

  return {
    id: record.id,
    passengerId: record.passengerId,
    status: record.status,
    pickup: mapLocation(record.pickupLocation),
    dropoff: mapLocation(record.dropoffLocation),
    fareQuote: record.fareQuote ? (record.fareQuote as FareQuote) : null,
    driver:
      record.driverId !== null
        ? {
            id: record.driverId,
            name: "",
          }
        : null,
    scheduledAt: scheduledAtIso,
    requestedAt: requestedAtIso,
    lastUpdatedAt: updatedAtIso,
    metadata: (record.metadata as Record<string, unknown> | null) ?? undefined,
  };
};

import { randomUUID } from 'node:crypto';

import { getRedisClient } from '../../infra/cache';
import { getDriverStateTtlSeconds } from '../../infra/cache/redis';
import { publishRealtimeEvent } from '../../infra/realtime';
import { bookingRepository } from '../booking/booking.repository';
import {
  enqueueBookingRequest,
  removeBookingRequest,
} from '../booking/booking.queue';
import { mapBookingRecordToResponse } from '../booking/booking.mapper';
import type { BookingRecord, BookingResponse } from '../booking/booking.types';
import type {
  DriverHeartbeatInput,
  DriverAvailability,
  DispatchOffer,
} from './dispatch.types';

type InternalOffer = DispatchOffer & {
  driverId: string;
  passengerId: string;
};

const DRIVER_AVAILABILITY_SET = 'dispatch:drivers:available';
const OFFER_TTL_SECONDS = 60 * 15;
const OFFER_TTL_MS = OFFER_TTL_SECONDS * 1000;

const driverStateKey = (driverId: string): string => `dispatch:drivers:${driverId}`;
const driverOffersKey = (driverId: string): string => `dispatch:drivers:${driverId}:offers`;
const offerKey = (offerId: string): string => `dispatch:offers:${offerId}`;

const driverStates = new Map<string, DriverAvailability>();
const offersByDriver = new Map<string, InternalOffer[]>();
const offersById = new Map<string, InternalOffer>();

class DispatchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'DispatchError';
  }
}

const mapInternalOfferToResponse = (offer: InternalOffer): DispatchOffer => ({
  id: offer.id,
  bookingId: offer.bookingId,
  passengerId: offer.passengerId,
  status: offer.status,
  createdAt: offer.createdAt,
});

const getDriverOffersBucket = (driverId: string): InternalOffer[] => {
  if (!offersByDriver.has(driverId)) {
    offersByDriver.set(driverId, []);
  }
  return offersByDriver.get(driverId)!;
};

const setDriverStateMemory = (
  driverId: string,
  updates: Partial<DriverAvailability>,
): DriverAvailability => {
  const existing = driverStates.get(driverId) ?? {
    driverId,
    status: 'available' as const,
    capacity: 4,
    lastHeartbeat: Date.now(),
  };

  const next: DriverAvailability = {
    ...existing,
    ...updates,
    lastHeartbeat: Date.now(),
  };

  driverStates.set(driverId, next);
  return next;
};

const registerHeartbeatMemory = (
  driverId: string,
  input: DriverHeartbeatInput,
): DriverAvailability => {
  const availability = setDriverStateMemory(driverId, {
    status: input.status ?? 'available',
    location: input.location ?? undefined,
    capacity: input.capacity ?? 4,
  });

  getDriverOffersBucket(driverId); // ensure bucket exists
  return availability;
};

const listOffersMemory = (driverId: string): DispatchOffer[] =>
  getDriverOffersBucket(driverId).map(mapInternalOfferToResponse);

const findAvailableDriverMemory = (
  exclude?: Set<string>,
): DriverAvailability | null => {
  const candidates = Array.from(driverStates.values()).filter(
    (driver) =>
      driver.status === 'available' &&
      getDriverOffersBucket(driver.driverId).length === 0 &&
      !(exclude?.has(driver.driverId) ?? false),
  );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);
  return candidates[0];
};

const createOfferMemory = (
  driverId: string,
  booking: BookingRecord,
): InternalOffer => {
  const offer: InternalOffer = {
    id: randomUUID(),
    driverId,
    bookingId: booking.id,
    passengerId: booking.passengerId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  offersById.set(offer.id, offer);
  getDriverOffersBucket(driverId).push(offer);
  return offer;
};

const removeOfferMemory = (offerId: string): void => {
  const offer = offersById.get(offerId);
  if (!offer) {
    return;
  }

  const bucket = getDriverOffersBucket(offer.driverId);
  const index = bucket.findIndex((item) => item.id === offerId);
  if (index !== -1) {
    bucket.splice(index, 1);
  }

  offersById.delete(offerId);
};

const updateDriverStatusMemory = (
  driverId: string,
  status: DriverAvailability['status'],
): void => {
  setDriverStateMemory(driverId, { status });
};

const getOfferMemory = (offerId: string): InternalOffer | null =>
  offersById.get(offerId) ?? null;

const setOfferStatusMemory = (
  offer: InternalOffer,
  status: InternalOffer['status'],
): void => {
  offer.status = status;
};

const getOfferCreatedAt = (offer: InternalOffer): number => {
  const parsed = Date.parse(offer.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasOfferExpired = (offer: InternalOffer, cutoff: number): boolean => {
  const createdAt = getOfferCreatedAt(offer);
  return createdAt > 0 && createdAt <= cutoff;
};

const listPendingOffersMemory = (): InternalOffer[] => {
  const offers: InternalOffer[] = [];
  for (const bucket of offersByDriver.values()) {
    for (const offer of bucket) {
      if (offer.status === 'pending') {
        offers.push(offer);
      }
    }
  }
  return offers;
};

const parseLocation = (value: string | undefined): DriverAvailability['location'] => {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as DriverAvailability['location'];
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number'
    ) {
      return parsed;
    }
  } catch {
    // ignore malformed payloads
  }
  return undefined;
};

const parseDriverAvailabilityHash = (
  driverId: string,
  hash: Record<string, string>,
): DriverAvailability | null => {
  if (!hash || Object.keys(hash).length === 0) {
    return null;
  }

  const status =
    hash.status === 'unavailable' ? ('unavailable' as const) : ('available' as const);

  const capacity = Number(hash.capacity ?? '4');
  const lastHeartbeat = Number(hash.lastHeartbeat ?? `${Date.now()}`);

  return {
    driverId,
    status,
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 4,
    lastHeartbeat: Number.isFinite(lastHeartbeat) ? lastHeartbeat : Date.now(),
    location: parseLocation(hash.location),
  };
};

const parseOfferHash = (
  offerId: string,
  hash: Record<string, string>,
): InternalOffer | null => {
  const { driverId, bookingId, passengerId } = hash;
  if (!driverId || !bookingId || !passengerId) {
    return null;
  }

  const status =
    hash.status === 'accepted' || hash.status === 'declined'
      ? hash.status
      : ('pending' as const);

  return {
    id: offerId,
    driverId,
    bookingId,
    passengerId,
    status,
    createdAt: hash.createdAt ?? new Date().toISOString(),
  };
};

const registerHeartbeatRedis = async (
  driverId: string,
  input: DriverHeartbeatInput,
): Promise<DriverAvailability> => {
  const redis = getRedisClient();
  if (!redis) {
    return registerHeartbeatMemory(driverId, input);
  }

  const existing = parseDriverAvailabilityHash(
    driverId,
    await redis.hGetAll(driverStateKey(driverId)),
  );
  const now = Date.now();

  const next: DriverAvailability = {
    driverId,
    status: input.status ?? existing?.status ?? 'available',
    capacity: input.capacity ?? existing?.capacity ?? 4,
    location: input.location ?? existing?.location,
    lastHeartbeat: now,
  };

  const payload: Record<string, string> = {
    status: next.status,
    capacity: String(next.capacity),
    lastHeartbeat: String(next.lastHeartbeat),
  };

  if (next.location) {
    payload.location = JSON.stringify(next.location);
  } else {
    payload.location = '';
  }

  await redis.hSet(driverStateKey(driverId), payload);
  await redis.expire(driverStateKey(driverId), getDriverStateTtlSeconds());

  if (next.status === 'available') {
    await redis.zAdd(DRIVER_AVAILABILITY_SET, [
      { score: next.lastHeartbeat, value: driverId },
    ]);
  } else {
    await redis.zRem(DRIVER_AVAILABILITY_SET, driverId);
  }

  return next;
};

const listOffersRedis = async (driverId: string): Promise<DispatchOffer[]> => {
  const redis = getRedisClient();
  if (!redis) {
    return listOffersMemory(driverId);
  }

  const offerIds = await redis.zRange(driverOffersKey(driverId), 0, -1);
  if (offerIds.length === 0) {
    return [];
  }

  const offers: DispatchOffer[] = [];

  for (const id of offerIds) {
    const hash = await redis.hGetAll(offerKey(id));
    if (!hash || Object.keys(hash).length === 0) {
      await redis.zRem(driverOffersKey(driverId), id);
      continue;
    }

    const parsed = parseOfferHash(id, hash);
    if (!parsed) {
      await redis.zRem(driverOffersKey(driverId), id);
      continue;
    }

    offers.push(mapInternalOfferToResponse(parsed));
  }

  offers.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return offers;
};

const findAvailableDriverRedis = async (
  exclude?: Set<string>,
): Promise<DriverAvailability | null> => {
  const redis = getRedisClient();
  if (!redis) {
    return findAvailableDriverMemory(exclude);
  }

  const driverIds = await redis.zRange(DRIVER_AVAILABILITY_SET, -20, -1);
  for (let index = driverIds.length - 1; index >= 0; index -= 1) {
    const driverId = driverIds[index];
    if (exclude?.has(driverId)) {
      continue;
    }

    const offerCount = await redis.zCard(driverOffersKey(driverId));
    if (offerCount > 0) {
      continue;
    }

    const hash = await redis.hGetAll(driverStateKey(driverId));
    if (!hash || Object.keys(hash).length === 0) {
      await redis.zRem(DRIVER_AVAILABILITY_SET, driverId);
      continue;
    }

    const availability = parseDriverAvailabilityHash(driverId, hash);
    if (!availability || availability.status !== 'available') {
      await redis.zRem(DRIVER_AVAILABILITY_SET, driverId);
      continue;
    }

    return availability;
  }

  return null;
};

const createOfferRedis = async (
  driverId: string,
  booking: BookingRecord,
): Promise<InternalOffer> => {
  const redis = getRedisClient();
  if (!redis) {
    return createOfferMemory(driverId, booking);
  }

  const offer: InternalOffer = {
    id: randomUUID(),
    driverId,
    bookingId: booking.id,
    passengerId: booking.passengerId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await redis.hSet(offerKey(offer.id), {
    driverId: offer.driverId,
    bookingId: offer.bookingId,
    passengerId: offer.passengerId,
    status: offer.status,
    createdAt: offer.createdAt,
  });
  await redis.expire(offerKey(offer.id), OFFER_TTL_SECONDS);

  await redis.zAdd(driverOffersKey(driverId), [
    { score: Date.now(), value: offer.id },
  ]);
  await redis.expire(driverOffersKey(driverId), OFFER_TTL_SECONDS);

  return offer;
};

const getOfferRedis = async (offerId: string): Promise<InternalOffer | null> => {
  const redis = getRedisClient();
  if (!redis) {
    return getOfferMemory(offerId);
  }

  const hash = await redis.hGetAll(offerKey(offerId));
  if (!hash || Object.keys(hash).length === 0) {
    return null;
  }

  return parseOfferHash(offerId, hash);
};

const listPendingOffersRedis = async (): Promise<InternalOffer[]> => {
  const redis = getRedisClient();
  if (!redis) {
    return listPendingOffersMemory();
  }

  const keys = await redis.keys('dispatch:offers:*');
  if (keys.length === 0) {
    return [];
  }

  const offers: InternalOffer[] = [];
  for (const key of keys) {
    const offerId = key.split(':').pop();
    if (!offerId) {
      continue;
    }
    const offer = await getOfferRedis(offerId);
    if (offer && offer.status === 'pending') {
      offers.push(offer);
    }
  }

  return offers;
};

const setOfferStatusRedis = async (
  offerId: string,
  status: InternalOffer['status'],
): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  await redis.hSet(offerKey(offerId), { status });
};

const removeOfferRedis = async (
  driverId: string,
  offerId: string,
): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    removeOfferMemory(offerId);
    return;
  }

  await redis.zRem(driverOffersKey(driverId), offerId);
  await redis.del(offerKey(offerId));
};

const updateDriverStatusRedis = async (
  driverId: string,
  status: DriverAvailability['status'],
): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    updateDriverStatusMemory(driverId, status);
    return;
  }

  const now = Date.now();
  await redis.hSet(driverStateKey(driverId), {
    status,
    lastHeartbeat: String(now),
  });
  await redis.expire(driverStateKey(driverId), getDriverStateTtlSeconds());

  if (status === 'available') {
    await redis.zAdd(DRIVER_AVAILABILITY_SET, [
      { score: now, value: driverId },
    ]);
  } else {
    await redis.zRem(DRIVER_AVAILABILITY_SET, driverId);
  }
};

const broadcastAvailability = (availability: DriverAvailability): void => {
  publishRealtimeEvent(
    `driver:${availability.driverId}`,
    'dispatch.availability',
    availability,
  );
  publishRealtimeEvent(
    'dispatch:availability',
    'dispatch.availability',
    availability,
  );
};

const broadcastOfferCreated = (offer: InternalOffer): void => {
  const payload = mapInternalOfferToResponse(offer);
  publishRealtimeEvent(
    `driver:${offer.driverId}`,
    'dispatch.offer.created',
    payload,
  );
  publishRealtimeEvent(
    `passenger:${offer.passengerId}`,
    'booking.offer.created',
    {
      bookingId: offer.bookingId,
      offer: payload,
    },
  );
};

const broadcastOfferAccepted = (
  offer: InternalOffer,
  booking: BookingResponse,
): void => {
  publishRealtimeEvent(
    `driver:${offer.driverId}`,
    'dispatch.offer.accepted',
    {
      offerId: offer.id,
      booking,
    },
  );
  publishRealtimeEvent(
    `passenger:${offer.passengerId}`,
    'booking.driver_assigned',
    {
      offerId: offer.id,
      booking,
    },
  );
};

const broadcastOfferDeclined = (offer: InternalOffer): void => {
  publishRealtimeEvent(
    `driver:${offer.driverId}`,
    'dispatch.offer.declined',
    { offerId: offer.id },
  );
  publishRealtimeEvent(
    `passenger:${offer.passengerId}`,
    'booking.offer.declined',
    { offerId: offer.id, bookingId: offer.bookingId },
  );
};

const broadcastOfferExpired = (offer: InternalOffer): void => {
  publishRealtimeEvent(
    `driver:${offer.driverId}`,
    'dispatch.offer.expired',
    { offerId: offer.id },
  );
  publishRealtimeEvent(
    `passenger:${offer.passengerId}`,
    'booking.offer.expired',
    { offerId: offer.id, bookingId: offer.bookingId },
  );
};

const attemptBookingMatch = async (
  booking: BookingRecord,
  exclude?: Set<string>,
): Promise<boolean> => {
  const redis = getRedisClient();
  const driver = redis
    ? await findAvailableDriverRedis(exclude)
    : findAvailableDriverMemory(exclude);

  if (!driver) {
    return false;
  }

  const offer = redis
    ? await createOfferRedis(driver.driverId, booking)
    : createOfferMemory(driver.driverId, booking);

  await removeBookingRequest(booking.id);
  broadcastOfferCreated(offer);

  return true;
};

const redispatchBooking = async (
  bookingId: string,
  exclude?: Set<string>,
): Promise<void> => {
  const record = await bookingRepository.getBookingById(bookingId);
  if (!record || record.status !== 'requested') {
    return;
  }

  const matched = await attemptBookingMatch(record, exclude);
  if (!matched) {
    await enqueueBookingRequest(record.id, Date.now());
  }
};

const expireOfferInternal = async (offer: InternalOffer): Promise<void> => {
  const redis = getRedisClient();
  if (redis) {
    await setOfferStatusRedis(offer.id, 'expired');
    await removeOfferRedis(offer.driverId, offer.id);
    await updateDriverStatusRedis(offer.driverId, 'available');
  } else {
    setOfferStatusMemory(offer, 'expired');
    removeOfferMemory(offer.id);
    updateDriverStatusMemory(offer.driverId, 'available');
  }

  broadcastOfferExpired(offer);
  await redispatchBooking(offer.bookingId, new Set([offer.driverId]));
};

const sweepExpiredOffers = async (now?: number): Promise<void> => {
  const currentTime = now ?? Date.now();
  const cutoff = currentTime - OFFER_TTL_MS;
  if (cutoff <= 0) {
    return;
  }

  const redis = getRedisClient();
  const pendingOffers = redis
    ? await listPendingOffersRedis()
    : listPendingOffersMemory();

  if (pendingOffers.length === 0) {
    return;
  }

  for (const offer of pendingOffers) {
    if (hasOfferExpired(offer, cutoff)) {
      await expireOfferInternal(offer);
    }
  }
};

export const dispatchService = {
  async registerHeartbeat(
    driverId: string,
    input: DriverHeartbeatInput,
  ): Promise<DriverAvailability> {
    const availability = await registerHeartbeatRedis(driverId, input);
    broadcastAvailability(availability);
    return availability;
  },

  async listOffers(driverId: string): Promise<DispatchOffer[]> {
    const redis = getRedisClient();
    return redis ? listOffersRedis(driverId) : listOffersMemory(driverId);
  },

  async handleNewBooking(booking: BookingRecord): Promise<boolean> {
    return attemptBookingMatch(booking);
  },

  async acceptOffer(
    driverId: string,
    offerId: string,
  ): Promise<BookingResponse> {
    const offer = await getOfferRedis(offerId);
    if (!offer || offer.driverId !== driverId) {
      throw new DispatchError('Offer not found', 404);
    }

    if (offer.status !== 'pending') {
      throw new DispatchError('Offer has already been processed', 409);
    }

    const redis = getRedisClient();
    if (redis) {
      await setOfferStatusRedis(offerId, 'accepted');
      await removeOfferRedis(driverId, offerId);
    } else {
      setOfferStatusMemory(offer, 'accepted');
      removeOfferMemory(offerId);
    }

    await updateDriverStatusRedis(driverId, 'unavailable');

    const updated = await bookingRepository.updateBooking(offer.bookingId, {
      status: 'driver_assigned',
      driverId,
      acceptedAt: new Date(),
      metadata: {
        acceptedBy: driverId,
        acceptedAt: new Date().toISOString(),
      },
    });

    if (!updated) {
      throw new DispatchError('Booking not found while accepting offer', 404);
    }

    await removeBookingRequest(offer.bookingId);

    const response = mapBookingRecordToResponse(updated);
    broadcastOfferAccepted(offer, response);
    return response;
  },

  async rejectOffer(
    driverId: string,
    offerId: string,
    reason?: string,
  ): Promise<void> {
    const offer = await getOfferRedis(offerId);
    if (!offer || offer.driverId !== driverId) {
      throw new DispatchError('Offer not found', 404);
    }

    const redis = getRedisClient();
    if (redis) {
      await setOfferStatusRedis(offerId, 'declined');
      await removeOfferRedis(driverId, offerId);
      await updateDriverStatusRedis(driverId, 'available');
    } else {
      setOfferStatusMemory(offer, 'declined');
      removeOfferMemory(offerId);
      updateDriverStatusMemory(driverId, 'available');
    }

    broadcastOfferDeclined(offer);

    await redispatchBooking(offer.bookingId, new Set([offer.driverId]));

    if (reason) {
      publishRealtimeEvent(
        `passenger:${offer.passengerId}`,
        'booking.offer.declined_reason',
        {
          offerId: offer.id,
          reason,
        },
      );
    }
  },

  async reapExpiredOffers(options?: { now?: number }): Promise<void> {
    await sweepExpiredOffers(options?.now);
  },

  getOfferTtlMs(): number {
    return OFFER_TTL_MS;
  },

  async reset(): Promise<void> {
    driverStates.clear();
    offersByDriver.clear();
    offersById.clear();

    const redis = getRedisClient();
    if (!redis) {
      return;
    }

    try {
      const keys = await redis.keys('dispatch:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('[dispatch] Failed to reset Redis keys', error);
    }
  },
};

export { DispatchError };

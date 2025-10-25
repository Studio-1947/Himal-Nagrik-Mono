import { getRedisClient } from '../../infra/cache';

const BOOKING_QUEUE_KEY = 'booking:queue:pending';

export const enqueueBookingRequest = async (
  bookingId: string,
  priorityScore: number,
): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  await redis.zAdd(BOOKING_QUEUE_KEY, [
    { score: priorityScore, value: bookingId },
  ]);
};

export const dequeueBookingRequest = async (): Promise<string | null> => {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const [result] = await redis.zPopMin(BOOKING_QUEUE_KEY);
  return result?.value ?? null;
};

export const removeBookingRequest = async (bookingId: string): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  await redis.zRem(BOOKING_QUEUE_KEY, bookingId);
};

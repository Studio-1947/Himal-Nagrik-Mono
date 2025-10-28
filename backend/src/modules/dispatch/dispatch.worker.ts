import { getRedisClient } from '../../infra/cache';
import { bookingRepository } from '../booking/booking.repository';
import {
  dequeueBookingRequest,
  enqueueBookingRequest,
} from '../booking/booking.queue';
import { dispatchService } from './dispatch.service';

const WORKER_INTERVAL_MS = 1000;

let timer: NodeJS.Timeout | null = null;
let processing = false;

const processQueue = async (): Promise<void> => {
  if (processing) {
    return;
  }

  if (!getRedisClient()) {
    // No cache configured, nothing to process.
    return;
  }

  processing = true;

  try {
    await dispatchService.reapExpiredOffers();

    while (true) {
      const bookingId = await dequeueBookingRequest();
      if (!bookingId) {
        break;
      }

      const record = await bookingRepository.getBookingById(bookingId);
      if (!record || record.status !== 'requested') {
        continue;
      }

      const dispatched = await dispatchService.handleNewBooking(record);
      if (!dispatched) {
        await enqueueBookingRequest(bookingId, Date.now());
      }
    }
  } catch (error) {
    console.error('[dispatch-worker] Failed to process queue', error);
  } finally {
    processing = false;
  }
};

export const startDispatchWorker = (): void => {
  if (timer || !getRedisClient()) {
    return;
  }

  timer = setInterval(() => {
    void processQueue();
  }, WORKER_INTERVAL_MS);
};

export const stopDispatchWorker = (): void => {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;
};

export const triggerDispatchWorker = (): void => {
  if (!getRedisClient()) {
    return;
  }

  if (!timer) {
    startDispatchWorker();
  }

  setImmediate(() => {
    void processQueue();
  });
};

import { z } from 'zod';

import { locationPointSchema } from '../booking/booking.validation';

export const heartbeatSchema = z.object({
  status: z.enum(['available', 'unavailable']).optional(),
  location: locationPointSchema.optional(),
  capacity: z.coerce
    .number({ invalid_type_error: 'Capacity must be numeric' })
    .int()
    .min(1, { message: 'Capacity must be at least 1' })
    .max(12, { message: 'Capacity must be 12 or fewer seats' })
    .optional(),
});

export const offerParamsSchema = z.object({
  id: z.string().uuid(),
});

export const offerActionSchema = z.object({
  etaMinutes: z.coerce
    .number({ invalid_type_error: 'ETA must be numeric' })
    .min(1)
    .max(240)
    .optional(),
});

export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type OfferActionInput = z.infer<typeof offerActionSchema>;

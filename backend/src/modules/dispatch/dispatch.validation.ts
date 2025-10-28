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

export const nearbyAvailabilityQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce
    .number({ invalid_type_error: 'Radius must be numeric' })
    .min(0.1)
    .max(25)
    .default(3),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be numeric' })
    .int()
    .min(1)
    .max(100)
    .optional(),
});

export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type OfferActionInput = z.infer<typeof offerActionSchema>;
export type NearbyAvailabilityQueryInput = z.infer<typeof nearbyAvailabilityQuerySchema>;

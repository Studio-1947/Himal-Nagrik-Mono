import { z } from 'zod';

export const locationPointSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  description: z.string().trim().max(255).optional(),
  placeId: z.string().trim().max(120).optional(),
});

export const createBookingSchema = z.object({
  pickup: locationPointSchema,
  dropoff: locationPointSchema,
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  vehicleType: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(['cash', 'wallet', 'upi']).optional(),
});

export const bookingIdSchema = z.object({
  id: z.string().uuid(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

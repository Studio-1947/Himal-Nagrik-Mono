import { z } from 'zod';

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const tripIdSchema = z.object({
  id: z.string().uuid(),
});

export const startTripSchema = z.object({
  rideId: z.string().uuid(),
  location: locationSchema.optional(),
});

export const updateTripLocationSchema = z.object({
  location: locationSchema,
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
});

export const completeTripSchema = z.object({
  location: locationSchema.optional(),
  finalFare: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});







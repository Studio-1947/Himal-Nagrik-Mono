import { z } from 'zod';

import { passengerProfileUpdateSchema } from '../auth/auth.validation';

export const locationPointSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  placeId: z.string().trim().max(120).optional(),
  description: z.string().trim().max(255).optional(),
});

export const createSavedLocationSchema = z.object({
  label: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(255),
  location: locationPointSchema,
  isDefault: z.boolean().optional(),
});

export const passengerProfilePatchSchema = passengerProfileUpdateSchema.extend({
  role: z.literal('passenger'),
});

export const savedLocationParamsSchema = z.object({
  id: z.string().uuid(),
});

export const passengerDashboardQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce
      .number({ invalid_type_error: 'Radius must be numeric' })
      .min(0.1)
      .max(25)
      .optional(),
    limitDrivers: z.coerce
      .number({ invalid_type_error: 'Limit must be numeric' })
      .int()
      .min(1)
      .max(100)
      .optional(),
    recentTrips: z.coerce
      .number({ invalid_type_error: 'Recent trips must be numeric' })
      .int()
      .min(0)
      .max(10)
      .default(3),
  })
  .refine(
    (value) =>
      (value.lat === undefined && value.lng === undefined) ||
      (value.lat !== undefined && value.lng !== undefined),
    {
      message: 'Latitude and longitude must be provided together',
      path: ['lat'],
    },
  );

export type CreateSavedLocationInput = z.infer<typeof createSavedLocationSchema>;
export type PassengerProfilePatchInput = z.infer<typeof passengerProfilePatchSchema>;
export type SavedLocationParamsInput = z.infer<typeof savedLocationParamsSchema>;
export type PassengerDashboardQueryInput = z.infer<typeof passengerDashboardQuerySchema>;

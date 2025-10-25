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

export type CreateSavedLocationInput = z.infer<typeof createSavedLocationSchema>;
export type PassengerProfilePatchInput = z.infer<typeof passengerProfilePatchSchema>;
export type SavedLocationParamsInput = z.infer<typeof savedLocationParamsSchema>;

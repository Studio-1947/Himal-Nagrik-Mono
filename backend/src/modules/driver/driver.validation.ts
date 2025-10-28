import { z } from 'zod';

import {
  driverProfileUpdateSchema,
  driverRegisterSchema,
} from '../auth/auth.validation';

export const driverProfilePatchSchema = driverProfileUpdateSchema.extend({
  role: z.literal('driver'),
});

export const driverDocumentSchema = z.object({
  documentType: z.string().trim().min(1).max(120),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const driverAvailabilityToggleSchema = z
  .object({
    isActive: z.boolean().optional(),
  })
  .optional();

export type DriverProfilePatchInput = z.infer<typeof driverProfilePatchSchema>;
export type DriverDocumentInput = z.infer<typeof driverDocumentSchema>;
export type DriverAvailabilityToggleInput = z.infer<
  typeof driverAvailabilityToggleSchema
>;

export const driverRegisterInputSchema = driverRegisterSchema;

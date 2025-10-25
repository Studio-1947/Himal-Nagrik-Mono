import { z } from 'zod';

import type {
  DriverAvailability,
  DriverStats,
  DriverVehicle,
  PassengerPreferences,
  PassengerRecentTrip,
} from './auth.types';

export const emailSchema = z.string().trim().toLowerCase().email();
export const passwordSchema = z.string().min(8).max(128);
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d+()\-.\s]{7,20}$/, { message: 'Phone number format is invalid' })
  .optional();

export const passengerPreferencesSchema: z.ZodType<PassengerPreferences> = z.object({
  preferredSeat: z.enum(['front', 'middle', 'back']).optional(),
  musicPreference: z.enum(['quiet', 'neutral', 'lively']).optional(),
  accessibilityNeeds: z.string().trim().max(200).optional(),
  favouriteRoutes: z.array(z.string().trim().min(1)).max(20).optional(),
});

export const passengerEmergencyContactSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(5).max(20),
    relation: z.string().trim().max(80).optional(),
  })
  .optional();

export const driverVehicleSchema: z.ZodType<Partial<DriverVehicle>> = z.object({
  manufacturer: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  registrationNumber: z.string().trim().max(60).optional(),
  capacity: z.coerce.number().int().min(1).max(12).optional(),
  color: z.string().trim().max(60).optional(),
});

export const driverAvailabilitySchema: z.ZodType<Partial<DriverAvailability>> = z.object({
  weekdays: z.array(z.string().trim().min(1)).max(7).optional(),
  shift: z.enum(['morning', 'day', 'evening', 'night']).optional(),
});

export const driverStatsSchema: z.ZodType<Partial<DriverStats>> = z.object({
  totalTrips: z.coerce.number().int().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  yearsOfExperience: z.coerce.number().int().min(0).optional(),
  cancellationRate: z.coerce.number().min(0).max(100).optional(),
});

const baseRegisterSchema = z.object({
  role: z.enum(['passenger', 'driver']),
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  location: z.string().trim().max(180).optional(),
  bio: z.string().trim().max(500).optional(),
});

export const passengerRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('passenger'),
  preferences: passengerPreferencesSchema.optional(),
  emergencyContact: passengerEmergencyContactSchema,
});

export const driverRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('driver'),
  licenseNumber: z.string().trim().max(80).optional(),
  vehicle: driverVehicleSchema.optional(),
  availability: driverAvailabilitySchema.optional(),
  yearsOfExperience: z.coerce.number().int().min(0).optional(),
});

export const registerSchema = z.union([passengerRegisterSchema, driverRegisterSchema]);

export const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
  role: z.enum(['passenger', 'driver']),
});

export const passengerRecentTripSchema: z.ZodType<PassengerRecentTrip> = z.object({
  id: z.string().trim().min(1),
  route: z.string().trim().min(1),
  date: z.string().trim().min(1),
  driver: z.string().trim().min(1),
  status: z.enum(['completed', 'cancelled', 'scheduled']),
});

export const passengerProfileUpdateSchema = z.object({
  role: z.literal('passenger'),
  name: z.string().trim().max(120).optional(),
  phone: phoneSchema,
  location: z.string().trim().max(180).optional(),
  bio: z.string().trim().max(500).optional(),
  emergencyContact: passengerEmergencyContactSchema,
  preferences: passengerPreferencesSchema.optional(),
  recentTrips: z.array(passengerRecentTripSchema).max(50).optional(),
});

export const driverProfileUpdateSchema = z.object({
  role: z.literal('driver'),
  name: z.string().trim().max(120).optional(),
  phone: phoneSchema,
  location: z.string().trim().max(180).optional(),
  bio: z.string().trim().max(500).optional(),
  vehicle: driverVehicleSchema.optional(),
  availability: driverAvailabilitySchema.optional(),
  stats: driverStatsSchema.optional(),
  licenseNumber: z.string().trim().max(80).optional(),
});

export const profileUpdateSchema = z.union([
  passengerProfileUpdateSchema,
  driverProfileUpdateSchema,
]);

export type RegisterInput = z.infer<typeof registerSchema>;
export type PassengerRegisterInput = z.infer<typeof passengerRegisterSchema>;
export type DriverRegisterInput = z.infer<typeof driverRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PassengerProfileUpdateInput = z.infer<typeof passengerProfileUpdateSchema>;
export type DriverProfileUpdateInput = z.infer<typeof driverProfileUpdateSchema>;

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const appUsers = pgTable('app_users', {
  id: uuid('id').primaryKey(),
  role: text('role').$type<'passenger' | 'driver'>().notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  location: text('location'),
  bio: text('bio'),
  emergencyContact: jsonb('emergency_contact').$type<unknown | null>(),
  preferences: jsonb('preferences').$type<unknown | null>(),
  vehicle: jsonb('vehicle').$type<unknown | null>(),
  availability: jsonb('availability').$type<unknown | null>(),
  stats: jsonb('stats').$type<unknown | null>(),
  recentTrips: jsonb('recent_trips').$type<unknown | null>(),
  licenseNumber: text('license_number'),
  yearsOfExperience: integer('years_of_experience'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const driverDocuments = pgTable('driver_documents', {
  id: uuid('id').primaryKey(),
  driverId: uuid('driver_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  documentType: text('document_type').notNull(),
  status: text('status')
    .$type<'pending' | 'approved' | 'rejected' | 'expired'>()
    .notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey(),
  driverId: uuid('driver_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  manufacturer: text('manufacturer').notNull(),
  model: text('model').notNull(),
  registrationNumber: text('registration_number').notNull(),
  capacity: integer('capacity').notNull(),
  color: text('color'),
  vehicleType: text('vehicle_type'),
  year: integer('year'),
  status: text('status')
    .$type<'pending' | 'approved' | 'rejected' | 'inactive'>()
    .default('pending')
    .notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const passengerSavedLocations = pgTable('passenger_saved_locations', {
  id: uuid('id').primaryKey(),
  passengerId: uuid('passenger_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  label: text('label').notNull(),
  address: text('address').notNull(),
  location: jsonb('location').$type<Record<string, unknown>>().notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rides = pgTable('rides', {
  id: uuid('id').primaryKey(),
  passengerId: uuid('passenger_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  driverId: uuid('driver_id').references(() => appUsers.id, { onDelete: 'set null' }),
  status: text('status')
    .$type<
      | 'requested'
      | 'driver_assigned'
      | 'enroute_pickup'
      | 'passenger_onboard'
      | 'completed'
      | 'cancelled_passenger'
      | 'cancelled_driver'
      | 'cancelled_system'
    >()
    .notNull(),
  pickupLocation: jsonb('pickup_location').$type<Record<string, unknown>>().notNull(),
  dropoffLocation: jsonb('dropoff_location').$type<Record<string, unknown>>().notNull(),
  fareQuote: jsonb('fare_quote').$type<Record<string, unknown> | null>(),
  fareActual: jsonb('fare_actual').$type<Record<string, unknown> | null>(),
  distanceMeters: integer('distance_meters'),
  durationSeconds: integer('duration_seconds'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  pickupEta: timestamp('pickup_eta', { withTimezone: true }),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  surgeMultiplier: numeric('surge_multiplier', { precision: 6, scale: 2 }),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rideEvents = pgTable('ride_events', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  rideId: uuid('ride_id')
    .references(() => rides.id, { onDelete: 'cascade' })
    .notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rideAssignments = pgTable('ride_assignments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  rideId: uuid('ride_id')
    .references(() => rides.id, { onDelete: 'cascade' })
    .notNull(),
  driverId: uuid('driver_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status')
    .$type<'pending' | 'accepted' | 'declined' | 'expired' | 'reassigned'>()
    .notNull(),
  score: numeric('score', { precision: 8, scale: 4 }),
  reason: text('reason'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey(),
  rideId: uuid('ride_id')
    .references(() => rides.id, { onDelete: 'cascade' })
    .notNull(),
  passengerId: uuid('passenger_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').default('INR').notNull(),
  status: text('status')
    .$type<'pending' | 'authorized' | 'captured' | 'refunded' | 'failed'>()
    .notNull(),
  provider: text('provider').notNull(),
  providerPaymentId: text('provider_payment_id'),
  capturedAt: timestamp('captured_at', { withTimezone: true }),
  refundedAmountCents: integer('refunded_amount_cents'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey(),
  driverId: uuid('driver_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').default('INR').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  status: text('status')
    .$type<'pending' | 'processing' | 'completed' | 'failed'>()
    .notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  rideId: uuid('ride_id').references(() => rides.id, { onDelete: 'set null' }),
  status: text('status')
    .$type<'open' | 'in_progress' | 'resolved' | 'closed'>()
    .notNull(),
  priority: text('priority')
    .$type<'low' | 'medium' | 'high' | 'urgent'>()
    .default('medium')
    .notNull(),
  category: text('category'),
  subject: text('subject'),
  description: text('description'),
  assignee: text('assignee'),
  resolutionNotes: text('resolution_notes'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

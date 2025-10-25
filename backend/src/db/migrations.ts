import { pool } from '../config/database';

const createUsersTable = `
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT UNIQUE,
  location TEXT,
  bio TEXT,
  emergency_contact JSONB,
  preferences JSONB,
  vehicle JSONB,
  availability JSONB,
  stats JSONB,
  recent_trips JSONB,
  license_number TEXT,
  years_of_experience INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createEmailIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_unique
  ON app_users (LOWER(email));
`;

const createRoleIndex = `
CREATE INDEX IF NOT EXISTS app_users_role_idx
  ON app_users (role);
`;

const createPhoneIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS app_users_phone_unique
  ON app_users (phone)
  WHERE phone IS NOT NULL;
`;

const createDriverDocumentsTable = `
CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  metadata JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, document_type)
);
`;

const createDriverDocumentsIndexes = `
CREATE INDEX IF NOT EXISTS driver_documents_driver_idx ON driver_documents (driver_id);
CREATE INDEX IF NOT EXISTS driver_documents_status_idx ON driver_documents (status);
`;

const createVehiclesTable = `
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL,
  color TEXT,
  vehicle_type TEXT,
  year INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createVehiclesIndexes = `
CREATE INDEX IF NOT EXISTS vehicles_driver_idx ON vehicles (driver_id);
CREATE INDEX IF NOT EXISTS vehicles_status_idx ON vehicles (status);
`;

const createPassengerSavedLocationsTable = `
CREATE TABLE IF NOT EXISTS passenger_saved_locations (
  id UUID PRIMARY KEY,
  passenger_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  location JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createPassengerSavedLocationsIndex = `
CREATE INDEX IF NOT EXISTS passenger_saved_locations_passenger_idx
  ON passenger_saved_locations (passenger_id);
`;

const createRidesTable = `
CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY,
  passenger_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'requested',
      'driver_assigned',
      'enroute_pickup',
      'passenger_onboard',
      'completed',
      'cancelled_passenger',
      'cancelled_driver',
      'cancelled_system'
    )
  ),
  pickup_location JSONB NOT NULL,
  dropoff_location JSONB NOT NULL,
  fare_quote JSONB,
  fare_actual JSONB,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  pickup_eta TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  surge_multiplier NUMERIC(6, 2),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createRidesIndexes = `
CREATE INDEX IF NOT EXISTS rides_passenger_idx ON rides (passenger_id);
CREATE INDEX IF NOT EXISTS rides_driver_idx ON rides (driver_id);
CREATE INDEX IF NOT EXISTS rides_status_idx ON rides (status);
CREATE INDEX IF NOT EXISTS rides_requested_at_idx ON rides (requested_at);
`;

const createRideEventsTable = `
CREATE TABLE IF NOT EXISTS ride_events (
  id BIGSERIAL PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createRideEventsIndex = `
CREATE INDEX IF NOT EXISTS ride_events_ride_idx ON ride_events (ride_id);
`;

const createRideAssignmentsTable = `
CREATE TABLE IF NOT EXISTS ride_assignments (
  id BIGSERIAL PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'accepted', 'declined', 'expired', 'reassigned')
  ),
  score NUMERIC(8, 4),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);
`;

const createRideAssignmentsIndexes = `
CREATE INDEX IF NOT EXISTS ride_assignments_ride_idx ON ride_assignments (ride_id);
CREATE INDEX IF NOT EXISTS ride_assignments_driver_idx ON ride_assignments (driver_id);
CREATE INDEX IF NOT EXISTS ride_assignments_status_idx ON ride_assignments (status);
`;

const createPaymentsTable = `
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'authorized', 'captured', 'refunded', 'failed')
  ),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  captured_at TIMESTAMPTZ,
  refunded_amount_cents INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createPaymentsIndexes = `
CREATE INDEX IF NOT EXISTS payments_ride_idx ON payments (ride_id);
CREATE INDEX IF NOT EXISTS payments_passenger_idx ON payments (passenger_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);
`;

const createPayoutsTable = `
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  metadata JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createPayoutsIndexes = `
CREATE INDEX IF NOT EXISTS payouts_driver_idx ON payouts (driver_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts (status);
CREATE INDEX IF NOT EXISTS payouts_period_idx ON payouts (period_start, period_end);
`;

const createSupportTicketsTable = `
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (
    status IN ('open', 'in_progress', 'resolved', 'closed')
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  category TEXT,
  subject TEXT,
  description TEXT,
  assignee TEXT,
  resolution_notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createSupportTicketsIndexes = `
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_priority_idx ON support_tickets (priority);
`;

export const runMigrations = async (): Promise<void> => {
  await pool.query(createUsersTable);
  await pool.query(createEmailIndex);
  await pool.query(createRoleIndex);
  await pool.query(createPhoneIndex);
  await pool.query(createDriverDocumentsTable);
  await pool.query(createDriverDocumentsIndexes);
  await pool.query(createVehiclesTable);
  await pool.query(createVehiclesIndexes);
  await pool.query(createPassengerSavedLocationsTable);
  await pool.query(createPassengerSavedLocationsIndex);
  await pool.query(createRidesTable);
  await pool.query(createRidesIndexes);
  await pool.query(createRideEventsTable);
  await pool.query(createRideEventsIndex);
  await pool.query(createRideAssignmentsTable);
  await pool.query(createRideAssignmentsIndexes);
  await pool.query(createPaymentsTable);
  await pool.query(createPaymentsIndexes);
  await pool.query(createPayoutsTable);
  await pool.query(createPayoutsIndexes);
  await pool.query(createSupportTicketsTable);
  await pool.query(createSupportTicketsIndexes);
};

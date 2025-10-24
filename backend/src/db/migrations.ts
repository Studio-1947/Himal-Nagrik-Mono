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

const createBookingsTable = `
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY,
  passenger_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  pickup_location JSONB NOT NULL,
  destination_location JSONB NOT NULL,
  pickup_time TIMESTAMPTZ NOT NULL,
  estimated_duration INTEGER, -- in minutes
  estimated_distance DECIMAL(10,2), -- in km
  estimated_fare DECIMAL(10,2),
  actual_fare DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  vehicle_type TEXT NOT NULL DEFAULT 'standard' CHECK (vehicle_type IN ('standard', 'premium', 'suv', 'shared')),
  passenger_count INTEGER NOT NULL DEFAULT 1 CHECK (passenger_count >= 1 AND passenger_count <= 8),
  special_requests TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'digital_wallet')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  trip_started_at TIMESTAMPTZ,
  trip_completed_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES app_users(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createRatingsTable = `
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rated_by UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  rated_user UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createDriverLocationsTable = `
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  heading DECIMAL(5,2), -- direction in degrees
  speed DECIMAL(5,2), -- speed in km/h
  is_available BOOLEAN NOT NULL DEFAULT true,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createNotificationsTable = `
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking', 'trip', 'payment', 'system', 'promotion')),
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createPaymentsTable = `
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NPR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'digital_wallet')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,
  gateway_response JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const createFareConfigTable = `
CREATE TABLE IF NOT EXISTS fare_config (
  id UUID PRIMARY KEY,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('standard', 'premium', 'suv', 'shared')),
  base_fare DECIMAL(10,2) NOT NULL,
  per_km_rate DECIMAL(10,2) NOT NULL,
  per_minute_rate DECIMAL(10,2) NOT NULL,
  minimum_fare DECIMAL(10,2) NOT NULL,
  surge_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

// Indexes for better performance
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

const createBookingIndexes = `
CREATE INDEX IF NOT EXISTS bookings_passenger_id_idx ON bookings (passenger_id);
CREATE INDEX IF NOT EXISTS bookings_driver_id_idx ON bookings (driver_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_pickup_time_idx ON bookings (pickup_time);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at);
`;

const createDriverLocationIndexes = `
CREATE INDEX IF NOT EXISTS driver_locations_driver_id_idx ON driver_locations (driver_id);
CREATE INDEX IF NOT EXISTS driver_locations_is_available_idx ON driver_locations (is_available);
CREATE INDEX IF NOT EXISTS driver_locations_last_updated_idx ON driver_locations (last_updated);
`;

const createNotificationIndexes = `
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications (is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at);
`;

const createRatingIndexes = `
CREATE INDEX IF NOT EXISTS ratings_booking_id_idx ON ratings (booking_id);
CREATE INDEX IF NOT EXISTS ratings_rated_user_idx ON ratings (rated_user);
`;

// Insert default fare configurations
const insertDefaultFareConfig = `
INSERT INTO fare_config (id, vehicle_type, base_fare, per_km_rate, per_minute_rate, minimum_fare)
VALUES 
  (gen_random_uuid(), 'standard', 50.00, 15.00, 2.00, 80.00),
  (gen_random_uuid(), 'premium', 80.00, 25.00, 3.00, 120.00),
  (gen_random_uuid(), 'suv', 100.00, 30.00, 4.00, 150.00),
  (gen_random_uuid(), 'shared', 30.00, 10.00, 1.50, 50.00)
ON CONFLICT DO NOTHING;
`;

export const runMigrations = async (): Promise<void> => {
  try {
    console.log('Running database migrations...');
    
    // Create tables
    await pool.query(createUsersTable);
    await pool.query(createBookingsTable);
    await pool.query(createRatingsTable);
    await pool.query(createDriverLocationsTable);
    await pool.query(createNotificationsTable);
    await pool.query(createPaymentsTable);
    await pool.query(createFareConfigTable);
    
    // Create indexes
    await pool.query(createEmailIndex);
    await pool.query(createRoleIndex);
    await pool.query(createPhoneIndex);
    await pool.query(createBookingIndexes);
    await pool.query(createDriverLocationIndexes);
    await pool.query(createNotificationIndexes);
    await pool.query(createRatingIndexes);
    
    // Insert default data
    await pool.query(insertDefaultFareConfig);
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

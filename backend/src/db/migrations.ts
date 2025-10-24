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

export const runMigrations = async (): Promise<void> => {
  await pool.query(createUsersTable);
  await pool.query(createEmailIndex);
  await pool.query(createRoleIndex);
  await pool.query(createPhoneIndex);
};

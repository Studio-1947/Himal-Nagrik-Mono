import type { Pool } from 'pg';

import { ensureDatabaseConnection, pool as basePool } from '../../config/database';
import { db as baseDb, schema } from './drizzle';

let currentPool: Pool = basePool;
let currentDb = baseDb;

/**
 * Temporary bridge that exposes the existing pg pool through the infrastructure
 * layer. Domain modules should import from here so we can swap in Drizzle ORM
 * without touching each consumer later.
 */
export const database = {
  get pool(): Pool {
    return currentPool;
  },
  ensureConnection: ensureDatabaseConnection,
  get db() {
    return currentDb;
  },
  schema,
};

export type DatabaseClient = typeof baseDb;

export const overrideDatabaseForTesting = ({
  pool,
  db,
}: {
  pool: Pool;
  db: DatabaseClient;
}): void => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('overrideDatabaseForTesting is only available in test environment');
  }
  currentPool = pool;
  currentDb = db;
};

export const resetDatabaseForTesting = (): void => {
  currentPool = basePool;
  currentDb = baseDb;
};

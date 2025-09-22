import { Pool } from 'pg';

import { env, isProduction } from './env';

const connectionOptions = {
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
};

export const pool = new Pool(connectionOptions);

export const verifyDatabaseConnection = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');

    if (!isProduction) {
      console.log('Database connection verified');
    }
  } finally {
    client.release();
  }
};

export const closeDatabasePool = async (): Promise<void> => {
  await pool.end();
};

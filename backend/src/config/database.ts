import { Pool } from 'pg';

import { env, isProduction } from './env';

const connectionOptions = {
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
};

export const pool = new Pool(connectionOptions);

const verifyConnection = async (): Promise<void> => {
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

let verifyPromise: Promise<void> | null = null;
let verified = false;

export const ensureDatabaseConnection = async (): Promise<void> => {
  if (verified) {
    return;
  }

  if (!verifyPromise) {
    verifyPromise = verifyConnection()
      .then(() => {
        verified = true;
      })
      .catch((error) => {
        verifyPromise = null;
        throw error;
      });
  }

  await verifyPromise;
};

export const closeDatabasePool = async (): Promise<void> => {
  await pool.end();
};

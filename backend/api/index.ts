import type { VercelRequest, VercelResponse } from '@vercel/node';

import { createApp } from '../src/app';
import { ensureDatabaseConnection } from '../src/config/database';
import { runMigrations } from '../src/db/migrations';

const app = createApp();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    await ensureDatabaseConnection();
    await runMigrations();
  } catch (error) {
    console.error('Database connection failed');
    res.status(500).json({
      statusCode: 500,
      message: 'Database connection failed',
    });
    return;
  }

  app(req, res);
}

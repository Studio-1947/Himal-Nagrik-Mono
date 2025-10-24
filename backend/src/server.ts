import { createServer } from 'http';

import { createApp } from './app';
import { env } from './config/env';
import { ensureDatabaseConnection, closeDatabasePool } from './config/database';
import { runMigrations } from './db/migrations';

const app = createApp();
const server = createServer(app);

const start = async (): Promise<void> => {
  try {
    await ensureDatabaseConnection();
    await runMigrations();
  } catch (error) {
    console.error('Failed to connect to the database');
    console.error(error);
    process.exit(1);
  }

  server.listen(env.port, () => {
    console.log(`API ready at http://localhost:${env.port}`);
    console.log(`Health endpoint: http://localhost:${env.port}${env.apiPrefix}/health`);
  });
};

const shutdown = async (): Promise<void> => {
  try {
    await closeDatabasePool();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error while closing database pool');
    console.error(error);
  } finally {
    console.log('HTTP server closed');
    process.exit(0);
  }
};

const onClose = (signal: NodeJS.Signals): void => {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    void shutdown();
  });
};

void start();

process.on('SIGINT', onClose);
process.on('SIGTERM', onClose);

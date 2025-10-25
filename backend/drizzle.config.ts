import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

loadEnv({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.warn(
    '[drizzle] DATABASE_URL is not set. CLI commands may fail until the environment variable is configured.',
  );
}

export default defineConfig({
  schema: './src/infra/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});

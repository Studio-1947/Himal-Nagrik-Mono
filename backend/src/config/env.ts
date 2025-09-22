import { config } from 'dotenv';

config();

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const parsePort = (value: string): number => {
  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid port number: ${value}`);
  }

  return parsed;
};

export const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: parsePort(getEnv('PORT', '5000')),
  apiPrefix: getEnv('API_PREFIX', '/api'),
  databaseUrl: getEnv('DATABASE_URL'),
};

export const isProduction = env.nodeEnv === 'production';

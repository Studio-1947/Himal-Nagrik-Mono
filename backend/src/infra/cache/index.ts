import type { RedisClientType } from './types';

let redisClient: RedisClientType | null = null;

/**
 * Returns the shared Redis client once the caching layer is wired up.
 * For now, it returns null so existing flows remain unaffected while we
 * introduce the dependency gradually.
 */
export const getRedisClient = (): RedisClientType | null => redisClient;

/**
 * Allows future bootstrapping code to configure the Redis client. Keeping this
 * setter in place lets us initialise the cache in server startup without
 * refactoring call sites.
 */
export const setRedisClient = (client: RedisClientType): void => {
  redisClient = client;
};

import Redis from 'ioredis';

import { env } from '../../config/env';
import { getRedisClient, setRedisClient } from '.';
import type { RedisClientType } from './types';

const DRIVER_STATE_TTL_SECONDS = 60 * 5;

let nativeClient: Redis | null = null;

const createRedisAdapter = (client: Redis): RedisClientType => ({
  disconnect: () => client.disconnect(),
  quit: () => client.quit(),
  lPush: (key, value) => client.lpush(key, value),
  rPop: (key) => client.rpop(key),
  zAdd: (key, members) => {
    if (members.length === 0) {
      return Promise.resolve(0);
    }

    const args = members.flatMap((member) => [member.score, member.value]);
    return client.zadd(key, ...args);
  },
  zPopMin: async (key) => {
    const raw = await client.zpopmin(key, 1);
    const result: Array<{ value: string; score: number }> = [];

    for (let index = 0; index < raw.length; index += 2) {
      const value = raw[index];
      const score = raw[index + 1];
      if (value === undefined || score === undefined) {
        continue;
      }
      result.push({ value, score: Number(score) });
    }

    return result;
  },
  zRem: (key, member) => client.zrem(key, member),
  zRange: (key, start, stop) => client.zrange(key, start, stop),
  zCard: (key) => client.zcard(key),
  hSet: (key, values) => client.hset(key, values),
  hGetAll: (key) => client.hgetall(key),
  expire: (key, seconds) => {
    if (seconds <= 0) {
      return Promise.resolve(0);
    }
    return client.expire(key, seconds);
  },
  del: (...keys) => client.del(...keys),
  keys: (pattern) => client.keys(pattern),
});

export const connectRedis = async (): Promise<RedisClientType | null> => {
  if (getRedisClient()) {
    return getRedisClient();
  }

  if (!env.redisUrl) {
    console.warn('[cache] Redis URL not configured; continuing without cache');
    return null;
  }

  if (nativeClient) {
    return getRedisClient();
  }

  const client = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableAutoPipelining: true,
  });

  client.on('error', (error) => {
    console.error('[cache] Redis error', error);
  });

  try {
    await client.connect();
    console.log('[cache] Redis connection established');
  } catch (error) {
    console.error('[cache] Failed to connect to Redis', error);
    client.disconnect();
    return null;
  }

  nativeClient = client;
  const adapter = createRedisAdapter(client);
  setRedisClient(adapter);

  // Ensure driver state keys expire automatically even if a shutdown occurs without cleanup.
  void client.config('SET', 'notify-keyspace-events', 'Ex');

  return adapter;
};

export const disconnectRedis = async (): Promise<void> => {
  const client = nativeClient;
  nativeClient = null;
  setRedisClient(null);

  if (!client) {
    return;
  }

  try {
    await client.quit();
  } catch (error) {
    console.error('[cache] Error while quitting Redis client', error);
    client.disconnect();
  }
};

export const getDriverStateTtlSeconds = (): number => DRIVER_STATE_TTL_SECONDS;

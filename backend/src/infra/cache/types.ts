/**
 * Placeholder Redis type. Once ioredis is added, replace this alias with the
 * real client type to unlock typed interactions.
 */
export type RedisClientType = {
  disconnect: () => Promise<void> | void;
};

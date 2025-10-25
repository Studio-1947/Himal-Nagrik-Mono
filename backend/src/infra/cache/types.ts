export type RedisClientType = {
  disconnect: () => Promise<void> | void;
  quit: () => Promise<void> | void;
  lPush: (key: string, value: string) => Promise<number>;
  rPop: (key: string) => Promise<string | null>;
  zAdd: (key: string, members: Array<{ score: number; value: string }>) => Promise<number>;
  zPopMin: (key: string) => Promise<Array<{ value: string; score: number }>>;
  zRem: (key: string, member: string) => Promise<number>;
  zRange: (key: string, start: number, stop: number) => Promise<string[]>;
  zCard: (key: string) => Promise<number>;
  hSet: (key: string, values: Record<string, string>) => Promise<number>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  expire: (key: string, seconds: number) => Promise<number>;
  del: (...keys: string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
};

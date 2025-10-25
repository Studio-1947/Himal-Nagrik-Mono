import { and, eq, ne, sql } from 'drizzle-orm';

import { database } from '../../infra/database';
import { appUsers } from '../../infra/database/schema';
import type { AuthRole, DbUser, NewDbUser } from './auth.types';

type QueryClient = typeof database.db;

const getExecutor = (client?: QueryClient): QueryClient => client ?? database.db;

export const authRepository = {
  async findById(id: string, client?: QueryClient): Promise<DbUser | null> {
    const executor = getExecutor(client);
    const [user] = await executor
      .select()
      .from(appUsers)
      .where(eq(appUsers.id, id))
      .limit(1);
    return user ?? null;
  },

  async findByEmail(email: string, role: AuthRole, client?: QueryClient): Promise<DbUser | null> {
    const executor = getExecutor(client);
    const normalized = email.trim().toLowerCase();
    const [user] = await executor
      .select()
      .from(appUsers)
      .where(and(eq(appUsers.email, normalized), eq(appUsers.role, role)))
      .limit(1);
    return user ?? null;
  },

  async findByPhone(phone: string, role: AuthRole, client?: QueryClient): Promise<DbUser | null> {
    const executor = getExecutor(client);
    const normalized = phone.trim();
    const [user] = await executor
      .select()
      .from(appUsers)
      .where(and(eq(appUsers.phone, normalized), eq(appUsers.role, role)))
      .limit(1);
    return user ?? null;
  },

  async emailExists(email: string, client?: QueryClient): Promise<boolean> {
    const executor = getExecutor(client);
    const normalized = email.trim().toLowerCase();
    const result = await executor
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.email, normalized))
      .limit(1);
    return result.length > 0;
  },

  async phoneExists(phone: string, excludeUserId?: string, client?: QueryClient): Promise<boolean> {
    const executor = getExecutor(client);
    const normalized = phone.trim();
    const whereClause =
      excludeUserId !== undefined
        ? and(eq(appUsers.phone, normalized), ne(appUsers.id, excludeUserId))
        : eq(appUsers.phone, normalized);
    const result = await executor
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(whereClause)
      .limit(1);
    return result.length > 0;
  },

  async insertUser(values: NewDbUser, client?: QueryClient): Promise<DbUser> {
    const executor = getExecutor(client);
    const [user] = await executor.insert(appUsers).values(values).returning();
    if (!user) {
      throw new Error('Failed to insert user');
    }
    return user;
  },

  async updateUser(
    id: string,
    values: Partial<Omit<NewDbUser, 'id'>>,
    client?: QueryClient,
  ): Promise<DbUser> {
    const executor = getExecutor(client);
    const [user] = await executor
      .update(appUsers)
      .set(values)
      .where(eq(appUsers.id, id))
      .returning();
    if (!user) {
      throw new Error('User not found during update');
    }
    return user;
  },
};

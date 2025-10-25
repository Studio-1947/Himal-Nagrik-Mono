import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { database } from '../../src/infra/database';
import { authRepository } from '../../src/modules/auth/auth.repository';
import type { DbUser, NewDbUser } from '../../src/modules/auth/auth.types';

const app = createApp();

type UserStore = Map<string, DbUser>;

const cloneUser = (user: DbUser): DbUser => JSON.parse(JSON.stringify(user));

describe.sequential('Auth flows', () => {
  let users: UserStore;
  let emailToId: Map<string, string>;
  let phoneToId: Map<string, string>;

  beforeEach(() => {
    users = new Map();
    emailToId = new Map();
    phoneToId = new Map();

    vi.spyOn(database, 'db', 'get').mockReturnValue({
      transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback(undefined),
    } as unknown as typeof database.db);

    vi.spyOn(authRepository, 'emailExists').mockImplementation(async (email) => emailToId.has(email));

    vi.spyOn(authRepository, 'phoneExists').mockImplementation(async (phone, excludeId) => {
      const existingId = phone ? phoneToId.get(phone) : undefined;
      if (!existingId) {
        return false;
      }
      if (excludeId && existingId === excludeId) {
        return false;
      }
      return true;
    });

    vi.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      const user = users.get(id);
      return user ? cloneUser(user) : null;
    });

    vi.spyOn(authRepository, 'findByEmail').mockImplementation(async (email, role) => {
      const id = emailToId.get(email);
      if (!id) {
        return null;
      }
      const user = users.get(id);
      return user && user.role === role ? cloneUser(user) : null;
    });

    vi.spyOn(authRepository, 'findByPhone').mockImplementation(async (phone, role) => {
      if (!phone) {
        return null;
      }
      const id = phoneToId.get(phone);
      if (!id) {
        return null;
      }
      const user = users.get(id);
      return user && user.role === role ? cloneUser(user) : null;
    });

    vi.spyOn(authRepository, 'insertUser').mockImplementation(async (values: NewDbUser) => {
      const user: DbUser = { ...values } as DbUser;
      users.set(user.id, user);
      emailToId.set(user.email, user.id);
      if (user.phone) {
        phoneToId.set(user.phone, user.id);
      }
      return cloneUser(user);
    });

    vi.spyOn(authRepository, 'updateUser').mockImplementation(async (id, updates) => {
      const existing = users.get(id);
      if (!existing) {
        throw new Error('User not found during update');
      }
      const updated: DbUser = {
        ...existing,
        ...updates,
      } as DbUser;
      users.set(id, updated);
      if (updated.phone) {
        phoneToId.set(updated.phone, id);
      }
      return cloneUser(updated);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers and authenticates a passenger user', async () => {
    const registrationPayload = {
      role: 'passenger',
      name: 'Test Passenger',
      email: 'passenger@example.com',
      password: 'SecurePass123',
      phone: '+1234567890',
      preferences: {
        preferredSeat: 'back',
      },
    };

    const registerResponse = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send(registrationPayload);

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.token).toBeDefined();
    expect(registerResponse.body.profile.role).toBe('passenger');
    expect(registerResponse.body.profile.email).toBe(registrationPayload.email);

    const loginResponse = await request(app)
      .post(`${env.apiPrefix}/auth/login`)
      .send({
        identifier: registrationPayload.email,
        password: registrationPayload.password,
        role: 'passenger',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    const profileResponse = await request(app)
      .get(`${env.apiPrefix}/auth/profile`)
      .set('Authorization', `Bearer ${loginResponse.body.token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.email).toBe(registrationPayload.email);
  });

  it('registers and authenticates a driver user', async () => {
    const registrationPayload = {
      role: 'driver',
      name: 'Test Driver',
      email: 'driver@example.com',
      password: 'DriverPass123',
      phone: '+9876543210',
      licenseNumber: 'DL-1234567',
      vehicle: {
        manufacturer: 'Toyota',
        model: 'Prius',
        registrationNumber: 'XYZ-1234',
        capacity: 4,
      },
    };

    const registerResponse = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send(registrationPayload);

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.profile.role).toBe('driver');
    expect(registerResponse.body.profile.vehicle).toBeDefined();

    const loginResponse = await request(app)
      .post(`${env.apiPrefix}/auth/login`)
      .send({
        identifier: registrationPayload.email,
        password: registrationPayload.password,
        role: 'driver',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.profile.role).toBe('driver');

    const profileResponse = await request(app)
      .get(`${env.apiPrefix}/auth/profile`)
      .set('Authorization', `Bearer ${registerResponse.body.token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.licenseNumber).toBe(registrationPayload.licenseNumber);
  });
});

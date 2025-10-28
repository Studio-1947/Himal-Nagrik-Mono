import { randomUUID } from 'node:crypto';

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { database } from '../../src/infra/database';
import { authRepository } from '../../src/modules/auth/auth.repository';
import type { DbUser, NewDbUser } from '../../src/modules/auth/auth.types';
import { driverRepository } from '../../src/modules/driver/driver.repository';
import type { DriverDocument } from '../../src/modules/driver/driver.types';

const app = createApp();

type UserStore = Map<string, DbUser>;
type DocumentStore = Map<string, DriverDocument[]>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe.sequential('Driver module flows', () => {
  let users: UserStore;
  let emailToId: Map<string, string>;
  let phoneToId: Map<string, string>;
  let documents: DocumentStore;

  beforeEach(() => {
    users = new Map();
    emailToId = new Map();
    phoneToId = new Map();
    documents = new Map();

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
      return user ? clone(user) : null;
    });
    vi.spyOn(authRepository, 'findByEmail').mockImplementation(async (email, role) => {
      const id = emailToId.get(email);
      if (!id) {
        return null;
      }
      const user = users.get(id);
      return user && user.role === role ? clone(user) : null;
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
      return user && user.role === role ? clone(user) : null;
    });
    vi.spyOn(authRepository, 'insertUser').mockImplementation(async (values: NewDbUser) => {
      const user: DbUser = { ...values } as DbUser;
      users.set(user.id, user);
      emailToId.set(user.email, user.id);
      if (user.phone) {
        phoneToId.set(user.phone, user.id);
      }
      documents.set(user.id, []);
      return clone(user);
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
      return clone(updated);
    });

    vi.spyOn(driverRepository, 'listDocuments').mockImplementation(async (driverId) => {
      return (documents.get(driverId) ?? []).map((doc) => clone(doc));
    });

    vi.spyOn(driverRepository, 'createDocument').mockImplementation(async (driverId, input) => {
      const record: DriverDocument = {
        id: randomUUID(),
        driverId,
        documentType: input.documentType,
        status: 'pending',
        metadata: input.metadata ?? null,
        submittedAt: new Date().toISOString(),
        verifiedAt: null,
        rejectionReason: null,
      };
      const bucket = documents.get(driverId) ?? [];
      bucket.push(record);
      documents.set(driverId, bucket);
      return clone(record);
    });

    vi.spyOn(driverRepository, 'listVehicles').mockResolvedValue([]);
    vi.spyOn(driverRepository, 'upsertVehicle').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns driver profile and allows updates', async () => {
    const registrationPayload = {
      role: 'driver',
      name: 'Driver One',
      email: 'driver1@example.com',
      password: 'DriverPass123',
      phone: '+9990001111',
      vehicle: {
        manufacturer: 'Toyota',
        model: 'Innova',
        registrationNumber: 'WB-01A-1234',
        capacity: 6,
        color: 'Silver',
      },
      availability: {
        weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        shift: 'day' as const,
      },
      yearsOfExperience: 5,
    };

    const registerResponse = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send(registrationPayload);

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;

    const profileResponse = await request(app)
      .get(`${env.apiPrefix}/drivers/me`)
      .set('Authorization', `Bearer ${token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.role).toBe('driver');
    expect(profileResponse.body.documents).toHaveLength(0);

    const updateResponse = await request(app)
      .patch(`${env.apiPrefix}/drivers/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        role: 'driver',
        bio: 'Mountain route specialist',
        availability: {
          shift: 'evening',
          weekdays: ['Fri', 'Sat'],
        },
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.bio).toBe('Mountain route specialist');
    expect(updateResponse.body.availability.shift).toBe('evening');
  });

  it('allows toggling availability and submitting documents', async () => {
    const registrationPayload = {
      role: 'driver',
      name: 'Driver Two',
      email: 'driver2@example.com',
      password: 'DriverPass123',
      phone: '+9990002222',
    };

    const registerResponse = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send(registrationPayload);

    const token = registerResponse.body.token as string;

    const toggleResponse = await request(app)
      .post(`${env.apiPrefix}/drivers/me/availability/toggle`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });

    expect(toggleResponse.status).toBe(200);
    expect(toggleResponse.body.availability.isActive).toBe(false);

    const documentResponse = await request(app)
      .post(`${env.apiPrefix}/drivers/me/documents`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        documentType: 'driving_license',
        metadata: {
          number: 'DL-1234567',
          issuedBy: 'Regional Transport Office',
        },
      });

    expect(documentResponse.status).toBe(201);
    expect(documentResponse.body.documents).toHaveLength(1);
    expect(documentResponse.body.documents[0].documentType).toBe('driving_license');
  });
});

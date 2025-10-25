import { randomUUID } from 'node:crypto';

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { database } from '../../src/infra/database';
import { authRepository } from '../../src/modules/auth/auth.repository';
import type { DbUser, NewDbUser } from '../../src/modules/auth/auth.types';
import { passengerRepository } from '../../src/modules/passenger/passenger.repository';
import type { PassengerSavedLocation } from '../../src/modules/passenger/passenger.types';

const app = createApp();

type UserStore = Map<string, DbUser>;
type LocationStore = Map<string, PassengerSavedLocation[]>;

const cloneUser = (user: DbUser): DbUser => JSON.parse(JSON.stringify(user));
const cloneLocation = (location: PassengerSavedLocation): PassengerSavedLocation =>
  JSON.parse(JSON.stringify(location));

describe.sequential('Passenger module flows', () => {
  let users: UserStore;
  let emailToId: Map<string, string>;
  let phoneToId: Map<string, string>;
  let locations: LocationStore;

  beforeEach(() => {
    users = new Map();
    emailToId = new Map();
    phoneToId = new Map();
    locations = new Map();

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
      if (!id) return null;
      const user = users.get(id);
      return user && user.role === role ? cloneUser(user) : null;
    });
    vi.spyOn(authRepository, 'findByPhone').mockImplementation(async (phone, role) => {
      if (!phone) return null;
      const id = phoneToId.get(phone);
      if (!id) return null;
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
      locations.set(user.id, []);
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

    vi.spyOn(passengerRepository, 'listSavedLocations').mockImplementation(async (passengerId) => {
      return (locations.get(passengerId) ?? []).map(cloneLocation);
    });

    vi.spyOn(passengerRepository, 'createSavedLocation').mockImplementation(
      async (passengerId, input) => {
        const bucket = locations.get(passengerId) ?? [];
        if (input.isDefault) {
          bucket.forEach((loc) => {
            loc.isDefault = false;
          });
        }
        const record: PassengerSavedLocation = {
          id: randomUUID(),
          passengerId,
          label: input.label,
          address: input.address,
          location: input.location as PassengerSavedLocation['location'],
          isDefault: Boolean(input.isDefault),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        bucket.push(record);
        locations.set(passengerId, bucket);
        return cloneLocation(record);
      },
    );

    vi.spyOn(passengerRepository, 'clearDefaultSavedLocations').mockImplementation(
      async (passengerId) => {
        const bucket = locations.get(passengerId);
        if (!bucket) return;
        bucket.forEach((loc) => {
          loc.isDefault = false;
        });
      },
    );

    vi.spyOn(passengerRepository, 'deleteSavedLocation').mockImplementation(
      async (passengerId, locationId) => {
        const bucket = locations.get(passengerId);
        if (!bucket) {
          return false;
        }
        const index = bucket.findIndex((loc) => loc.id === locationId);
        if (index === -1) {
          return false;
        }
        bucket.splice(index, 1);
        locations.set(passengerId, bucket);
        return true;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns passenger profile with saved locations', async () => {
    const registrationPayload = {
      role: 'passenger',
      name: 'Passenger One',
      email: 'passenger1@example.com',
      password: 'SecurePass123',
      phone: '+1000000000',
    };

    const registerResponse = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send(registrationPayload);

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;

    const createLocationResponse = await request(app)
      .post(`${env.apiPrefix}/passengers/me/locations`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'Home',
        address: '123 Main St',
        location: {
          latitude: 27.7172,
          longitude: 85.324,
        },
        isDefault: true,
      });

    expect(createLocationResponse.status).toBe(201);

    const profileResponse = await request(app)
      .get(`${env.apiPrefix}/passengers/me`)
      .set('Authorization', `Bearer ${token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.role).toBe('passenger');
    expect(Array.isArray(profileResponse.body.savedLocations)).toBe(true);
    expect(profileResponse.body.savedLocations).toHaveLength(1);
  });

  it('supports managing multiple saved locations with defaults', async () => {
    const registrationPayload = {
      role: 'passenger',
      name: 'Passenger Two',
      email: 'passenger2@example.com',
      password: 'SecurePass123',
      phone: '+1000000001',
    };

    const registerResponse = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send(registrationPayload);

    const token = registerResponse.body.token as string;

    const firstLocation = await request(app)
      .post(`${env.apiPrefix}/passengers/me/locations`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'Work',
        address: '456 Business Rd',
        location: {
          latitude: 27.700,
          longitude: 85.333,
        },
        isDefault: true,
      });

    expect(firstLocation.status).toBe(201);

    const secondLocation = await request(app)
      .post(`${env.apiPrefix}/passengers/me/locations`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'Gym',
        address: '789 Fitness Ave',
        location: {
          latitude: 27.71,
          longitude: 85.34,
        },
        isDefault: true,
      });

    expect(secondLocation.status).toBe(201);

    const locationsResponse = await request(app)
      .get(`${env.apiPrefix}/passengers/me/locations`)
      .set('Authorization', `Bearer ${token}`);

    expect(locationsResponse.status).toBe(200);
    expect(locationsResponse.body).toHaveLength(2);
    const defaults = locationsResponse.body.filter((loc: { isDefault: boolean }) => loc.isDefault);
    expect(defaults).toHaveLength(1);

    const deleteResponse = await request(app)
      .delete(`${env.apiPrefix}/passengers/me/locations/${firstLocation.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);
  });
});

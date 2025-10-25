import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";

import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { authRepository } from "../../src/modules/auth/auth.repository";
import type { DbUser } from "../../src/modules/auth/auth.types";
import { bookingRepository } from "../../src/modules/booking/booking.repository";
import * as bookingQueue from "../../src/modules/booking/booking.queue";
import type { BookingRecord, CreateBookingInput, FareQuote } from "../../src/modules/booking/booking.types";

const app = createApp();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("Booking flows", () => {
  let users: Map<string, DbUser>;
  let emailToId: Map<string, string>;
  let phoneToId: Map<string, string>;
  let bookings: Map<string, BookingRecord>;
  let queuedBookings: Array<{ id: string; priority: number }>;

  beforeEach(() => {
    users = new Map();
    emailToId = new Map();
    phoneToId = new Map();
    bookings = new Map();
    queuedBookings = [];

    vi.spyOn(authRepository, "emailExists").mockImplementation(async (email) =>
      emailToId.has(email)
    );

    vi.spyOn(authRepository, "phoneExists").mockImplementation(async (phone, excludeId) => {
      const existing = phone ? phoneToId.get(phone) : undefined;
      if (!existing) {
        return false;
      }
      if (excludeId && existing === excludeId) {
        return false;
      }
      return true;
    });

    vi.spyOn(authRepository, "findById").mockImplementation(async (id) => {
      const user = users.get(id);
      return user ? clone(user) : null;
    });

    vi.spyOn(authRepository, "findByEmail").mockImplementation(async (email, role) => {
      const id = emailToId.get(email);
      if (!id) {
        return null;
      }
      const user = users.get(id);
      return user && user.role === role ? clone(user) : null;
    });

    vi.spyOn(authRepository, "findByPhone").mockImplementation(async (phone, role) => {
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

    vi.spyOn(authRepository, "insertUser").mockImplementation(async (payload) => {
      const user: DbUser = {
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as DbUser;
      users.set(user.id, user);
      emailToId.set(user.email, user.id);
      if (user.phone) {
        phoneToId.set(user.phone, user.id);
      }
      return clone(user);
    });

    vi.spyOn(authRepository, "updateUser").mockImplementation(async (id, updates) => {
      const user = users.get(id);
      if (!user) {
        throw new Error("User not found during update");
      }
      const nextUser = {
        ...user,
        ...updates,
        updated_at: new Date().toISOString(),
      } as DbUser;
      users.set(id, nextUser);
      if (nextUser.phone) {
        phoneToId.set(nextUser.phone, id);
      }
      return clone(nextUser);
    });

    vi.spyOn(bookingRepository, "createBooking").mockImplementation(
      async (passengerId: string, payload: CreateBookingInput, fareQuote?: FareQuote) => {
        const now = new Date();
        const id = randomUUID();
        const record: BookingRecord = {
          id,
          passengerId,
          driverId: null,
          status: "requested",
          pickupLocation: clone(payload.pickup),
          dropoffLocation: clone(payload.dropoff),
          fareQuote: fareQuote ? clone(fareQuote) : null,
          fareActual: null,
          distanceMeters: null,
          durationSeconds: null,
          requestedAt: now,
          acceptedAt: null,
          pickupEta: null,
          arrivedAt: null,
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          cancellationReason: null,
          surgeMultiplier: null,
          metadata: clone({
            vehicleType: payload.vehicleType ?? null,
            notes: payload.notes ?? null,
            paymentMethod: payload.paymentMethod ?? "cash",
          }),
          scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
          createdAt: now,
          updatedAt: now,
        } as BookingRecord;

        bookings.set(id, record);
        return clone(record);
      },
    );

    vi.spyOn(bookingRepository, "getBookingById").mockImplementation(async (id) => {
      const record = bookings.get(id);
      return record ? clone(record) : null;
    });

    vi.spyOn(bookingRepository, "updateBooking").mockImplementation(async (id, updates) => {
      const record = bookings.get(id);
      if (!record) {
        return null;
      }

      if (updates.status) {
        record.status = updates.status;
      }
      if (updates.cancelledAt !== undefined) {
        record.cancelledAt = updates.cancelledAt;
      }
      if (updates.cancellationReason !== undefined) {
        record.cancellationReason = updates.cancellationReason;
      }
      if (updates.metadata !== undefined) {
        record.metadata = clone(updates.metadata);
      }
      record.updatedAt = new Date();

      bookings.set(id, record);
      return clone(record);
    });

    vi.spyOn(bookingQueue, "enqueueBookingRequest").mockImplementation(async (id, priority) => {
      queuedBookings.push({ id, priority });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const registerPassenger = async () => {
    const response = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send({
        role: "passenger",
        name: "Test Passenger",
        email: "passenger@example.com",
        password: "TestPass123",
        phone: "+11000000000",
      });

    expect(response.status).toBe(201);
    return response.body.token as string;
  };

  it("creates and retrieves a booking", async () => {
    const token = await registerPassenger();

    const createResponse = await request(app)
      .post(`${env.apiPrefix}/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        pickup: { latitude: 27.7, longitude: 85.3, description: "Town Square" },
        dropoff: { latitude: 27.8, longitude: 85.4, description: "Railway Station" },
        notes: "Need space for luggage",
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.status).toBe("requested");
    expect(createResponse.body.pickup.latitude).toBeCloseTo(27.7);
    const bookingId = createResponse.body.id as string;

    const getResponse = await request(app)
      .get(`${env.apiPrefix}/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe(bookingId);
    expect(getResponse.body.status).toBe("requested");
    expect(queuedBookings.find((item) => item.id === bookingId)).toBeTruthy();
  });

  it("allows a passenger to cancel a booking", async () => {
    const token = await registerPassenger();

    const createResponse = await request(app)
      .post(`${env.apiPrefix}/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        pickup: { latitude: 27.71, longitude: 85.32 },
        dropoff: { latitude: 27.69, longitude: 85.28 },
      });

    const bookingId = createResponse.body.id as string;

    const cancelResponse = await request(app)
      .post(`${env.apiPrefix}/bookings/${bookingId}/cancel`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "Plans changed" });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.status).toBe("cancelled_passenger");

    const stored = bookings.get(bookingId);
    expect(stored?.status).toBe("cancelled_passenger");
    expect(stored?.cancellationReason).toBe("Plans changed");
  });
});

import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";

import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { authRepository } from "../../src/modules/auth/auth.repository";
import type { DbUser } from "../../src/modules/auth/auth.types";
import { bookingRepository } from "../../src/modules/booking/booking.repository";
import * as bookingQueue from "../../src/modules/booking/booking.queue";
import type {
  BookingRecord,
  CreateBookingInput,
  FareQuote,
} from "../../src/modules/booking/booking.types";
import { dispatchService } from "../../src/modules/dispatch/dispatch.service";

const app = createApp();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("Dispatch flows", () => {
  let users: Map<string, DbUser>;
  let emailToId: Map<string, string>;
  let phoneToId: Map<string, string>;
  let bookings: Map<string, BookingRecord>;

beforeEach(async () => {
  users = new Map();
  emailToId = new Map();
  phoneToId = new Map();
  bookings = new Map();

    vi.spyOn(authRepository, "emailExists").mockImplementation(async (email) =>
      emailToId.has(email)
    );

    vi.spyOn(authRepository, "phoneExists").mockImplementation(
      async (phone, excludeId) => {
        const existing = phone ? phoneToId.get(phone) : undefined;
        if (!existing) {
          return false;
        }
        if (excludeId && existing === excludeId) {
          return false;
        }
        return true;
      }
    );

    vi.spyOn(authRepository, "findById").mockImplementation(async (id) => {
      const user = users.get(id);
      return user ? clone(user) : null;
    });

    vi.spyOn(authRepository, "findByEmail").mockImplementation(
      async (email, role) => {
        const id = emailToId.get(email);
        if (!id) {
          return null;
        }
        const user = users.get(id);
        return user && user.role === role ? clone(user) : null;
      }
    );

    vi.spyOn(authRepository, "findByPhone").mockImplementation(
      async (phone, role) => {
        if (!phone) {
          return null;
        }
        const id = phoneToId.get(phone);
        if (!id) {
          return null;
        }
        const user = users.get(id);
        return user && user.role === role ? clone(user) : null;
      }
    );

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
      if (updates.driverId !== undefined) {
        record.driverId = updates.driverId;
      }
      if (updates.acceptedAt !== undefined) {
        record.acceptedAt = updates.acceptedAt as Date | null;
      }
      if (updates.pickupEta !== undefined) {
        record.pickupEta = updates.pickupEta as Date | null;
      }
      if (updates.cancelledAt !== undefined) {
        record.cancelledAt = updates.cancelledAt as Date | null;
      }
      if (updates.cancellationReason !== undefined) {
        record.cancellationReason = updates.cancellationReason ?? null;
      }
      if (updates.metadata !== undefined) {
        record.metadata = clone(updates.metadata);
      }
      record.updatedAt = new Date();

      bookings.set(id, record);
      return clone(record);
    });

  vi.spyOn(bookingQueue, "enqueueBookingRequest").mockResolvedValue(undefined);

  await dispatchService.reset();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await dispatchService.reset();
});

  const registerPassenger = async () => {
    const response = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send({
        role: "passenger",
        name: "Passenger One",
        email: "passenger1@example.com",
        password: "Passenger123",
        phone: "+11000000001",
      });

    expect(response.status).toBe(201);
    return response.body.token as string;
  };

  const registerDriver = async (
    overrides: Partial<{ name: string; email: string; phone: string }> = {},
  ) => {
    const response = await request(app)
      .post(`${env.apiPrefix}/auth/register`)
      .send({
        role: "driver",
        name: overrides.name ?? "Driver One",
        email: overrides.email ?? "driver1@example.com",
        password: "Driver123",
        phone: overrides.phone ?? "+11000000222",
      });

    expect(response.status).toBe(201);
    return response.body.token as string;
  };

  it("delivers offers to available drivers and supports acceptance", async () => {
    const passengerToken = await registerPassenger();
    const driverToken = await registerDriver();

    const heartbeatResponse = await request(app)
      .post(`${env.apiPrefix}/dispatch/availability/heartbeat`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "available",
        capacity: 6,
        location: { latitude: 27.7, longitude: 85.3 },
      });

    expect(heartbeatResponse.status).toBe(200);

    const bookingResponse = await request(app)
      .post(`${env.apiPrefix}/bookings`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        pickup: { latitude: 27.71, longitude: 85.32 },
        dropoff: { latitude: 27.69, longitude: 85.28 },
      });

    expect(bookingResponse.status).toBe(201);
    const bookingId = bookingResponse.body.id as string;

    const offersResponse = await request(app)
      .get(`${env.apiPrefix}/dispatch/offers`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(offersResponse.status).toBe(200);
    expect(Array.isArray(offersResponse.body)).toBe(true);
    expect(offersResponse.body.length).toBe(1);
    const offerId = offersResponse.body[0].id as string;

    const acceptResponse = await request(app)
      .post(`${env.apiPrefix}/dispatch/offers/${offerId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({});

    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.status).toBe("driver_assigned");
    expect(acceptResponse.body.driver).not.toBeNull();

    const getBookingResponse = await request(app)
      .get(`${env.apiPrefix}/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(getBookingResponse.status).toBe(200);
    expect(getBookingResponse.body.status).toBe("driver_assigned");

    const offersAfterAccept = await request(app)
      .get(`${env.apiPrefix}/dispatch/offers`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(offersAfterAccept.body).toHaveLength(0);
  });

  it("reassigns pending bookings when a driver rejects an offer", async () => {
    const passengerToken = await registerPassenger();
    const driverOneToken = await registerDriver();
    const driverTwoToken = await registerDriver({
      name: "Driver Two",
      email: "driver2@example.com",
      phone: "+11000000333",
    });

    const heartbeatOne = await request(app)
      .post(`${env.apiPrefix}/dispatch/availability/heartbeat`)
      .set("Authorization", `Bearer ${driverOneToken}`)
      .send({
        status: "available",
        capacity: 4,
        location: { latitude: 27.7, longitude: 85.31 },
      });
    expect(heartbeatOne.status).toBe(200);

    const heartbeatTwo = await request(app)
      .post(`${env.apiPrefix}/dispatch/availability/heartbeat`)
      .set("Authorization", `Bearer ${driverTwoToken}`)
      .send({
        status: "available",
        capacity: 4,
        location: { latitude: 27.72, longitude: 85.33 },
      });
    expect(heartbeatTwo.status).toBe(200);

    const bookingResponse = await request(app)
      .post(`${env.apiPrefix}/bookings`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        pickup: { latitude: 27.71, longitude: 85.32 },
        dropoff: { latitude: 27.69, longitude: 85.28 },
      });

    expect(bookingResponse.status).toBe(201);
    const bookingId = bookingResponse.body.id as string;

    const initialOfferResponse = await request(app)
      .get(`${env.apiPrefix}/dispatch/offers`)
      .set("Authorization", `Bearer ${driverTwoToken}`);

    expect(initialOfferResponse.status).toBe(200);
    expect(initialOfferResponse.body).toHaveLength(1);
    const offerId = initialOfferResponse.body[0].id as string;

    const rejectResponse = await request(app)
      .post(`${env.apiPrefix}/dispatch/offers/${offerId}/reject`)
      .set("Authorization", `Bearer ${driverTwoToken}`)
      .send({ etaMinutes: 12 });

    expect(rejectResponse.status).toBe(204);

    const offersAfterRejectDriverTwo = await request(app)
      .get(`${env.apiPrefix}/dispatch/offers`)
      .set("Authorization", `Bearer ${driverTwoToken}`);
    expect(offersAfterRejectDriverTwo.body).toHaveLength(0);

    const reassignedOfferResponse = await request(app)
      .get(`${env.apiPrefix}/dispatch/offers`)
      .set("Authorization", `Bearer ${driverOneToken}`);

    expect(reassignedOfferResponse.status).toBe(200);
    expect(reassignedOfferResponse.body).toHaveLength(1);
    const reassignedOfferId = reassignedOfferResponse.body[0].id as string;
    expect(reassignedOfferId).not.toBe(offerId);

    const bookingStatusResponse = await request(app)
      .get(`${env.apiPrefix}/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(bookingStatusResponse.status).toBe(200);
    expect(bookingStatusResponse.body.status).toBe("requested");
  });

  it("expires stale offers and makes the booking available to other drivers", async () => {
    const passengerToken = await registerPassenger();
    const driverOneToken = await registerDriver({
      name: "Driver Alpha",
      email: "driver.alpha@example.com",
      phone: "+11000000444",
    });
    const driverTwoToken = await registerDriver({
      name: "Driver Beta",
      email: "driver.beta@example.com",
      phone: "+11000000555",
    });

    const heartbeatAlpha = await request(app)
      .post(`${env.apiPrefix}/dispatch/availability/heartbeat`)
      .set("Authorization", `Bearer ${driverOneToken}`)
      .send({
        status: "available",
        capacity: 4,
        location: { latitude: 27.68, longitude: 85.31 },
      });
    expect(heartbeatAlpha.status).toBe(200);

    const heartbeatBeta = await request(app)
      .post(`${env.apiPrefix}/dispatch/availability/heartbeat`)
      .set("Authorization", `Bearer ${driverTwoToken}`)
      .send({
        status: "available",
        capacity: 4,
        location: { latitude: 27.7, longitude: 85.33 },
      });
    expect(heartbeatBeta.status).toBe(200);

    const bookingResponse = await request(app)
      .post(`${env.apiPrefix}/bookings`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        pickup: { latitude: 27.72, longitude: 85.34 },
        dropoff: { latitude: 27.66, longitude: 85.3 },
      });

    expect(bookingResponse.status).toBe(201);
    const bookingId = bookingResponse.body.id as string;

    const initialOfferResponse = await request(app)
      .get(`${env.apiPrefix}/dispatch/offers`)
      .set("Authorization", `Bearer ${driverTwoToken}`);

    expect(initialOfferResponse.status).toBe(200);
    expect(initialOfferResponse.body).toHaveLength(1);
    const originalOfferId = initialOfferResponse.body[0].id as string;

    const ttlMs = dispatchService.getOfferTtlMs();
    const now = Date.now();
    await dispatchService.reapExpiredOffers({ now: now + ttlMs + 5_000 });

    const offersForBeta = await request(app)
      .get(`${env.apiPrefix}/dispatch/offers`)
      .set("Authorization", `Bearer ${driverTwoToken}`);
    expect(offersForBeta.status).toBe(200);
    expect(offersForBeta.body).toHaveLength(0);

    const offersForAlpha = await request(app)
      .get(`${env.apiPrefix}/dispatch/offers`)
      .set("Authorization", `Bearer ${driverOneToken}`);
    expect(offersForAlpha.status).toBe(200);
    expect(offersForAlpha.body).toHaveLength(1);
    const reassignedOfferId = offersForAlpha.body[0].id as string;
    expect(reassignedOfferId).not.toBe(originalOfferId);

    const bookingStatus = await request(app)
      .get(`${env.apiPrefix}/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${passengerToken}`);
    expect(bookingStatus.status).toBe(200);
    expect(bookingStatus.body.status).toBe("requested");
  });
});

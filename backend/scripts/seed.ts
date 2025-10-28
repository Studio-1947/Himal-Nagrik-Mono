import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { closeDatabasePool } from '../src/config/database';
import { database } from '../src/infra/database';
import {
  appUsers,
  rides,
} from '../src/infra/database/schema';

type SeedUser = {
  id?: string;
  role: 'passenger' | 'driver';
  name: string;
  email: string;
  password: string;
  phone?: string;
  bio?: string;
  location?: string;
  emergencyContact?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
  vehicle?: Record<string, unknown> | null;
  availability?: Record<string, unknown> | null;
  stats?: Record<string, unknown> | null;
  licenseNumber?: string | null;
  yearsOfExperience?: number | null;
};

type SeedRide = {
  id?: string;
  passengerEmail: string;
  driverEmail?: string;
  status: (typeof rides.$inferInsert)['status'];
  pickupLocation: Record<string, unknown>;
  dropoffLocation: Record<string, unknown>;
  fareQuote?: Record<string, unknown> | null;
  requestedOffsetMinutes: number;
  acceptedOffsetMinutes?: number;
  metadata?: Record<string, unknown> | null;
};

const SALT_ROUNDS = 12;

const seedUsers: SeedUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    role: 'passenger',
    name: 'Demo Passenger',
    email: 'passenger.demo@example.com',
    password: 'Passenger123',
    phone: '+911234567890',
    location: 'Darjeeling, IN',
    emergencyContact: {
      name: 'Aditi Sharma',
      phone: '+911234567891',
      relationship: 'Sister',
    },
    preferences: {
      preferredSeat: 'rear-left',
      musicPreference: 'acoustic',
      accessibilityNeeds: ['extra-luggage'],
      favouriteRoutes: ['Mall Road - Chowrasta', 'Ghoom Station - Darjeeling'],
    },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    role: 'driver',
    name: 'Tenzin Dorje',
    email: 'driver.darjeeling@example.com',
    password: 'Driver123',
    phone: '+919800011122',
    bio: 'Local guide turned driver. Knows every shortcut through the tea gardens.',
    vehicle: {
      manufacturer: 'Mahindra',
      model: 'Bolero Neo',
      registrationNumber: 'WB-76A-9087',
      capacity: 6,
      color: 'Granite Black',
    },
    availability: {
      weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      shift: 'day',
    },
    stats: {
      totalTrips: 1280,
      rating: 4.9,
      yearsOfExperience: 6,
      cancellationRate: 0.02,
    },
    licenseNumber: 'DL-07-2020-5678',
    yearsOfExperience: 6,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    role: 'driver',
    name: 'Mira Gurung',
    email: 'driver.kalimpong@example.com',
    password: 'Driver123',
    phone: '+919833344455',
    bio: 'Kalimpong native with a decade of mountain driving experience.',
    vehicle: {
      manufacturer: 'Toyota',
      model: 'Innova Crysta',
      registrationNumber: 'WB-68B-4410',
      capacity: 7,
      color: 'Silver',
    },
    availability: {
      weekdays: ['friday', 'saturday', 'sunday'],
      shift: 'night',
    },
    stats: {
      totalTrips: 2035,
      rating: 4.8,
      yearsOfExperience: 10,
      cancellationRate: 0.01,
    },
    licenseNumber: 'DL-09-2013-2211',
    yearsOfExperience: 10,
  },
];

const seedRides: SeedRide[] = [
  {
    id: '44444444-4444-4444-4444-444444444444',
    passengerEmail: 'passenger.demo@example.com',
    status: 'requested',
    pickupLocation: {
      latitude: 27.0419,
      longitude: 88.2663,
      description: 'Gandhi Road Taxi Stand',
    },
    dropoffLocation: {
      latitude: 27.0509,
      longitude: 88.2664,
      description: 'Batasia Loop',
    },
    fareQuote: {
      currency: 'INR',
      amount: 220,
      breakdown: [
        { label: 'Base fare', amount: 150 },
        { label: 'Hill allowance', amount: 50 },
        { label: 'Service fee', amount: 20 },
      ],
    },
    requestedOffsetMinutes: 30,
    metadata: { seedTag: 'demo-requested' },
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    passengerEmail: 'passenger.demo@example.com',
    driverEmail: 'driver.darjeeling@example.com',
    status: 'driver_assigned',
    pickupLocation: {
      latitude: 27.061,
      longitude: 88.2645,
      description: 'Happy Valley Tea Estate Gate',
    },
    dropoffLocation: {
      latitude: 27.0831,
      longitude: 88.271,
      description: 'Tenzing Rock',
    },
    fareQuote: {
      currency: 'INR',
      amount: 350,
      breakdown: [
        { label: 'Base fare', amount: 250 },
        { label: 'Tea garden surcharge', amount: 60 },
        { label: 'Service fee', amount: 40 },
      ],
    },
    requestedOffsetMinutes: 90,
    acceptedOffsetMinutes: 60,
    metadata: { seedTag: 'demo-assigned' },
  },
];

const log = (message: string): void => {
  console.log(`[seed] ${message}`);
};

const sanitize = <T>(value: T | null | undefined): T | null =>
  value === undefined || value === null ? null : JSON.parse(JSON.stringify(value));

const upsertUser = async (seed: SeedUser) => {
  const existing = await database.db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, seed.email))
    .limit(1);

  if (existing.length > 0) {
    log(`User ${seed.email} already present`);
    return existing[0];
  }

  const id = seed.id ?? randomUUID();
  const now = new Date();
  const passwordHash = await bcrypt.hash(seed.password, SALT_ROUNDS);

  await database.db.insert(appUsers).values({
    id,
    role: seed.role,
    name: seed.name,
    email: seed.email,
    passwordHash,
    phone: seed.phone ?? null,
    location: seed.location ?? null,
    bio: seed.bio ?? null,
    emergencyContact: sanitize(seed.emergencyContact),
    preferences: sanitize(seed.preferences),
    vehicle: sanitize(seed.vehicle),
    availability: sanitize(seed.availability),
    stats: sanitize(seed.stats),
    recentTrips: null,
    licenseNumber: seed.licenseNumber ?? null,
    yearsOfExperience: seed.yearsOfExperience ?? null,
    createdAt: now,
    updatedAt: now,
  });

  log(`Created user ${seed.email}`);

  const [created] = await database.db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, seed.email))
    .limit(1);

  return created;
};

const upsertRide = async (
  seed: SeedRide,
  userMap: Map<string, (typeof appUsers.$inferSelect)>,
) => {
  const passenger = userMap.get(seed.passengerEmail);
  if (!passenger) {
    throw new Error(`Passenger ${seed.passengerEmail} not found`);
  }

  const rideId = seed.id ?? randomUUID();

  const existing = await database.db
    .select()
    .from(rides)
    .where(eq(rides.id, rideId))
    .limit(1);

  if (existing.length > 0) {
    log(`Ride ${rideId} already present`);
    return;
  }

  const now = new Date();
  const requestedAt = new Date(now.getTime() - seed.requestedOffsetMinutes * 60 * 1000);
  const acceptedAt =
    seed.acceptedOffsetMinutes !== undefined
      ? new Date(now.getTime() - seed.acceptedOffsetMinutes * 60 * 1000)
      : null;

  const driver = seed.driverEmail ? userMap.get(seed.driverEmail) : null;

  await database.db.insert(rides).values({
    id: rideId,
    passengerId: passenger.id,
    driverId: driver?.id ?? null,
    status: seed.status,
    pickupLocation: sanitize(seed.pickupLocation) ?? {},
    dropoffLocation: sanitize(seed.dropoffLocation) ?? {},
    fareQuote: sanitize(seed.fareQuote),
    fareActual: null,
    distanceMeters: null,
    durationSeconds: null,
    requestedAt,
    acceptedAt,
    pickupEta: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    surgeMultiplier: null,
    metadata: sanitize(seed.metadata),
    createdAt: requestedAt,
    updatedAt: now,
  });

  log(`Created ride ${rideId} (${seed.status})`);
};

const main = async (): Promise<void> => {
  await database.ensureConnection();

  const userMap = new Map<string, (typeof appUsers.$inferSelect)>();

  for (const seed of seedUsers) {
    const user = await upsertUser(seed);
    userMap.set(seed.email, user);
  }

  for (const ride of seedRides) {
    await upsertRide(ride, userMap);
  }

  log('Seeding complete');
};

void main()
  .catch((error: unknown) => {
    console.error('[seed] Failed to seed database', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabasePool().catch((error) => {
      console.error('[seed] Failed to close database pool', error);
    });
  });

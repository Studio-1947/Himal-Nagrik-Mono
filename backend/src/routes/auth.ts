import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { pool } from '../config/database';
import { env } from '../config/env';

const SALT_ROUNDS = 12;

type AuthRole = 'passenger' | 'driver';

type DbUser = {
  id: string;
  role: AuthRole;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  emergency_contact: unknown | null;
  preferences: unknown | null;
  vehicle: unknown | null;
  availability: unknown | null;
  stats: unknown | null;
  recent_trips: unknown | null;
  license_number: string | null;
  years_of_experience: number | null;
  created_at: string;
  updated_at: string;
};

type PassengerPreferences = {
  preferredSeat?: 'front' | 'middle' | 'back';
  musicPreference?: 'quiet' | 'neutral' | 'lively';
  accessibilityNeeds?: string;
  favouriteRoutes?: string[];
};

type PassengerRecentTrip = {
  id: string;
  route: string;
  date: string;
  driver: string;
  status: 'completed' | 'cancelled' | 'scheduled';
};

type DriverVehicle = {
  manufacturer: string;
  model: string;
  registrationNumber: string;
  capacity: number;
  color?: string;
};

type DriverStats = {
  totalTrips: number;
  rating: number;
  yearsOfExperience: number;
  cancellationRate: number;
};

type DriverAvailability = {
  weekdays: string[];
  shift: 'morning' | 'day' | 'evening' | 'night';
};

type PassengerProfile = {
  id: string;
  role: 'passenger';
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation?: string;
  };
  preferences: {
    preferredSeat?: 'front' | 'middle' | 'back';
    musicPreference?: 'quiet' | 'neutral' | 'lively';
    accessibilityNeeds?: string;
    favouriteRoutes: string[];
  };
  recentTrips: PassengerRecentTrip[];
};

type DriverProfile = {
  id: string;
  role: 'driver';
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  licenseNumber?: string;
  vehicle: DriverVehicle;
  stats: DriverStats;
  availability: DriverAvailability;
};

type AuthProfile = PassengerProfile | DriverProfile;

type AuthSession = {
  token: string;
  refreshToken?: string;
  issuedAt: string;
  expiresAt?: string;
  profile: AuthProfile;
};

type AuthenticatedRequest = Request & { user: DbUser; token: string };

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(8).max(128);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d+()\-.\s]{7,20}$/, { message: 'Phone number format is invalid' })
  .optional();

const passengerPreferencesSchema = z.object({
  preferredSeat: z.enum(['front', 'middle', 'back']).optional(),
  musicPreference: z.enum(['quiet', 'neutral', 'lively']).optional(),
  accessibilityNeeds: z.string().trim().max(200).optional(),
  favouriteRoutes: z.array(z.string().trim().min(1)).max(20).optional(),
});

const passengerEmergencyContactSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(5).max(20),
    relation: z.string().trim().max(80).optional(),
  })
  .optional();

const driverVehicleSchema = z.object({
  manufacturer: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  registrationNumber: z.string().trim().max(60).optional(),
  capacity: z.coerce.number().int().min(1).max(12).optional(),
  color: z.string().trim().max(60).optional(),
});

const driverAvailabilitySchema = z.object({
  weekdays: z.array(z.string().trim().min(1)).max(7).optional(),
  shift: z.enum(['morning', 'day', 'evening', 'night']).optional(),
});

const driverStatsSchema = z.object({
  totalTrips: z.coerce.number().int().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  yearsOfExperience: z.coerce.number().int().min(0).optional(),
  cancellationRate: z.coerce.number().min(0).max(100).optional(),
});

const baseRegisterSchema = z.object({
  role: z.enum(['passenger', 'driver']),
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  location: z.string().trim().max(180).optional(),
  bio: z.string().trim().max(500).optional(),
});

const passengerRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('passenger'),
  preferences: passengerPreferencesSchema.optional(),
  emergencyContact: passengerEmergencyContactSchema,
});

const driverRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('driver'),
  licenseNumber: z.string().trim().max(80).optional(),
  vehicle: driverVehicleSchema.optional(),
  availability: driverAvailabilitySchema.optional(),
  yearsOfExperience: z.coerce.number().int().min(0).optional(),
});

const registerSchema = z.union([passengerRegisterSchema, driverRegisterSchema]);

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
  role: z.enum(['passenger', 'driver']),
});

const passengerRecentTripSchema: z.ZodType<PassengerRecentTrip> = z.object({
  id: z.string().trim().min(1),
  route: z.string().trim().min(1),
  date: z.string().trim().min(1),
  driver: z.string().trim().min(1),
  status: z.enum(['completed', 'cancelled', 'scheduled']),
});

const baseProfileUpdateSchema = z.object({
  role: z.enum(['passenger', 'driver']),
  name: z.string().trim().min(1).max(120).optional(),
  phone: phoneSchema,
  location: z.string().trim().max(180).optional(),
  bio: z.string().trim().max(500).optional(),
});

const passengerProfileUpdateSchema = baseProfileUpdateSchema.extend({
  role: z.literal('passenger'),
  emergencyContact: passengerEmergencyContactSchema,
  preferences: passengerPreferencesSchema.optional(),
  recentTrips: z.array(passengerRecentTripSchema).max(50).optional(),
});

const driverProfileUpdateSchema = baseProfileUpdateSchema.extend({
  role: z.literal('driver'),
  licenseNumber: z.string().trim().max(80).optional(),
  vehicle: driverVehicleSchema.optional(),
  availability: driverAvailabilitySchema.optional(),
  stats: driverStatsSchema.optional(),
});

const profileUpdateSchema = z.union([passengerProfileUpdateSchema, driverProfileUpdateSchema]);

type RegisterInput = z.infer<typeof registerSchema>;
type PassengerRegisterInput = z.infer<typeof passengerRegisterSchema>;
type DriverRegisterInput = z.infer<typeof driverRegisterSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

const authRouter = Router();

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const normalizePhone = (phone: string): string => phone.replace(/\s+/g, '').trim();

const sanitizeForJson = <T>(value: T): T | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const mapUserToProfile = (user: DbUser): AuthProfile => {
  if (user.role === 'passenger') {
    const preferences = (user.preferences as PassengerPreferences | null) ?? {};
    const emergencyContact = user.emergency_contact as PassengerProfile['emergencyContact'];
    const recentTrips = Array.isArray(user.recent_trips)
      ? (user.recent_trips as PassengerRecentTrip[])
      : [];

    return {
      id: user.id,
      role: 'passenger',
      name: user.name,
      email: user.email,
      phone: user.phone ?? undefined,
      avatarUrl: undefined,
      location: user.location ?? undefined,
      bio: user.bio ?? undefined,
      emergencyContact: emergencyContact ?? undefined,
      preferences: {
        preferredSeat: preferences?.preferredSeat,
        musicPreference: preferences?.musicPreference ?? 'neutral',
        accessibilityNeeds: preferences?.accessibilityNeeds,
        favouriteRoutes: Array.isArray(preferences?.favouriteRoutes)
          ? preferences.favouriteRoutes
          : [],
      },
      recentTrips,
    };
  }

  const vehicleData = (user.vehicle as Partial<DriverVehicle> | null) ?? {};
  const statsData = (user.stats as Partial<DriverStats> | null) ?? {};
  const availabilityData = (user.availability as Partial<DriverAvailability> | null) ?? {};
  const yearsOfExperience =
    statsData.yearsOfExperience ?? user.years_of_experience ?? 0;

  return {
    id: user.id,
    role: 'driver',
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    avatarUrl: undefined,
    location: user.location ?? undefined,
    bio: user.bio ?? undefined,
    licenseNumber: user.license_number ?? undefined,
    vehicle: {
      manufacturer: vehicleData.manufacturer ?? '',
      model: vehicleData.model ?? '',
      registrationNumber: vehicleData.registrationNumber ?? '',
      capacity: vehicleData.capacity ?? 4,
      color: vehicleData.color ?? undefined,
    },
    stats: {
      totalTrips: statsData.totalTrips ?? 0,
      rating: statsData.rating ?? 5,
      yearsOfExperience,
      cancellationRate: statsData.cancellationRate ?? 0,
    },
    availability: {
      weekdays: Array.isArray(availabilityData.weekdays)
        ? availabilityData.weekdays
        : [],
      shift: availabilityData.shift ?? 'day',
    },
  };
};

const issueToken = (user: DbUser): { token: string; expiresAt?: string } => {
  const token = jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    expiresIn: env.jwtExpiresIn,
  });

  const decoded = jwt.decode(token) as JwtPayload | null;
  const expiresAt =
    decoded?.exp !== undefined ? new Date(decoded.exp * 1000).toISOString() : undefined;

  return { token, expiresAt };
};

const buildSession = (user: DbUser): AuthSession => {
  const { token, expiresAt } = issueToken(user);
  return {
    token,
    refreshToken: undefined,
    issuedAt: new Date().toISOString(),
    expiresAt,
    profile: mapUserToProfile(user),
  };
};

const fetchUserById = async (id: string): Promise<DbUser | null> => {
  const { rows } = await pool.query<DbUser>('SELECT * FROM app_users WHERE id = $1', [id]);
  return rows[0] ?? null;
};

const fetchUserByIdentifier = async (
  input: LoginInput,
): Promise<DbUser | null> => {
  const identifier = input.identifier.trim();
  if (!identifier) {
    return null;
  }

  if (identifier.includes('@')) {
    const email = normalizeEmail(identifier);
    const { rows } = await pool.query<DbUser>(
      'SELECT * FROM app_users WHERE email = $1 AND role = $2',
      [email, input.role],
    );
    return rows[0] ?? null;
  }

  const phone = normalizePhone(identifier);
  const { rows } = await pool.query<DbUser>(
    'SELECT * FROM app_users WHERE phone = $1 AND role = $2',
    [phone, input.role],
  );
  return rows[0] ?? null;
};

const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ message: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.slice(7).trim();
  if (!token) {
    res.status(401).json({ message: 'Missing authorization token' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    if (!userId) {
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }

    const user = await fetchUserById(userId);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    (req as AuthenticatedRequest).token = token;
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error('Failed to verify token', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

const handleZodError = (error: unknown, res: Response): boolean => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      message: 'Validation error',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return true;
  }
  return false;
};

authRouter.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body) as RegisterInput;
    const client = await pool.connect();
    const email = normalizeEmail(payload.email);
    const phone = payload.phone ? normalizePhone(payload.phone) : null;

    try {
      await client.query('BEGIN');

      const emailResult = await client.query<{ id: string }>(
        'SELECT id FROM app_users WHERE email = $1',
        [email],
      );
      if (emailResult.rowCount > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ message: 'Email is already registered' });
        return;
      }

      if (phone) {
        const phoneResult = await client.query<{ id: string }>(
          'SELECT id FROM app_users WHERE phone = $1',
          [phone],
        );
        if (phoneResult.rowCount > 0) {
          await client.query('ROLLBACK');
          res.status(409).json({ message: 'Phone number is already registered' });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
      const id = randomUUID();
      const timestamp = new Date();

      if (payload.role === 'passenger') {
        const passengerPayload = payload as PassengerRegisterInput;
        const preferences = {
          preferredSeat: passengerPayload.preferences?.preferredSeat,
          musicPreference: passengerPayload.preferences?.musicPreference ?? 'neutral',
          accessibilityNeeds: passengerPayload.preferences?.accessibilityNeeds,
          favouriteRoutes: passengerPayload.preferences?.favouriteRoutes ?? [],
        };

        const insertResult = await client.query<DbUser>(
          `INSERT INTO app_users (
            id, role, name, email, password_hash, phone,
            location, bio, emergency_contact, preferences,
            vehicle, availability, stats, recent_trips,
            license_number, years_of_experience, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17, $17
          )
          RETURNING *`,
          [
            id,
            passengerPayload.role,
            passengerPayload.name.trim(),
            email,
            passwordHash,
            phone,
            passengerPayload.location?.trim() ?? null,
            passengerPayload.bio?.trim() ?? null,
            sanitizeForJson(passengerPayload.emergencyContact),
            sanitizeForJson(preferences),
            null,
            null,
            null,
            sanitizeForJson<PassengerRecentTrip[]>([]),
            null,
            null,
            timestamp.toISOString(),
          ],
        );

        await client.query('COMMIT');
        res.status(201).json(buildSession(insertResult.rows[0]));
        return;
      }

      const driverPayload = payload as DriverRegisterInput;
      const vehicle = {
        manufacturer: driverPayload.vehicle?.manufacturer ?? '',
        model: driverPayload.vehicle?.model ?? '',
        registrationNumber: driverPayload.vehicle?.registrationNumber ?? '',
        capacity: driverPayload.vehicle?.capacity ?? 4,
        color: driverPayload.vehicle?.color ?? undefined,
      };
      const availability = {
        weekdays: driverPayload.availability?.weekdays ?? [],
        shift: driverPayload.availability?.shift ?? 'day',
      };
      const yearsOfExperience = driverPayload.yearsOfExperience ?? 0;
      const stats = {
        totalTrips: 0,
        rating: 5,
        yearsOfExperience,
        cancellationRate: 0,
      };

      const insertResult = await client.query<DbUser>(
        `INSERT INTO app_users (
          id, role, name, email, password_hash, phone,
          location, bio, emergency_contact, preferences,
          vehicle, availability, stats, recent_trips,
          license_number, years_of_experience, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $17
        )
        RETURNING *`,
        [
          id,
          driverPayload.role,
          driverPayload.name.trim(),
          email,
          passwordHash,
          phone,
          driverPayload.location?.trim() ?? null,
          driverPayload.bio?.trim() ?? null,
          null,
          null,
          sanitizeForJson(vehicle),
          sanitizeForJson(availability),
          sanitizeForJson(stats),
          null,
          driverPayload.licenseNumber?.trim() ?? null,
          yearsOfExperience,
          timestamp.toISOString(),
        ],
      );

      await client.query('COMMIT');
      res.status(201).json(buildSession(insertResult.rows[0]));
    } catch (error) {
      await client.query('ROLLBACK');
      if (handleKnownDatabaseError(error, res)) {
        return;
      }
      next(error);
    } finally {
      client.release();
    }
  } catch (error) {
    if (handleZodError(error, res)) {
      return;
    }
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body) as LoginInput;
    const user = await fetchUserByIdentifier(payload);
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    res.json(buildSession(user));
  } catch (error) {
    if (handleZodError(error, res)) {
      return;
    }
    next(error);
  }
});

authRouter.get(
  '/profile',
  (req, res, next) => {
    void authenticateRequest(req, res, next);
  },
  (req, res) => {
    const { user } = req as AuthenticatedRequest;
    res.json(mapUserToProfile(user));
  },
);

authRouter.patch(
  '/profile',
  (req, res, next) => {
    void authenticateRequest(req, res, next);
  },
  async (req, res, next) => {
    try {
      const updates = profileUpdateSchema.parse(req.body) as ProfileUpdateInput;
      const { user } = req as AuthenticatedRequest;

      if (updates.role !== user.role) {
        res.status(400).json({ message: 'Role mismatch for profile update' });
        return;
      }

      let phoneToPersist = user.phone;
      if (updates.phone !== undefined) {
        const normalizedPhone = updates.phone.trim()
          ? normalizePhone(updates.phone)
          : null;
        if (normalizedPhone && normalizedPhone !== user.phone) {
          const phoneConflict = await pool.query<{ id: string }>(
            'SELECT id FROM app_users WHERE phone = $1 AND id <> $2',
            [normalizedPhone, user.id],
          );
          if (phoneConflict.rowCount > 0) {
            res.status(409).json({ message: 'Phone number is already registered' });
            return;
          }
        }
        phoneToPersist = normalizedPhone;
      }

      const name = updates.name?.trim() ?? user.name;
      const location = updates.location?.trim() ?? user.location;
      const bio = updates.bio?.trim() ?? user.bio;

      let emergencyContact = user.emergency_contact;
      let preferences = user.preferences;
      let recentTrips = user.recent_trips;
      let vehicle = user.vehicle;
      let availability = user.availability;
      let stats = user.stats;
      let licenseNumber = user.license_number;
      let yearsOfExperience = user.years_of_experience;

      if (user.role === 'passenger') {
        const passengerUpdates = updates as z.infer<typeof passengerProfileUpdateSchema>;

        if (passengerUpdates.emergencyContact !== undefined) {
          emergencyContact = sanitizeForJson(passengerUpdates.emergencyContact);
        }

        if (passengerUpdates.preferences !== undefined) {
          const currentPreferences = (user.preferences as PassengerPreferences | null) ?? {};
          const mergedPreferences = {
            ...currentPreferences,
            ...passengerUpdates.preferences,
            favouriteRoutes:
              passengerUpdates.preferences?.favouriteRoutes ??
              currentPreferences.favouriteRoutes ??
              [],
          };
          preferences = sanitizeForJson(mergedPreferences);
        }

        if (passengerUpdates.recentTrips !== undefined) {
          recentTrips = sanitizeForJson(passengerUpdates.recentTrips);
        }

        vehicle = null;
        availability = null;
        stats = null;
        licenseNumber = null;
        yearsOfExperience = null;
      } else {
        const driverUpdates = updates as z.infer<typeof driverProfileUpdateSchema>;

        if (driverUpdates.vehicle !== undefined) {
          const currentVehicle = (user.vehicle as Partial<DriverVehicle> | null) ?? {};
          const mergedVehicle: DriverVehicle = {
            manufacturer: driverUpdates.vehicle?.manufacturer ?? currentVehicle.manufacturer ?? '',
            model: driverUpdates.vehicle?.model ?? currentVehicle.model ?? '',
            registrationNumber:
              driverUpdates.vehicle?.registrationNumber ??
              currentVehicle.registrationNumber ??
              '',
            capacity: driverUpdates.vehicle?.capacity ?? currentVehicle.capacity ?? 4,
            color: driverUpdates.vehicle?.color ?? currentVehicle.color ?? undefined,
          };
          vehicle = sanitizeForJson(mergedVehicle);
        }

        if (driverUpdates.availability !== undefined) {
          const currentAvailability =
            (user.availability as Partial<DriverAvailability> | null) ?? {};
          const mergedAvailability: DriverAvailability = {
            weekdays:
              driverUpdates.availability?.weekdays ??
              currentAvailability.weekdays ??
              [],
            shift: driverUpdates.availability?.shift ?? currentAvailability.shift ?? 'day',
          };
          availability = sanitizeForJson(mergedAvailability);
        }

        if (driverUpdates.stats !== undefined) {
          const currentStats = (user.stats as Partial<DriverStats> | null) ?? {};
          const mergedStats: DriverStats = {
            totalTrips: driverUpdates.stats.totalTrips ?? currentStats.totalTrips ?? 0,
            rating: driverUpdates.stats.rating ?? currentStats.rating ?? 5,
            yearsOfExperience:
              driverUpdates.stats.yearsOfExperience ??
              currentStats.yearsOfExperience ??
              user.years_of_experience ??
              0,
            cancellationRate:
              driverUpdates.stats.cancellationRate ??
              currentStats.cancellationRate ??
              0,
          };
          stats = sanitizeForJson(mergedStats);
          yearsOfExperience = mergedStats.yearsOfExperience;
        }

        if (driverUpdates.licenseNumber !== undefined) {
          licenseNumber = driverUpdates.licenseNumber?.trim() ?? null;
        }

        emergencyContact = null;
        preferences = null;
        recentTrips = null;
      }

      const updateResult = await pool.query<DbUser>(
        `UPDATE app_users SET
          name = $1,
          phone = $2,
          location = $3,
          bio = $4,
          emergency_contact = $5,
          preferences = $6,
          vehicle = $7,
          availability = $8,
          stats = $9,
          recent_trips = $10,
          license_number = $11,
          years_of_experience = $12,
          updated_at = NOW()
        WHERE id = $13
        RETURNING *`,
        [
          name,
          phoneToPersist,
          location ?? null,
          bio ?? null,
          sanitizeForJson(emergencyContact),
          sanitizeForJson(preferences),
          sanitizeForJson(vehicle),
          sanitizeForJson(availability),
          sanitizeForJson(stats),
          sanitizeForJson(recentTrips),
          licenseNumber,
          yearsOfExperience,
          user.id,
        ],
      );

      const updatedUser = updateResult.rows[0];
      res.json(mapUserToProfile(updatedUser));
    } catch (error) {
      if (handleZodError(error, res)) {
        return;
      }
      if (handleKnownDatabaseError(error, res)) {
        return;
      }
      next(error);
    }
  },
);

authRouter.post(
  '/logout',
  (req, res, next) => {
    void authenticateRequest(req, res, next);
  },
  (req, res) => {
    const { token } = req as AuthenticatedRequest;
    if (!token) {
      res.status(204).end();
      return;
    }
    res.status(204).end();
  },
);

const handleKnownDatabaseError = (error: unknown, res: Response): boolean => {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code?: string }).code === 'string'
  ) {
    const { code, detail } = error as { code?: string; detail?: string };
    if (code === '23505') {
      const message =
        detail && detail.includes('email')
          ? 'Email is already registered'
          : 'Duplicate value violates unique constraint';
      res.status(409).json({ message });
      return true;
    }
  }
  return false;
};

export { authRouter };

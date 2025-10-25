import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import { env } from '../../config/env';
import { database } from '../../infra/database';
import type {
  DriverAvailability,
  DriverStats,
  DriverVehicle,
  PassengerPreferences,
  PassengerProfile,
  PassengerRecentTrip,
} from './auth.types';
import { AuthSession, AuthProfile, DbUser } from './auth.types';
import type {
  DriverProfileUpdateInput,
  DriverRegisterInput,
  LoginInput,
  PassengerProfileUpdateInput,
  PassengerRegisterInput,
  ProfileUpdateInput,
  RegisterInput,
} from './auth.validation';
import { authRepository } from './auth.repository';

const SALT_ROUNDS = 12;

export class AuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ConflictError extends AuthError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizePhone = (phone: string): string => phone.replace(/\s+/g, '').trim();

const sanitizeForJson = <T>(value: T): T | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const asQueryClient = (tx: unknown): typeof database.db => tx as typeof database.db;

const isUniqueConstraintError = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (error as { code: string }).code === '23505',
  );

const issueToken = (user: DbUser): { token: string; expiresAt?: string } => {
  const token = jwt.sign(
    { role: user.role },
    env.jwtSecret as Secret,
    {
      subject: String(user.id),
      expiresIn: env.jwtExpiresIn as unknown as SignOptions['expiresIn'],
    },
  );

  const decoded = jwt.decode(token) as JwtPayload | null;
  const expiresAt =
    decoded?.exp !== undefined ? new Date(decoded.exp * 1000).toISOString() : undefined;

  return { token, expiresAt };
};

const mapUserToProfile = (user: DbUser): AuthProfile => {
  if (user.role === 'passenger') {
  const preferences = (user.preferences as PassengerPreferences | null) ?? {};
    const emergencyContact = user.emergencyContact as PassengerProfile['emergencyContact'];
    const recentTrips = Array.isArray(user.recentTrips)
      ? (user.recentTrips as PassengerRecentTrip[])
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
    statsData.yearsOfExperience ?? user.yearsOfExperience ?? 0;

  return {
    id: user.id,
    role: 'driver',
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    avatarUrl: undefined,
    location: user.location ?? undefined,
    bio: user.bio ?? undefined,
    licenseNumber: user.licenseNumber ?? undefined,
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
      weekdays: Array.isArray(availabilityData?.weekdays) ? availabilityData.weekdays : [],
      shift: availabilityData?.shift ?? 'day',
    },
  };
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

const createPassengerUserPayload = (payload: PassengerRegisterInput) => {
  const preferences = {
    preferredSeat: payload.preferences?.preferredSeat,
    musicPreference: payload.preferences?.musicPreference ?? 'neutral',
    accessibilityNeeds: payload.preferences?.accessibilityNeeds,
    favouriteRoutes: payload.preferences?.favouriteRoutes ?? [],
  };

  return {
    emergencyContact: sanitizeForJson(payload.emergencyContact),
    preferences: sanitizeForJson(preferences),
    vehicle: null,
    availability: null,
    stats: null,
    recentTrips: sanitizeForJson<PassengerRecentTrip[]>([]),
    licenseNumber: null,
    yearsOfExperience: null,
  };
};

const createDriverUserPayload = (payload: DriverRegisterInput) => {
  const vehicle = {
    manufacturer: payload.vehicle?.manufacturer ?? '',
    model: payload.vehicle?.model ?? '',
    registrationNumber: payload.vehicle?.registrationNumber ?? '',
    capacity: payload.vehicle?.capacity ?? 4,
    color: payload.vehicle?.color ?? undefined,
  };
  const availability = {
    weekdays: payload.availability?.weekdays ?? [],
    shift: payload.availability?.shift ?? 'day',
  };
  const yearsOfExperience = payload.yearsOfExperience ?? 0;
  const stats = {
    totalTrips: 0,
    rating: 5,
    yearsOfExperience,
    cancellationRate: 0,
  };

  return {
    emergencyContact: null,
    preferences: null,
    vehicle: sanitizeForJson(vehicle),
    availability: sanitizeForJson(availability),
    stats: sanitizeForJson(stats),
    recentTrips: null,
    licenseNumber: payload.licenseNumber?.trim() ?? null,
    yearsOfExperience,
  };
};

const hashPassword = (password: string) => bcrypt.hash(password, SALT_ROUNDS);

export const authService = {
  async register(payload: RegisterInput): Promise<AuthSession> {
    const email = normalizeEmail(payload.email);
    const phone = payload.phone ? normalizePhone(payload.phone) : null;

    return database.db.transaction(async (tx) => {
      if (await authRepository.emailExists(email, asQueryClient(tx))) {
        throw new ConflictError('Email is already registered');
      }
      if (phone && (await authRepository.phoneExists(phone, undefined, asQueryClient(tx)))) {
        throw new ConflictError('Phone number is already registered');
      }

      const passwordHash = await hashPassword(payload.password);
      const id = randomUUID();
      const timestamp = new Date();

      const baseUser = {
        id,
        role: payload.role,
        name: payload.name.trim(),
        email,
        passwordHash,
        phone,
        location: payload.location?.trim() ?? null,
        bio: payload.bio?.trim() ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      } as const;

      const insertValues =
        payload.role === 'passenger'
          ? {
              ...baseUser,
              ...createPassengerUserPayload(payload as PassengerRegisterInput),
            }
          : {
              ...baseUser,
              ...createDriverUserPayload(payload as DriverRegisterInput),
            };

      try {
        const user = await authRepository.insertUser(insertValues, asQueryClient(tx));
        return buildSession(user);
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ConflictError('Duplicate value violates unique constraint');
        }
        throw error;
      }
    });
  },

  async login(payload: LoginInput): Promise<AuthSession> {
    const identifier = payload.identifier.trim();
    if (!identifier) {
      throw new UnauthorizedError('Invalid credentials');
    }

    let user: DbUser | null = null;
    if (identifier.includes('@')) {
      user = await authRepository.findByEmail(normalizeEmail(identifier), payload.role);
    } else {
      user = await authRepository.findByPhone(normalizePhone(identifier), payload.role);
    }

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return buildSession(user);
  },

  async getProfile(userId: string): Promise<AuthProfile | null> {
    const user = await authRepository.findById(userId);
    return user ? mapUserToProfile(user) : null;
  },

  async updateProfile(user: DbUser, updates: ProfileUpdateInput): Promise<DbUser> {
    if (updates.role !== user.role) {
      throw new ForbiddenError('Role mismatch for profile update');
    }

    let phoneToPersist = user.phone;
    if (updates.phone !== undefined) {
      const normalizedPhone = updates.phone.trim() ? normalizePhone(updates.phone) : null;
      if (normalizedPhone && normalizedPhone !== user.phone) {
        const conflict = await authRepository.phoneExists(normalizedPhone, user.id);
        if (conflict) {
          throw new ConflictError('Phone number is already registered');
        }
      }
      phoneToPersist = normalizedPhone;
    }

    const baseUpdates = {
      name: updates.name?.trim() ?? user.name,
      phone: phoneToPersist,
      location: updates.location?.trim() ?? user.location,
      bio: updates.bio?.trim() ?? user.bio,
      updatedAt: new Date(),
    };

    let emergencyContact = user.emergencyContact;
    let preferences = user.preferences;
    let recentTrips = user.recentTrips;
    let vehicle = user.vehicle;
    let availability = user.availability;
    let stats = user.stats;
    let licenseNumber = user.licenseNumber;
    let yearsOfExperience = user.yearsOfExperience;

    if (user.role === 'passenger') {
      const passengerUpdates = updates as PassengerProfileUpdateInput;

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
      const driverUpdates = updates as DriverProfileUpdateInput;

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
        const currentAvailability = (user.availability as DriverProfileUpdateInput['availability'] | null) ?? {};
        const mergedAvailability = {
          weekdays: driverUpdates.availability?.weekdays ?? currentAvailability?.weekdays ?? [],
          shift: driverUpdates.availability?.shift ?? currentAvailability?.shift ?? 'day',
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
            user.yearsOfExperience ??
            0,
          cancellationRate:
            driverUpdates.stats.cancellationRate ?? currentStats.cancellationRate ?? 0,
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

    const updatedUser = await authRepository.updateUser(
      user.id,
      {
        ...baseUpdates,
        emergencyContact: sanitizeForJson(emergencyContact),
        preferences: sanitizeForJson(preferences),
        vehicle: sanitizeForJson(vehicle),
        availability: sanitizeForJson(availability),
        stats: sanitizeForJson(stats),
        recentTrips: sanitizeForJson(recentTrips),
        licenseNumber,
        yearsOfExperience,
      },
    );

    return updatedUser;
  },

  async authenticate(token: string): Promise<{ user: DbUser; token: string }> {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    if (!userId) {
      throw new UnauthorizedError('Invalid token payload');
    }

    const user = await authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return { user, token };
  },

  mapUserToProfile,
  buildSession,
};

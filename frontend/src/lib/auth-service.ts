import { apiRequest } from "./api-client";

export type AuthRole = "passenger" | "driver";

interface BaseProfile {
  id: string;
  role: AuthRole;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
}

export interface PassengerProfile extends BaseProfile {
  role: "passenger";
  emergencyContact?: {
    name: string;
    phone: string;
    relation?: string;
  };
  preferences: {
    preferredSeat?: "front" | "middle" | "back";
    musicPreference?: "quiet" | "neutral" | "lively";
    accessibilityNeeds?: string;
    favouriteRoutes: string[];
  };
  recentTrips: Array<{
    id: string;
    route: string;
    date: string;
    driver: string;
    status: "completed" | "cancelled" | "scheduled";
  }>;
}

export interface DriverProfile extends BaseProfile {
  role: "driver";
  licenseNumber?: string;
  vehicle: {
    manufacturer: string;
    model: string;
    registrationNumber: string;
    capacity: number;
    color?: string;
  };
  stats: {
    totalTrips: number;
    rating: number;
    yearsOfExperience: number;
    cancellationRate: number;
  };
  availability: {
    weekdays: string[];
    shift: "morning" | "day" | "evening" | "night";
  };
}

export type AuthProfile = PassengerProfile | DriverProfile;

export interface AuthSession {
  token: string;
  refreshToken?: string;
  issuedAt: string;
  expiresAt?: string;
  profile: AuthProfile;
}

export interface LoginPayload {
  identifier: string;
  password: string;
  role: AuthRole;
}

type BaseRegisterPayload = {
  role: AuthRole;
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  bio?: string;
};

export type PassengerRegisterPayload = BaseRegisterPayload & {
  role: "passenger";
  preferences?: Partial<PassengerProfile["preferences"]>;
  emergencyContact?: PassengerProfile["emergencyContact"];
};

export type DriverRegisterPayload = BaseRegisterPayload & {
  role: "driver";
  licenseNumber?: string;
  vehicle?: Partial<DriverProfile["vehicle"]>;
  availability?: Partial<DriverProfile["availability"]>;
  yearsOfExperience?: number;
};

export type RegisterPayload = PassengerRegisterPayload | DriverRegisterPayload;
export type PassengerProfileUpdate = Partial<
  Omit<PassengerProfile, "id" | "role">
> & {
  role: "passenger";
};

export type DriverProfileUpdate = Partial<
  Omit<DriverProfile, "id" | "role">
> & {
  role: "driver";
};

export type ProfileUpdateInput = PassengerProfileUpdate | DriverProfileUpdate;

interface ApiLoginResponse {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  profile: AuthProfile;
}

const USE_AUTH_MOCKS = import.meta.env.VITE_USE_AUTH_MOCKS !== "false";

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

interface MockAccount {
  password: string;
  profile: AuthProfile;
}

const mockAccounts: Record<AuthRole, MockAccount[]> = {
  passenger: [
    {
      password: "himal123",
      profile: {
        id: "passenger-1",
        role: "passenger",
        name: "Pema Sherpa",
        email: "pema.passenger@himal.app",
        phone: "+91 99887 66554",
        avatarUrl: undefined,
        location: "Darjeeling Bazaar",
        bio: "Local guide who loves the hill rides",
        emergencyContact: {
          name: "Tenzing Sherpa",
          phone: "+91 99001 22334",
          relation: "Brother",
        },
        preferences: {
          preferredSeat: "front",
          musicPreference: "neutral",
          accessibilityNeeds: "Knee support",
          favouriteRoutes: ["Darjeeling ↔ Siliguri", "Darjeeling ↔ Mirik"],
        },
        recentTrips: [
          {
            id: "trip-101",
            route: "Darjeeling → Kurseong",
            date: "2024-09-15",
            driver: "Karma Tamang",
            status: "completed",
          },
          {
            id: "trip-102",
            route: "Darjeeling → Siliguri",
            date: "2024-09-20",
            driver: "Sonam Bhutia",
            status: "completed",
          },
        ],
      },
    },
  ],
  driver: [
    {
      password: "himal999",
      profile: {
        id: "driver-1",
        role: "driver",
        name: "Karma Tamang",
        email: "karma.driver@himal.app",
        phone: "+91 98765 43210",
        avatarUrl: undefined,
        location: "Ghoom, Darjeeling",
        bio: "Driving the mountain routes for over 12 years",
        licenseNumber: "WB-DRI-2024-7788",
        vehicle: {
          manufacturer: "Mahindra",
          model: "Bolero",
          registrationNumber: "WB-76A-4210",
          capacity: 10,
          color: "Moss Green",
        },
        stats: {
          totalTrips: 1468,
          rating: 4.8,
          yearsOfExperience: 12,
          cancellationRate: 1.2,
        },
        availability: {
          weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          shift: "morning",
        },
      },
    },
  ],
};

const mockSessions = new Map<string, AuthProfile>();

const findMockAccount = (
  role: AuthRole,
  identifier: string
): MockAccount | undefined => {
  return mockAccounts[role].find(
    (account) =>
      account.profile.email === identifier ||
      account.profile.phone === identifier
  );
};

const createMockSession = (profile: AuthProfile): AuthSession => {
  const token = `mock-token-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  mockSessions.set(token, deepClone(profile));
  return {
    token,
    refreshToken: `mock-refresh-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    profile: deepClone(profile),
  };
};

const mergeProfile = (
  existing: AuthProfile,
  updates: ProfileUpdateInput
): AuthProfile => {
  if (updates.role !== existing.role) {
    throw new Error("Cannot change role");
  }

  if (existing.role === "passenger" && updates.role === "passenger") {
    return {
      ...existing,
      ...updates,
      preferences: updates.preferences
        ? { ...existing.preferences, ...updates.preferences }
        : existing.preferences,
      emergencyContact:
        updates.emergencyContact !== undefined
          ? updates.emergencyContact
          : existing.emergencyContact,
    };
  }

  if (existing.role === "driver" && updates.role === "driver") {
    return {
      ...existing,
      ...updates,
      vehicle: updates.vehicle
        ? { ...existing.vehicle, ...updates.vehicle }
        : existing.vehicle,
      stats: updates.stats
        ? { ...existing.stats, ...updates.stats }
        : existing.stats,
      availability: updates.availability
        ? { ...existing.availability, ...updates.availability }
        : existing.availability,
    };
  }

  return existing;
};

const generateProfileId = (role: AuthRole) => {
  const prefix = role === "driver" ? "driver" : "passenger";
  const counter = mockAccounts[role].length + mockSessions.size + 1;
  return `${prefix}-${counter}-${Date.now().toString(36)}`;
};

const ensureUniqueAccount = (role: AuthRole, email: string, phone?: string) => {
  if (findMockAccount(role, email)) {
    throw new Error("An account with this email already exists.");
  }
  if (phone && findMockAccount(role, phone)) {
    throw new Error("An account with this phone number already exists.");
  }
};

const buildProfileFromRegistration = (
  payload: RegisterPayload
): AuthProfile => {
  const id = generateProfileId(payload.role);
  if (payload.role === "passenger") {
    return {
      id,
      role: "passenger",
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      avatarUrl: undefined,
      location: payload.location,
      bio: payload.bio,
      preferences: {
        preferredSeat: payload.preferences?.preferredSeat,
        musicPreference: payload.preferences?.musicPreference ?? "neutral",
        accessibilityNeeds: payload.preferences?.accessibilityNeeds,
        favouriteRoutes: payload.preferences?.favouriteRoutes ?? [],
      },
      emergencyContact: payload.emergencyContact,
      recentTrips: [],
    };
  }

  const vehicle = {
    manufacturer: payload.vehicle?.manufacturer ?? "Mahindra",
    model: payload.vehicle?.model ?? "Bolero",
    registrationNumber:
      payload.vehicle?.registrationNumber ??
      `WB-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`,
    capacity: payload.vehicle?.capacity ?? 10,
    color: payload.vehicle?.color,
  };

  const availability = {
    weekdays: payload.availability?.weekdays ?? [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
    ],
    shift: payload.availability?.shift ?? "day",
  };

  return {
    id,
    role: "driver",
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    avatarUrl: undefined,
    location: payload.location,
    bio: payload.bio,
    licenseNumber: payload.licenseNumber,
    vehicle,
    stats: {
      totalTrips: 0,
      rating: 5,
      yearsOfExperience: payload.yearsOfExperience ?? 0,
      cancellationRate: 0,
    },
    availability,
  };
};

const mockRegister = async (payload: RegisterPayload): Promise<AuthSession> => {
  ensureUniqueAccount(payload.role, payload.email, payload.phone);
  const profile = buildProfileFromRegistration(payload);
  const snapshot = deepClone(profile);
  mockAccounts[payload.role].push({
    password: payload.password,
    profile: snapshot,
  });
  return createMockSession(snapshot);
};

const mockLogin = async (payload: LoginPayload): Promise<AuthSession> => {
  const account = findMockAccount(payload.role, payload.identifier);
  if (!account || account.password !== payload.password) {
    throw new Error("Invalid credentials");
  }
  return createMockSession(account.profile);
};

const mockFetchProfile = async (token: string): Promise<AuthProfile> => {
  const profile = mockSessions.get(token);
  if (!profile) {
    throw new Error("Session expired");
  }
  return deepClone(profile);
};

const mockUpdateProfile = async (
  token: string,
  updates: ProfileUpdateInput
): Promise<AuthProfile> => {
  const existing = mockSessions.get(token);
  if (!existing) {
    throw new Error("Session expired");
  }
  const updated = mergeProfile(existing, updates);
  mockSessions.set(token, deepClone(updated));

  const accountBucket = mockAccounts[updated.role];
  const account = accountBucket.find((item) => item.profile.id === updated.id);
  if (account) {
    account.profile = deepClone(updated);
  }

  return deepClone(updated);
};

const mockLogout = async (token?: string) => {
  if (token) {
    mockSessions.delete(token);
  }
};

export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthSession> => {
    if (USE_AUTH_MOCKS) {
      return mockRegister(payload);
    }
    const response = await apiRequest<ApiLoginResponse, RegisterPayload>(
      "/auth/register",
      {
        method: "POST",
        json: payload,
      }
    );
    return {
      token: response.token,
      refreshToken: response.refreshToken,
      issuedAt: new Date().toISOString(),
      expiresAt: response.expiresAt,
      profile: response.profile,
    };
  },
  login: async (payload: LoginPayload): Promise<AuthSession> => {
    if (USE_AUTH_MOCKS) {
      return mockLogin(payload);
    }
    const response = await apiRequest<ApiLoginResponse, LoginPayload>(
      "/auth/login",
      {
        method: "POST",
        json: payload,
      }
    );
    return {
      token: response.token,
      refreshToken: response.refreshToken,
      issuedAt: new Date().toISOString(),
      expiresAt: response.expiresAt,
      profile: response.profile,
    };
  },
  fetchProfile: async (token: string): Promise<AuthProfile> => {
    if (USE_AUTH_MOCKS) {
      return mockFetchProfile(token);
    }
    return apiRequest<AuthProfile>("/auth/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  updateProfile: async (
    token: string,
    updates: ProfileUpdateInput
  ): Promise<AuthProfile> => {
    if (USE_AUTH_MOCKS) {
      return mockUpdateProfile(token, updates);
    }
    return apiRequest<AuthProfile, ProfileUpdateInput>("/auth/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      json: updates,
    });
  },
  logout: async (token?: string): Promise<void> => {
    if (USE_AUTH_MOCKS) {
      await mockLogout(token);
      return;
    }
    if (!token) {
      return;
    }
    try {
      await apiRequest<void>("/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.warn("Failed to notify API about logout", error);
    }
  },
};

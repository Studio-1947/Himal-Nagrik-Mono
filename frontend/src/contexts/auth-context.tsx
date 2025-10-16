import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  authService,
  type AuthProfile,
  type AuthRole,
  type AuthSession,
  type DriverProfileUpdate,
  type LoginPayload,
  type RegisterPayload,
  type PassengerProfileUpdate,
} from "@/lib/auth-service";

const STORAGE_KEY = "himal-nagrik-auth-session";

type AuthStatus = "unauthenticated" | "authenticated";

type LoginResult = {
  session: AuthSession;
};

type UpdateProfileResult = {
  profile: AuthProfile;
};

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  profile: AuthProfile | null;
  role: AuthRole | null;
  isPending: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<LoginResult>;
  register: (payload: RegisterPayload) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<AuthProfile | undefined>;
  updateProfile: (
    updates: PassengerProfileUpdate | DriverProfileUpdate
  ) => Promise<UpdateProfileResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch (error) {
    console.warn("Failed to parse stored auth session", error);
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const persistSession = (session: AuthSession | null) => {
  if (typeof window === "undefined") {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(() =>
    readStoredSession()
  );
  const [status, setStatus] = useState<AuthStatus>(() =>
    session ? "authenticated" : "unauthenticated"
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    persistSession(session);
    setStatus(session ? "authenticated" : "unauthenticated");
  }, [session]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResult> => {
      setIsPending(true);
      setError(null);
      try {
        const nextSession = await authService.login(payload);
        setSession(nextSession);
        return { session: nextSession };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to log in";
        setError(message);
        setStatus("unauthenticated");
        throw caughtError;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<LoginResult> => {
      setIsPending(true);
      setError(null);
      try {
        const nextSession = await authService.register(payload);
        setSession(nextSession);
        return { session: nextSession };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to sign up";
        setError(message);
        setStatus("unauthenticated");
        throw caughtError;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsPending(true);
    try {
      await authService.logout(session?.token);
    } finally {
      setSession(null);
      setError(null);
      setIsPending(false);
    }
  }, [session]);

  const refreshProfile = useCallback(async (): Promise<
    AuthProfile | undefined
  > => {
    if (!session) {
      return undefined;
    }
    setIsPending(true);
    setError(null);
    try {
      const profile = await authService.fetchProfile(session.token);
      setSession((current) => (current ? { ...current, profile } : current));
      return profile;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to refresh profile";
      setError(message);
      return undefined;
    } finally {
      setIsPending(false);
    }
  }, [session]);

  const updateProfile = useCallback(
    async (
      updates: PassengerProfileUpdate | DriverProfileUpdate
    ): Promise<UpdateProfileResult> => {
      if (!session) {
        throw new Error("User is not authenticated");
      }
      setIsPending(true);
      setError(null);
      try {
        const profile = await authService.updateProfile(session.token, updates);
        setSession((current) => (current ? { ...current, profile } : current));
        return { profile };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update profile";
        setError(message);
        throw caughtError;
      } finally {
        setIsPending(false);
      }
    },
    [session]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile: session?.profile ?? null,
      role: session?.profile.role ?? null,
      isPending,
      error,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
    }),
    [
      status,
      session,
      isPending,
      error,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

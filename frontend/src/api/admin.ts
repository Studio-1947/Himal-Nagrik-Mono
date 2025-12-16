import { apiRequest } from "@/lib/api-client";
import { type AuthRole } from "@/lib/auth-service";

const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`
});

export type AdminUser = {
    id: string;
    name: string;
    email: string;
    role: 'passenger' | 'driver' | 'admin';
    createdAt: string; // ISO date
};

export type AdminRide = {
    id: string;
    status: string;
    passengerId: string;
    driverId: string | null;
    pickupLocation: Record<string, any>;
    dropoffLocation: Record<string, any>;
    createdAt: string;
};

export const adminService = {
    getUsers: async (token: string): Promise<AdminUser[]> => {
        return apiRequest<AdminUser[]>('/admin/users', {
            headers: authHeaders(token),
        });
    },

    getRides: async (token: string): Promise<AdminRide[]> => {
        return apiRequest<AdminRide[]>('/admin/rides', {
            headers: authHeaders(token),
        });
    },

    cancelRide: async (token: string, rideId: string): Promise<void> => {
        return apiRequest<void>(`/admin/rides/${rideId}/cancel`, {
            method: "POST",
            headers: authHeaders(token),
        });
    }
};

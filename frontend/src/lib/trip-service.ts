import { apiClient } from './api-client';

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface StartTripRequest {
  rideId: string;
  location?: LocationPoint;
}

export interface UpdateLocationRequest {
  location: LocationPoint;
  speed?: number;
  heading?: number;
}

export interface CompleteTripRequest {
  location?: LocationPoint;
  finalFare?: number;
  notes?: string;
}

export interface TripResponse {
  rideId: string;
  status: string;
  currentLocation?: LocationPoint;
  startedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  distanceTraveled?: number;
  actualFare?: number;
}

export interface ActiveTripSummary {
  rideId: string;
  passengerId: string;
  driverId: string;
  status: string;
  currentLocation?: LocationPoint;
  pickupLocation: LocationPoint;
  dropoffLocation: LocationPoint;
  startedAt?: string;
  estimatedArrival?: string;
}

export interface TripHistoryItem {
  rideId: string;
  status: string;
  pickupLocation: LocationPoint;
  dropoffLocation: LocationPoint;
  requestedAt: string;
  completedAt?: string;
  fare?: { amount: number; currency: string };
  distanceTraveled?: number;
}

export const tripService = {
  async startTrip(token: string, data: StartTripRequest): Promise<TripResponse> {
    const response = await apiClient.post('/trips/start', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async updateLocation(
    token: string,
    rideId: string,
    data: UpdateLocationRequest,
  ): Promise<void> {
    await apiClient.post(`/trips/${rideId}/location`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async completeTrip(
    token: string,
    rideId: string,
    data: CompleteTripRequest,
  ): Promise<TripResponse> {
    const response = await apiClient.post(`/trips/${rideId}/complete`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getCurrentTrip(token: string): Promise<ActiveTripSummary | null> {
    try {
      const response = await apiClient.get('/trips/current', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getTripHistory(token: string, limit = 20): Promise<TripHistoryItem[]> {
    const response = await apiClient.get('/trips/history', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.trips || [];
  },

  async getTripDetails(token: string, rideId: string): Promise<TripResponse> {
    const response = await apiClient.get(`/trips/${rideId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};






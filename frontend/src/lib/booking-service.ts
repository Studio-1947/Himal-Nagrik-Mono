import { apiRequest, ApiRequestOptions } from './api-client';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
}

export interface Booking {
  id: string;
  passenger_id: string;
  driver_id?: string;
  pickup_location: Location;
  destination_location: Location;
  pickup_time: string;
  estimated_duration?: number;
  estimated_distance?: number;
  estimated_fare?: number;
  actual_fare?: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  vehicle_type: 'standard' | 'premium' | 'suv' | 'shared';
  passenger_count: number;
  special_requests?: string;
  payment_method: 'cash' | 'card' | 'digital_wallet';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  trip_started_at?: string;
  trip_completed_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  passenger_name?: string;
  passenger_phone?: string;
  driver_name?: string;
  driver_phone?: string;
}

export interface CreateBookingRequest {
  pickupLocation: Location;
  destinationLocation: Location;
  pickupTime: string;
  vehicleType?: 'standard' | 'premium' | 'suv' | 'shared';
  passengerCount?: number;
  paymentMethod?: 'cash' | 'card' | 'digital_wallet';
  specialRequests?: string;
}

export interface UpdateBookingStatusRequest {
  status: 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  cancellationReason?: string;
}

export interface NearbyDriver {
  id: string;
  name: string;
  phone?: string;
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
  latitude: number;
  longitude: number;
  distance: number;
  last_updated: string;
}

export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  isAvailable?: boolean;
}

export interface RateBookingRequest {
  rating: number;
  comment?: string;
}

export interface BookingResponse {
  message: string;
  booking: Booking;
}

export interface BookingsListResponse {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface NearbyDriversResponse {
  drivers: NearbyDriver[];
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const bookingService = {
  // Create a new booking (Passenger only)
  createBooking: async (data: CreateBookingRequest): Promise<BookingResponse> => {
    return apiRequest('/bookings', {
      method: 'POST',
      headers: getAuthHeaders(),
      json: data,
    });
  },

  // Get user's bookings
  getBookings: async (page = 1, limit = 10): Promise<BookingsListResponse> => {
    return apiRequest(`/bookings?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  // Get specific booking
  getBooking: async (id: string): Promise<{ booking: Booking }> => {
    return apiRequest(`/bookings/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  // Accept booking (Driver only)
  acceptBooking: async (id: string): Promise<BookingResponse> => {
    return apiRequest(`/bookings/${id}/accept`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
  },

  // Update booking status
  updateBookingStatus: async (id: string, data: UpdateBookingStatusRequest): Promise<BookingResponse> => {
    return apiRequest(`/bookings/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      json: data,
    });
  },

  // Update driver location (Driver only)
  updateLocation: async (data: UpdateLocationRequest): Promise<{ message: string }> => {
    return apiRequest('/bookings/location', {
      method: 'POST',
      headers: getAuthHeaders(),
      json: data,
    });
  },

  // Get nearby drivers (Passenger only)
  getNearbyDrivers: async (lat: number, lng: number, radius = 10): Promise<NearbyDriversResponse> => {
    return apiRequest(`/bookings/drivers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  // Rate a completed booking
  rateBooking: async (id: string, data: RateBookingRequest): Promise<{ message: string }> => {
    return apiRequest(`/bookings/${id}/rate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      json: data,
    });
  },
};
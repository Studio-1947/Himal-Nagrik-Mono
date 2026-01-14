export interface PassengerDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface RideDetails {
  rideId: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: Date;
  fare: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface BookingConfirmation {
  bookingId: string;
  passengerDetails: PassengerDetails;
  rideDetails: RideDetails;
  paymentStatus: 'pending' | 'completed';
  bookingDate: Date;
}

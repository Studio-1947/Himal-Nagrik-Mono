import React from 'react';
import { BookingConfirmation } from '../models/PassengerDetails';

interface Props {
  booking: BookingConfirmation;
}

export const BookingConfirmationComponent: React.FC<Props> = ({ booking }) => {
  return (
    <div className="booking-confirmation">
      <h2>Booking Confirmed!</h2>
      <div className="booking-details">
        <h3>Booking ID: {booking.bookingId}</h3>
        <div className="passenger-info">
          <h4>Passenger Details</h4>
          <p>Name: {booking.passengerDetails.name}</p>
          <p>Email: {booking.passengerDetails.email}</p>
          <p>Phone: {booking.passengerDetails.phone}</p>
        </div>
        <div className="ride-info">
          <h4>Ride Details</h4>
          <p>Pickup: {booking.rideDetails.pickupLocation}</p>
          <p>Dropoff: {booking.rideDetails.dropoffLocation}</p>
          <p>Date: {booking.rideDetails.date.toLocaleDateString()}</p>
          <p>Fare: ${booking.rideDetails.fare}</p>
          <p>Status: {booking.rideDetails.status}</p>
        </div>
        <div className="payment-info">
          <p>Payment Status: {booking.paymentStatus}</p>
          <p>Booking Date: {booking.bookingDate.toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

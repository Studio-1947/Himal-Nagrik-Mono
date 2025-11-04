import { MapPin, Phone, Navigation as NavigationIcon, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingResponse } from "@/lib/booking-service";

type ActiveRideDisplayProps = {
  booking: BookingResponse | null;
  onStartTrip?: () => void;
  onCompleteTrip?: () => void;
  onNavigate?: () => void;
};

export const ActiveRideDisplay = ({
  booking,
  onStartTrip,
  onCompleteTrip,
  onNavigate,
}: ActiveRideDisplayProps) => {
  if (!booking) return null;

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'driver_assigned':
        return {
          text: 'Heading to Pickup',
          color: 'bg-blue-500',
          icon: '🚗',
          action: 'Navigate to Pickup',
        };
      case 'enroute_pickup':
        return {
          text: 'En Route to Pickup',
          color: 'bg-blue-500',
          icon: '🚗',
          action: 'Arrive at Pickup',
        };
      case 'passenger_onboard':
        return {
          text: 'Passenger On Board',
          color: 'bg-emerald-500',
          icon: '✅',
          action: 'Complete Trip',
        };
      default:
        return {
          text: 'Active Ride',
          color: 'bg-slate-500',
          icon: '🚗',
          action: 'View Details',
        };
    }
  };

  const statusInfo = getStatusDisplay(booking.status);
  const passenger = booking.passenger;

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      // Default: Open in Google Maps
      const location = booking.status === 'passenger_onboard' 
        ? booking.dropoff 
        : booking.pickup;
      
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
      window.open(url, '_blank');
    }
  };

  const handleCallPassenger = () => {
    if (passenger?.phone) {
      window.location.href = `tel:${passenger.phone}`;
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl border border-emerald-500/20 overflow-hidden shadow-xl">
      {/* Status Header */}
      <div className={`${statusInfo.color} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{statusInfo.icon}</span>
          <div>
            <h3 className="text-white font-bold text-lg">{statusInfo.text}</h3>
            <p className="text-white/80 text-sm">Booking #{booking.id.slice(0, 8)}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Passenger Info */}
        {passenger && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 rounded-full p-2">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <p className="text-white font-semibold">{passenger.name}</p>
                  {passenger.phone && (
                    <p className="text-sm text-slate-400">{passenger.phone}</p>
                  )}
                </div>
              </div>
              {passenger.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCallPassenger}
                  className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Locations */}
        <div className="space-y-3">
          {/* Pickup */}
          <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
                  Pickup Location
                </p>
                <p className="text-white text-sm">
                  {booking.pickup.description || 
                   `${booking.pickup.latitude.toFixed(4)}, ${booking.pickup.longitude.toFixed(4)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Dropoff */}
          <div className="bg-sky-500/10 rounded-2xl p-4 border border-sky-500/20">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-sky-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider mb-1">
                  Dropoff Location
                </p>
                <p className="text-white text-sm">
                  {booking.dropoff.description || 
                   `${booking.dropoff.latitude.toFixed(4)}, ${booking.dropoff.longitude.toFixed(4)}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fare */}
        {booking.fareQuote && (
          <div className="bg-gradient-to-r from-emerald-500/20 to-sky-500/20 rounded-2xl p-4 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Estimated Fare</span>
              <span className="text-2xl font-bold text-white">
                ₹{booking.fareQuote.amount}
              </span>
            </div>
            {booking.fareQuote.breakdown && booking.fareQuote.breakdown.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                  View breakdown
                </summary>
                <div className="mt-2 space-y-1">
                  {booking.fareQuote.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-400">
                      <span>{item.label}</span>
                      <span>₹{item.amount}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleNavigate}
            variant="outline"
            className="flex-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
          >
            <NavigationIcon className="h-4 w-4 mr-2" />
            Navigate
          </Button>
          
          {booking.status === 'driver_assigned' && onStartTrip && (
            <Button
              onClick={onStartTrip}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Start Trip
            </Button>
          )}
          
          {booking.status === 'passenger_onboard' && onCompleteTrip && (
            <Button
              onClick={onCompleteTrip}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Trip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};



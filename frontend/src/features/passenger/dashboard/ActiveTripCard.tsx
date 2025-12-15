import { Phone, MapPin, Clock, CarFront, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookingResponse } from "@/lib/booking-service";

type ActiveTripCardProps = {
  booking: BookingResponse;
  onViewTrip?: (bookingId: string) => void;
};

const statusLabel = (status: BookingResponse["status"]): string => {
  switch (status) {
    case "driver_assigned":
      return "Driver assigned";
    case "enroute_pickup":
      return "Driver en route to pickup";
    case "passenger_onboard":
      return "Enjoy your ride";
    case "completed":
      return "Trip completed";
    case "cancelled_driver":
    case "cancelled_passenger":
    case "cancelled_system":
      return "Trip cancelled";
    default:
      return "Waiting for driver";
  }
};

const statusTone = (status: BookingResponse["status"]): string => {
  switch (status) {
    case "driver_assigned":
      return "bg-blue-500/15 text-blue-200";
    case "enroute_pickup":
      return "bg-amber-500/15 text-amber-200";
    case "passenger_onboard":
      return "bg-emerald-500/15 text-emerald-200";
    default:
      return "bg-slate-700/40 text-slate-200";
  }
};

export const ActiveTripCard = ({ booking, onViewTrip }: ActiveTripCardProps) => {
  const driver = booking.driver;
  const pickup = booking.pickup;
  const dropoff = booking.dropoff;

  return (
    <Card className="border-white/10 bg-white/5 shadow-lg">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg text-white">Active trip</CardTitle>
          <p className="text-sm text-slate-400">
            Booking {booking.id.slice(0, 8)} &middot; Requested{" "}
            {new Date(booking.requestedAt).toLocaleTimeString()}
          </p>
        </div>
        <Badge className={statusTone(booking.status)}>{statusLabel(booking.status)}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/20 p-3 text-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Driver</p>
              <p className="text-lg font-semibold text-white">
                {driver?.name ?? "Assigning the best driver"}
              </p>
              {driver?.vehicle?.registrationNumber && (
                <p className="text-sm text-slate-400">
                  {driver.vehicle.manufacturer} {driver.vehicle.model} &middot;{" "}
                  {driver.vehicle.registrationNumber}
                </p>
              )}
            </div>
            {driver?.phone && (
              <Button asChild variant="outline" size="sm" className="ml-auto border-white/20 text-white">
                <a href={`tel:${driver.phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call driver
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Pickup</p>
            <div className="mt-2 flex items-start gap-2 text-sm text-white">
              <MapPin className="mt-0.5 h-4 w-4 text-emerald-300" />
              <span>
                {pickup.description ??
                  `${pickup.latitude.toFixed(4)}, ${pickup.longitude.toFixed(4)}`}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300">Dropoff</p>
            <div className="mt-2 flex items-start gap-2 text-sm text-white">
              <MapPin className="mt-0.5 h-4 w-4 text-sky-300" />
              <span>
                {dropoff.description ??
                  `${dropoff.latitude.toFixed(4)}, ${dropoff.longitude.toFixed(4)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Clock className="h-4 w-4 text-emerald-200" />
              Last updated
            </div>
            <p className="mt-1 text-base font-medium text-white">
              {new Date(booking.lastUpdatedAt).toLocaleTimeString()}
            </p>
          </div>
          {booking.fareQuote && typeof booking.fareQuote === "object" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CarFront className="h-4 w-4 text-emerald-200" />
                Estimated fare
              </div>
              <p className="mt-1 text-base font-medium text-white">
                {"amount" in booking.fareQuote
                  ? `₹${(booking.fareQuote as { amount?: number }).amount ?? "—"}`
                  : "Will be calculated after trip"}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {onViewTrip && (
            <Button
              variant="secondary"
              onClick={() => onViewTrip(booking.id)}
              className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              View trip timeline
            </Button>
          )}
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4" />
            We will keep you updated if the status changes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};


import {
  CalendarClock,
  Car,
  Clock,
  Compass,
  MapPin,
  RefreshCcw,
  Route,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PassengerMap } from "./PassengerMap";
import type {
  PassengerDashboardSummary,
  FetchDashboardSummaryParams,
} from "@/lib/passenger-service";

type PassengerDashboardProps = {
  summary: PassengerDashboardSummary;
  onRefresh: () => Promise<void> | void;
  isRefreshing?: boolean;
  onSetFocus?: (params: FetchDashboardSummaryParams) => void;
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

const statusBadgeClass: Record<string, string> = {
  requested: "bg-amber-500/20 text-amber-100",
  driver_assigned: "bg-emerald-500/20 text-emerald-100",
  enroute_pickup: "bg-sky-500/20 text-sky-100",
  passenger_onboard: "bg-blue-500/20 text-blue-100",
};

const statusLabel: Record<string, string> = {
  requested: "Matching driver",
  driver_assigned: "Driver assigned",
  enroute_pickup: "Driver en route",
  passenger_onboard: "On trip",
};

export const PassengerDashboard = ({
  summary,
  onRefresh,
  isRefreshing,
  onSetFocus,
}: PassengerDashboardProps) => {
  const quickLocations = summary.savedLocations.slice(0, 4);
  const supplyHealthy = summary.driverAvailability.total >= 4;
  const supplyStatusText = supplyHealthy
    ? "Plenty of cars around you. Expect quick pickups."
    : summary.driverAvailability.total > 0
    ? "Drivers are active nearby. Book soon to secure a seat."
    : "Drivers are currently offline near you. Check back shortly.";

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
            Live nearby supply
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Good evening, {summary.passenger.name.split(" ")[0] ?? "traveller"}
          </h2>
          <p className="text-sm text-slate-300">{supplyStatusText}</p>
        </div>
        <Button
          onClick={onRefresh}
          variant="outline"
          className="inline-flex items-center gap-2 border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/15"
          disabled={Boolean(isRefreshing)}
        >
          <RefreshCcw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin text-emerald-200" : ""}`}
          />
          Refresh
        </Button>
      </header>

      <PassengerMap summary={summary} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/30">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            <Car className="h-4 w-4 text-emerald-300" />
            Drivers nearby
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {summary.driverAvailability.total}
          </p>
          <p className="text-sm text-slate-400">
            Within {summary.driverAvailability.radiusKm} km of your pickup
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/30">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            <Clock className="h-4 w-4 text-emerald-300" />
            Average pickup
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {summary.driverAvailability.averageEtaMinutes ?? "—"} min
          </p>
          <p className="text-sm text-slate-400">Refreshing every few seconds</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/30">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            Active perks
          </p>
          {summary.recentTrips.length > 0 ? (
            <p className="mt-3 text-sm text-slate-200">
              {summary.recentTrips.length} trip
              {summary.recentTrips.length === 1 ? "" : "s"} this week. Keep riding to unlock
              priority matching.
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-200">
              Book a ride to start earning loyalty points and faster pickups.
            </p>
          )}
        </div>
      </div>

      {summary.activeBooking ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 shadow-lg shadow-emerald-900/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-4 w-4" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                  Active ride
                </p>
                <p className="text-base font-semibold text-white">
                  {summary.activeBooking.pickup.description ?? "Pickup"} →{" "}
                  {summary.activeBooking.dropoff.description ?? "Dropoff"}
                </p>
              </div>
            </div>
            <Badge
              className={`border border-emerald-300/40 ${statusBadgeClass[summary.activeBooking.status] ?? "bg-slate-800/70 text-slate-100"}`}
            >
              {statusLabel[summary.activeBooking.status] ??
                summary.activeBooking.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-emerald-100/80">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1">
              <Route className="h-3.5 w-3.5" />
              Requested {formatDateTime(summary.activeBooking.requestedAt)}
            </span>
            {summary.activeBooking.driver ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1">
                <Car className="h-3.5 w-3.5" />
                {summary.activeBooking.driver.name}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 shadow-lg shadow-emerald-900/30">
          <div className="flex items-center gap-3">
            <Compass className="h-4 w-4 text-emerald-200" />
            <div>
              <p className="text-base font-semibold text-white">
                Ready for your next trip?
              </p>
              <p className="text-sm text-emerald-100/80">
                Pick a favourite route below to book in a tap.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MapPin className="h-4 w-4 text-emerald-300" />
              Quick destinations
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-200">
              {summary.savedLocations.length} saved
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickLocations.length > 0 ? (
              quickLocations.map((location) => (
                <button
                  type="button"
                  onClick={() =>
                    onSetFocus?.({
                      lat: location.location.latitude,
                      lng: location.location.longitude,
                    })
                  }
                  key={location.id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-left text-xs text-slate-200 transition hover:border-emerald-400/50 hover:bg-slate-900/80"
                >
                  <p className="font-medium text-white">{location.label}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                    {location.address}
                  </p>
                  {location.isDefault ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-100">
                      <Sparkles className="h-3 w-3" />
                      Default pickup
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/40 p-4 text-xs text-slate-300">
                Save your frequent pickup spots to access them here.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <CalendarClock className="h-4 w-4 text-emerald-300" />
              Recent journeys
            </div>
            <Badge className="bg-white/10 text-slate-200">
              {summary.recentTrips.length} recorded
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {summary.recentTrips.length > 0 ? (
              summary.recentTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-200"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{new Date(trip.requestedAt).toLocaleDateString()}</span>
                    <Badge className="bg-white/5 text-slate-200">
                      {trip.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {trip.pickup.description ?? "Pickup"} →{" "}
                    {trip.dropoff.description ?? "Dropoff"}
                  </p>
                  {trip.driver ? (
                    <p className="text-[11px] text-slate-400">
                      with {trip.driver.name}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/40 p-4 text-xs text-slate-300">
                Book your first ride to see it show up here.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

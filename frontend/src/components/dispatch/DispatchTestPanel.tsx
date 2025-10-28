import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigation, RefreshCcw, SatelliteDish, Users, Clock, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  dispatchService,
  type DispatchOffer,
  type DriverAvailability,
} from "@/lib/dispatch-service";

type DispatchTestPanelProps = {
  token: string;
  defaultCapacity: number;
};

const formatTimestamp = (iso: string | null): string | null => {
  if (!iso) {
    return null;
  }

  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return null;
  }
};

const getOfferStatusStyle = (status: DispatchOffer["status"]): string => {
  if (status === "pending") {
    return "bg-amber-500/15 text-amber-200";
  }
  if (status === "accepted") {
    return "bg-emerald-500/15 text-emerald-200";
  }
  if (status === "expired") {
    return "bg-slate-700/40 text-slate-200";
  }
  return "bg-red-500/15 text-red-200";
};

export const DispatchTestPanel = ({
  token,
  defaultCapacity,
}: DispatchTestPanelProps) => {
  const [heartbeatStatus, setHeartbeatStatus] =
    useState<DriverAvailability["status"]>("available");
  const [heartbeatLat, setHeartbeatLat] = useState("27.704");
  const [heartbeatLng, setHeartbeatLng] = useState("85.321");
  const [heartbeatCapacity, setHeartbeatCapacity] = useState(
    String(defaultCapacity),
  );

  const [availability, setAvailability] = useState<DriverAvailability | null>(
    null,
  );
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);

  const [offers, setOffers] = useState<DispatchOffer[]>([]);
  const [lastOffersRefresh, setLastOffersRefresh] = useState<string | null>(
    null,
  );

  const [isSendingHeartbeat, setIsSendingHeartbeat] = useState(false);
  const [isRefreshingOffers, setIsRefreshingOffers] = useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [rejectingOfferId, setRejectingOfferId] = useState<string | null>(null);

  useEffect(() => {
    setHeartbeatCapacity(String(defaultCapacity));
  }, [defaultCapacity]);

  const refreshOffers = useCallback(async () => {
    setIsRefreshingOffers(true);
    try {
      const response = await dispatchService.listOffers(token);
      setOffers(response);
      setLastOffersRefresh(new Date().toISOString());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch offers.";
      toast({
        variant: "destructive",
        title: "Unable to fetch offers",
        description: message,
      });
    } finally {
      setIsRefreshingOffers(false);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      try {
        await refreshOffers();
      } catch {
        // handled within refreshOffers
      }
    };

    void boot();

    const timer = window.setInterval(() => {
      if (!isMounted) {
        return;
      }
      void refreshOffers();
    }, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [refreshOffers]);

  const handleHeartbeat = async () => {
    const latitude = Number.parseFloat(heartbeatLat);
    const longitude = Number.parseFloat(heartbeatLng);
    const capacityNumber = Number.parseInt(heartbeatCapacity, 10);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast({
        variant: "destructive",
        title: "Invalid coordinates",
        description: "Latitude and longitude must be valid numbers.",
      });
      return;
    }

    if (!Number.isFinite(capacityNumber) || capacityNumber < 1) {
      toast({
        variant: "destructive",
        title: "Invalid capacity",
        description: "Capacity must be a positive number.",
      });
      return;
    }

    setIsSendingHeartbeat(true);
    try {
      const result = await dispatchService.sendHeartbeat(token, {
        status: heartbeatStatus,
        capacity: capacityNumber,
        location: {
          latitude,
          longitude,
        },
      });
      setAvailability(result);
      setLastHeartbeatAt(new Date().toISOString());
      toast({
        title: "Heartbeat sent",
        description: `Driver is now ${result.status}.`,
      });
      await refreshOffers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send heartbeat.";
      toast({
        variant: "destructive",
        title: "Unable to send heartbeat",
        description: message,
      });
    } finally {
      setIsSendingHeartbeat(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setAcceptingOfferId(offerId);
    try {
      const booking = await dispatchService.acceptOffer(token, offerId);
      toast({
        title: "Offer accepted",
        description: `Booking ${booking.id} marked ${booking.status}.`,
      });
      await refreshOffers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept offer.";
      toast({
        variant: "destructive",
        title: "Unable to accept offer",
        description: message,
      });
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setRejectingOfferId(offerId);
    try {
      await dispatchService.rejectOffer(token, offerId);
      toast({
        title: "Offer rejected",
        description: "We will attempt to match this ride again.",
      });
      await refreshOffers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reject offer.";
      toast({
        variant: "destructive",
        title: "Unable to reject offer",
        description: message,
      });
    } finally {
      setRejectingOfferId(null);
    }
  };

  const heartbeatSummary = useMemo(() => {
    if (!availability) {
      return "No heartbeat sent yet.";
    }
    const timestamp = formatTimestamp(lastHeartbeatAt);
    return `Status ${availability.status} • Capacity ${availability.capacity}${
      timestamp ? ` • Updated ${timestamp}` : ""
    }`;
  }, [availability, lastHeartbeatAt]);

  const offersRefreshedAtLabel = useMemo(
    () =>
      lastOffersRefresh ? `Updated ${formatTimestamp(lastOffersRefresh)}` : "",
    [lastOffersRefresh],
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Dispatch testing tools
          </h2>
          <p className="text-sm text-slate-300">
            Send heartbeats and manage driver offers to simulate the workflow.
          </p>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-200">
          <SatelliteDish className="mr-1 h-3.5 w-3.5" />
          Sandbox
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
            <Navigation className="h-4 w-4" />
            Heartbeat
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-300">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
                Latitude
              </label>
              <Input
                value={heartbeatLat}
                onChange={(event) => setHeartbeatLat(event.target.value)}
                placeholder="27.704"
              />
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
                Longitude
              </label>
              <Input
                value={heartbeatLng}
                onChange={(event) => setHeartbeatLng(event.target.value)}
                placeholder="85.321"
              />
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
                Capacity
              </label>
              <Input
                value={heartbeatCapacity}
                onChange={(event) => setHeartbeatCapacity(event.target.value)}
                placeholder="4"
              />
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
                Status
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={heartbeatStatus === "available" ? "default" : "outline"}
                  onClick={() => setHeartbeatStatus("available")}
                  className="flex-1"
                >
                  Available
                </Button>
                <Button
                  type="button"
                  variant={heartbeatStatus === "unavailable" ? "default" : "outline"}
                  onClick={() => setHeartbeatStatus("unavailable")}
                  className="flex-1"
                >
                  Busy
                </Button>
              </div>
            </div>
          </div>
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={handleHeartbeat}
            disabled={isSendingHeartbeat}
          >
            {isSendingHeartbeat ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending heartbeat...
              </>
            ) : (
              "Send heartbeat"
            )}
          </Button>
          <p className="mt-3 text-xs text-slate-400">{heartbeatSummary}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Offers
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/0 text-white hover:bg-white/10"
              onClick={() => refreshOffers()}
              disabled={isRefreshingOffers}
            >
              {isRefreshingOffers ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
          {offersRefreshedAtLabel ? (
            <p className="mt-1 text-xs text-slate-400">{offersRefreshedAtLabel}</p>
          ) : null}

          <div className="mt-4 space-y-3">
            {offers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-300">
                No active offers. Keep the heartbeat running to receive rides.
              </div>
            ) : (
              offers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        Booking {offer.bookingId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-400">
                        Received {new Date(offer.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge className={getOfferStatusStyle(offer.status)}>
                      {offer.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={
                        offer.status !== "pending" ||
                        acceptingOfferId === offer.id ||
                        rejectingOfferId === offer.id
                      }
                    >
                      {acceptingOfferId === offer.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-400/40 text-red-200 hover:bg-red-500/15"
                      onClick={() => handleRejectOffer(offer.id)}
                      disabled={
                        offer.status !== "pending" ||
                        rejectingOfferId === offer.id ||
                        acceptingOfferId === offer.id
                      }
                    >
                      {rejectingOfferId === offer.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        "Reject"
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Passenger ID {offer.passengerId.slice(0, 8)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        Changes here update only your test session and help verify dispatch end-to-end.
      </div>
    </div>
  );
};

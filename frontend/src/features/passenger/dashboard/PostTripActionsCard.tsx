import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, Phone, DollarSign, CarFront } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingDialog } from "@/components/RatingDialog";
import { bookingService, type BookingResponse } from "@/lib/booking-service";
import { paymentService } from "@/lib/payment-service";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

type PostTripActionsCardProps = {
  rideId: string;
  fareHint?: unknown;
  completedAt?: string;
  onDone?: () => void;
};

const formatFare = (fare?: unknown): { label: string; amountCents?: number } => {
  if (!fare || typeof fare !== "object") {
    return { label: "Cash", amountCents: undefined };
  }
  const maybe = fare as { amount?: number; currency?: string };
  if (typeof maybe.amount === "number") {
    return {
      label: `${maybe.currency ?? "₹"}${maybe.amount.toFixed(2)}`,
      amountCents: Math.round(maybe.amount * 100),
    };
  }
  return { label: maybe.currency ?? "Cash", amountCents: undefined };
};

export const PostTripActionsCard = ({
  rideId,
  fareHint,
  completedAt,
  onDone,
}: PostTripActionsCardProps) => {
  const { session } = useAuth();
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isPaymentDone, setIsPaymentDone] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const fareInfo = useMemo(() => formatFare(fareHint), [fareHint]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }
    let isMounted = true;
    const load = async () => {
      setIsLoadingBooking(true);
      try {
        const data = await bookingService.get(session.token, rideId);
        if (isMounted) {
          setBooking(data);
        }
      } catch (error) {
        console.error("Failed to load booking for post-trip actions", error);
      } finally {
        if (isMounted) {
          setIsLoadingBooking(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [rideId, session?.token]);

  const handleConfirmPayment = async () => {
    if (!session?.token) {
      toast({
        title: "Please log in",
        description: "Sign in again to confirm your payment.",
        variant: "destructive",
      });
      return;
    }
    if (!fareInfo.amountCents) {
      toast({
        title: "Amount not available",
        description: "Fare data missing. Please pay driver directly.",
      });
      setIsPaymentDone(true);
      return;
    }

    setIsPaymentProcessing(true);
    try {
      await paymentService.createPayment(session.token, {
        rideId,
        amountCents: fareInfo.amountCents,
        currency: "INR",
        paymentMethod: "cash",
      });
      toast({
        title: "Payment recorded",
        description: "Thanks for confirming the cash payment.",
      });
      setIsPaymentDone(true);
    } catch (error) {
      console.error("Failed to create payment", error);
      toast({
        title: "Payment confirmation failed",
        description:
          error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  useEffect(() => {
    if (isPaymentDone && hasRated && onDone) {
      onDone();
    }
  }, [isPaymentDone, hasRated, onDone]);

  if (isLoadingBooking) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-6">
          <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!booking) {
    return null;
  }

  const driver = booking.driver;

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          Trip Completed
        </CardTitle>
        <p className="text-sm text-slate-400">
          {completedAt
            ? `Ended at ${new Date(completedAt).toLocaleTimeString()}`
            : "Trip finished recently"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/20 p-3 text-emerald-300">
              <CarFront className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-400">Driver</p>
              <p className="text-lg font-semibold text-white">
                {driver?.name ?? "Your driver"}
              </p>
              {driver?.vehicle && (
                <p className="text-sm text-slate-400">
                  {driver.vehicle.manufacturer} {driver.vehicle.model} •{" "}
                  {driver.vehicle.registrationNumber}
                </p>
              )}
            </div>
            {driver?.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${driver.phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Pickup</p>
            <p className="mt-1 text-sm text-white">
              {booking.pickup.description ??
                `${booking.pickup.latitude.toFixed(4)}, ${booking.pickup.longitude.toFixed(4)}`}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Dropoff</p>
            <p className="mt-1 text-sm text-white">
              {booking.dropoff.description ??
                `${booking.dropoff.latitude.toFixed(4)}, ${booking.dropoff.longitude.toFixed(4)}`}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <DollarSign className="h-5 w-5 text-emerald-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fare</p>
              <p className="text-lg font-semibold text-white">{fareInfo.label}</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-200">Cash payment</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            disabled={isPaymentDone || isPaymentProcessing}
            onClick={handleConfirmPayment}
          >
            {isPaymentDone ? (
              "Payment Confirmed"
            ) : isPaymentProcessing ? (
              "Confirming..."
            ) : (
              "Confirm Cash Payment"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsRatingOpen(true)}
            disabled={hasRated}
          >
            {hasRated ? "Thanks for rating!" : "Rate Driver"}
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          Please confirm payment & rating to finish this trip.
        </p>
      </CardFooter>

      <RatingDialog
        rideId={rideId}
        open={isRatingOpen}
        onOpenChange={setIsRatingOpen}
        onRatingSubmitted={() => {
          setHasRated(true);
          setIsRatingOpen(false);
        }}
      />
    </Card>
  );
};

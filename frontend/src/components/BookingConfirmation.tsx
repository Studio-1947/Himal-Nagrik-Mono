import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useBooking } from "@/hooks/use-booking";
import type { BookingResponse, LocationPoint } from "@/lib/booking-service";
import { ApiError } from "@/lib/api-client";
import {
  CheckCircle,
  Loader2,
  MessageSquare,
  Phone,
  MapPin,
  Clock,
  User,
} from "lucide-react";

interface Taxi {
  id: string;
  driverName: string;
  vehicleNumber: string;
  seatsAvailable: number;
  totalSeats: number;
  departureTime: string;
  rating: number;
  phone: string;
  status: "filling" | "ready" | "departed";
}

interface Route {
  from: string;
  to: string;
  fare: string;
}

export interface BookingData {
  bookingId: string;
  passenger: {
    name: string;
    phone: string;
  };
  taxi: Taxi;
  route: Route;
  bookingTime: string;
  status: "confirmed" | "pending" | "cancelled";
}

interface BookingConfirmationProps {
  taxi: Taxi;
  route: Route;
  onConfirmBooking: (bookingData: BookingData) => void;
}

const computeCoordinate = (
  label: string,
  baseLat: number,
  baseLng: number,
): LocationPoint => {
  const hash = Array.from(label).reduce(
    (accumulator, char) => accumulator + char.charCodeAt(0),
    0,
  );
  const offset = (hash % 750) / 10000; // keep offset within ~0.075 deg
  return {
    latitude: baseLat + offset,
    longitude: baseLng - offset,
    description: label,
  };
};

const describeStatus = (status: string): string => {
  switch (status) {
    case "requested":
      return "Searching for nearby drivers";
    case "driver_assigned":
      return "Driver assigned";
    case "enroute_pickup":
      return "Driver en route to pickup";
    case "passenger_onboard":
      return "Passenger onboard";
    case "completed":
      return "Trip completed";
    case "cancelled_passenger":
      return "Passenger cancelled";
    case "cancelled_driver":
      return "Driver cancelled";
    case "cancelled_system":
      return "Booking cancelled";
    case "expired":
      return "Offer expired";
    default:
      return status.replaceAll("_", " ");
  }
};

const toBookingData = (
  booking: BookingResponse,
  context: {
    passengerName: string;
    passengerPhone: string;
    route: Route;
    taxi: Taxi;
  },
): BookingData => {
  const status =
    booking.status === "driver_assigned"
      ? "confirmed"
      : booking.status.startsWith("cancelled") || booking.status === "expired"
      ? "cancelled"
      : "pending";

  return {
    bookingId: booking.id,
    passenger: {
      name: context.passengerName,
      phone: context.passengerPhone,
    },
    taxi: {
      ...context.taxi,
      driverName: booking.driver?.name || context.taxi.driverName,
      phone: booking.driver?.phone ?? context.taxi.phone,
    },
    route: context.route,
    bookingTime: new Date(booking.requestedAt).toLocaleString(),
    status,
  };
};

export const BookingConfirmation = ({
  taxi,
  route,
  onConfirmBooking,
}: BookingConfirmationProps) => {
  const { toast } = useToast();
  const { createBooking, getBooking } = useBooking();

  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [latestBooking, setLatestBooking] = useState<BookingResponse | null>(null);
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pickupPoint = useMemo(
    () => computeCoordinate(route.from, 27.704, 85.321),
    [route.from],
  );
  const dropoffPoint = useMemo(
    () => computeCoordinate(route.to, 27.668, 85.298),
    [route.to],
  );

  const handleConfirm = async () => {
    if (!passengerName.trim() || !passengerPhone.trim() || activeBookingId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const booking = await createBooking({
        pickup: pickupPoint,
        dropoff: dropoffPoint,
        notes: `Requested seat with ${taxi.driverName}`,
        vehicleType: taxi.status === "ready" ? "premium" : "standard",
      });

      setLatestBooking(booking);
      setActiveBookingId(booking.id);
      setStatusUpdatedAt(new Date().toISOString());
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
          ? error.message
          : "We could not create your booking. Please try again.";

      setErrorMessage(message);
      toast({
        variant: "destructive",
        title: "Booking failed",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!activeBookingId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollStatus = async () => {
      try {
        const booking = await getBooking(activeBookingId);
        if (cancelled) {
          return;
        }

        setLatestBooking(booking);
        setStatusUpdatedAt(new Date().toISOString());

        if (booking.status === "driver_assigned") {
          onConfirmBooking(
            toBookingData(booking, {
              passengerName,
              passengerPhone,
              route,
              taxi,
            }),
          );
          setActiveBookingId(null);
          return;
        }

        if (booking.status.startsWith("cancelled") || booking.status === "expired") {
          const message = describeStatus(booking.status);
          setErrorMessage(message);
          toast({
            variant: "destructive",
            title: "Booking unavailable",
            description: message,
          });
          setActiveBookingId(null);
          return;
        }

        timer = setTimeout(pollStatus, 2500);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "We could not refresh the booking status. Please try again.";
        setErrorMessage(message);
        toast({
          variant: "destructive",
          title: "Tracking interrupted",
          description: message,
        });
        setActiveBookingId(null);
      }
    };

    pollStatus();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeBookingId, getBooking, onConfirmBooking, passengerName, passengerPhone, route, taxi, toast]);

  const statusLabel = latestBooking ? describeStatus(latestBooking.status) : null;
  const isSearching = activeBookingId !== null && latestBooking?.status === "requested";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <CheckCircle className="h-12 w-12 text-success mx-auto" />
        <h3 className="text-xl font-bold text-foreground">Confirm Your Booking</h3>
        <p className="text-muted-foreground">
          Enter your details and we will keep you posted on driver assignment
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trip Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">
                    {route.from} → {route.to}
                  </p>
                  <p className="text-sm text-muted-foreground">Route</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{taxi.departureTime}</p>
                  <p className="text-sm text-muted-foreground">Departure</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{taxi.driverName}</p>
                  <p className="text-sm text-muted-foreground">{taxi.vehicleNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{taxi.phone}</p>
                  <p className="text-sm text-muted-foreground">Driver Contact</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Fare:</span>
              <span className="text-2xl font-bold text-primary">{route.fare}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Pay driver in cash</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Passenger Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={passengerName}
              onChange={(event) => setPassengerName(event.target.value)}
              disabled={activeBookingId !== null}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+91 98765 43210"
              value={passengerPhone}
              onChange={(event) => setPassengerPhone(event.target.value)}
              disabled={activeBookingId !== null}
            />
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {activeBookingId && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <CheckCircle className="h-4 w-4 text-success" />
            )}
            {statusLabel ?? "Waiting for updates"}
          </AlertTitle>
          <AlertDescription className="space-y-1">
            <p>
              Booking ID: <span className="font-mono">{activeBookingId}</span>
            </p>
            {statusUpdatedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(statusUpdatedAt).toLocaleTimeString()}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Button
          variant="taxi"
          size="lg"
          className="w-full text-lg py-6"
          onClick={handleConfirm}
          disabled={
            !passengerName.trim() ||
            !passengerPhone.trim() ||
            isSubmitting ||
            activeBookingId !== null
          }
        >
          {isSubmitting
            ? "Creating booking..."
            : activeBookingId
            ? "Waiting for driver..."
            : "Confirm Booking"}
        </Button>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>You will receive SMS updates on driver assignment</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Be ready at the pickup point 10 minutes before departure.
          </p>
        </div>
      </div>
    </div>
  );
};

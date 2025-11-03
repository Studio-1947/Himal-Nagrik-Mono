import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bookingService, type CreateBookingPayload } from "@/lib/booking-service";
import { useAuth } from "@/hooks/use-auth";
import type { PassengerSavedLocation } from "@/lib/passenger-service";

type RequestRideButtonProps = {
  savedLocations: PassengerSavedLocation[];
  defaultPickup?: PassengerSavedLocation | null;
  onSuccess?: () => void;
};

type FormState = {
  pickupLabel: string;
  pickupLat: string;
  pickupLng: string;
  dropoffDescription: string;
  dropoffLat: string;
  dropoffLng: string;
  notes: string;
};

const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(5) : "";

const toPayload = (state: FormState): CreateBookingPayload | null => {
  const pickupLat = Number.parseFloat(state.pickupLat);
  const pickupLng = Number.parseFloat(state.pickupLng);
  const dropLat = Number.parseFloat(state.dropoffLat);
  const dropLng = Number.parseFloat(state.dropoffLng);

  if (![pickupLat, pickupLng, dropLat, dropLng].every((value) => Number.isFinite(value))) {
    return null;
  }

  return {
    pickup: {
      latitude: pickupLat,
      longitude: pickupLng,
      description: state.pickupLabel || undefined,
    },
    dropoff: {
      latitude: dropLat,
      longitude: dropLng,
      description: state.dropoffDescription || undefined,
    },
    notes: state.notes || undefined,
  };
};

export const RequestRideButton = ({
  savedLocations,
  defaultPickup,
  onSuccess,
}: RequestRideButtonProps) => {
  const { session } = useAuth();
  const token = session?.token;
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultPickupLocation = defaultPickup ?? savedLocations[0];

  const [formState, setFormState] = useState<FormState>(() => ({
    pickupLabel: defaultPickupLocation?.label ?? "",
    pickupLat:
      defaultPickupLocation?.location.latitude !== undefined
        ? formatNumber(defaultPickupLocation.location.latitude)
        : "",
    pickupLng:
      defaultPickupLocation?.location.longitude !== undefined
        ? formatNumber(defaultPickupLocation.location.longitude)
        : "",
    dropoffDescription: "",
    dropoffLat: "",
    dropoffLng: "",
    notes: "",
  }));

  const closeDialog = () => {
    setIsOpen(false);
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!token) {
      setErrorMessage("You need to log in to request a ride.");
      return;
    }

    const payload = toPayload(formState);
    if (!payload) {
      setErrorMessage("Please provide valid coordinates for pickup and dropoff.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await bookingService.create(token, payload);
      setIsSubmitting(false);
      setIsOpen(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setIsSubmitting(false);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create booking. Please try again.";
      setErrorMessage(message);
    }
  };

  return (
    <>
      <Button
        variant="default"
        className="rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-400 px-6 py-2 text-sm font-semibold text-white shadow-[0_18px_55px_rgba(16,185,129,0.25)] hover:opacity-90"
        onClick={() => setIsOpen(true)}
      >
        Request a ride
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader>
            <DialogTitle>Create a booking</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-label">Pickup label</Label>
                <Input
                  id="pickup-label"
                  placeholder="Mall Road Entrance"
                  value={formState.pickupLabel}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, pickupLabel: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff-description">Dropoff description</Label>
                <Input
                  id="dropoff-description"
                  placeholder="Darjeeling Railway Station"
                  value={formState.dropoffDescription}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      dropoffDescription: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-lat">Pickup latitude</Label>
                <Input
                  id="pickup-lat"
                  placeholder="27.7123"
                  value={formState.pickupLat}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, pickupLat: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup-lng">Pickup longitude</Label>
                <Input
                  id="pickup-lng"
                  placeholder="85.3178"
                  value={formState.pickupLng}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, pickupLng: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff-lat">Dropoff latitude</Label>
                <Input
                  id="dropoff-lat"
                  placeholder="27.7321"
                  value={formState.dropoffLat}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, dropoffLat: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff-lng">Dropoff longitude</Label>
                <Input
                  id="dropoff-lng"
                  placeholder="85.3294"
                  value={formState.dropoffLng}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, dropoffLng: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Luggage, accessibility needs, or meeting notes for the driver."
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>

            {errorMessage ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="sm:w-auto"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="sm:w-auto"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Requesting…" : "Confirm ride"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

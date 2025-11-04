import { useState, useCallback, useEffect } from "react";
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
import { MapPin, Loader2, Search } from "lucide-react";

type RequestRideButtonProps = {
  savedLocations: PassengerSavedLocation[];
  defaultPickup?: PassengerSavedLocation | null;
  onSuccess?: () => void;
};

type LocationSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};

type Location = {
  address: string;
  latitude: number;
  longitude: number;
};

type FormState = {
  pickup: Location | null;
  dropoff: Location | null;
  notes: string;
};

// Geocoding service using OpenStreetMap Nominatim
const searchAddress = async (query: string): Promise<LocationSearchResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}` +
      `&format=json` +
      `&limit=5` +
      `&countrycodes=in,np,bt` + // Focus on India, Nepal, Bhutan
      `&addressdetails=1`
    );
    
    if (!response.ok) throw new Error("Search failed");
    return await response.json();
  } catch (error) {
    console.error("Address search error:", error);
    return [];
  }
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
    pickup: defaultPickupLocation ? {
      address: defaultPickupLocation.label || "My Location",
      latitude: defaultPickupLocation.location.latitude,
      longitude: defaultPickupLocation.location.longitude,
    } : null,
    dropoff: null,
    notes: "",
  }));

  // Address search states
  const [pickupSearch, setPickupSearch] = useState("");
  const [dropoffSearch, setDropoffSearch] = useState("");
  const [pickupResults, setPickupResults] = useState<LocationSearchResult[]>([]);
  const [dropoffResults, setDropoffResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);
  const [showPickupResults, setShowPickupResults] = useState(false);
  const [showDropoffResults, setShowDropoffResults] = useState(false);

  // Search pickup address
  const handlePickupSearch = useCallback(async (query: string) => {
    setPickupSearch(query);
    if (query.length < 3) {
      setPickupResults([]);
      setShowPickupResults(false);
      return;
    }

    setIsSearchingPickup(true);
    setShowPickupResults(true);
    const results = await searchAddress(query);
    setPickupResults(results);
    setIsSearchingPickup(false);
  }, []);

  // Search dropoff address
  const handleDropoffSearch = useCallback(async (query: string) => {
    setDropoffSearch(query);
    if (query.length < 3) {
      setDropoffResults([]);
      setShowDropoffResults(false);
      return;
    }

    setIsSearchingDropoff(true);
    setShowDropoffResults(true);
    const results = await searchAddress(query);
    setDropoffResults(results);
    setIsSearchingDropoff(false);
  }, []);

  // Select pickup location
  const selectPickupLocation = (result: LocationSearchResult) => {
    setFormState((prev) => ({
      ...prev,
      pickup: {
        address: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      },
    }));
    setPickupSearch(result.display_name);
    setShowPickupResults(false);
  };

  // Select dropoff location
  const selectDropoffLocation = (result: LocationSearchResult) => {
    setFormState((prev) => ({
      ...prev,
      dropoff: {
        address: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      },
    }));
    setDropoffSearch(result.display_name);
    setShowDropoffResults(false);
  };

  // Use saved location
  const useSavedLocation = (location: PassengerSavedLocation, type: 'pickup' | 'dropoff') => {
    const loc = {
      address: location.label || "Saved Location",
      latitude: location.location.latitude,
      longitude: location.location.longitude,
    };
    
    if (type === 'pickup') {
      setFormState((prev) => ({ ...prev, pickup: loc }));
      setPickupSearch(loc.address);
      setShowPickupResults(false);
    } else {
      setFormState((prev) => ({ ...prev, dropoff: loc }));
      setDropoffSearch(loc.address);
      setShowDropoffResults(false);
    }
  };

  const closeDialog = () => {
    setIsOpen(false);
    setErrorMessage(null);
    setIsSubmitting(false);
    setPickupSearch(formState.pickup?.address || "");
    setDropoffSearch("");
    setShowPickupResults(false);
    setShowDropoffResults(false);
  };

  const handleSubmit = async () => {
    if (!token) {
      setErrorMessage("You need to log in to request a ride.");
      return;
    }

    if (!formState.pickup || !formState.dropoff) {
      setErrorMessage("Please select both pickup and dropoff locations.");
      return;
    }

    const payload: CreateBookingPayload = {
      pickup: {
        latitude: formState.pickup.latitude,
        longitude: formState.pickup.longitude,
        description: formState.pickup.address,
      },
      dropoff: {
        latitude: formState.dropoff.latitude,
        longitude: formState.dropoff.longitude,
        description: formState.dropoff.address,
      },
      notes: formState.notes || undefined,
    };

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await bookingService.create(token, payload);
      setIsSubmitting(false);
      setIsOpen(false);
      // Reset dropoff for next booking
      setFormState((prev) => ({ ...prev, dropoff: null, notes: "" }));
      setDropoffSearch("");
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

  // Initialize pickup search with current pickup
  useEffect(() => {
    if (formState.pickup) {
      setPickupSearch(formState.pickup.address);
    }
  }, [formState.pickup]);

  return (
    <>
      <Button
        variant="default"
        className="rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-400 px-8 py-3 text-base font-semibold text-white shadow-[0_18px_55px_rgba(16,185,129,0.25)] hover:opacity-90 transition-all"
        onClick={() => setIsOpen(true)}
      >
        <MapPin className="mr-2 h-5 w-5" />
        Request a ride
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Where would you like to go?</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Pickup Location */}
            <div className="space-y-3">
              <Label htmlFor="pickup-search" className="text-base font-semibold">
                Pickup Location
              </Label>
              
              {/* Saved Locations Quick Select */}
              {savedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {savedLocations.slice(0, 3).map((loc) => (
                    <Button
                      key={loc.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => useSavedLocation(loc, 'pickup')}
                      className="text-xs"
                    >
                      <MapPin className="mr-1 h-3 w-3" />
                      {loc.label}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="pickup-search"
                  placeholder="Search for pickup address... (e.g., Mall Road, Darjeeling)"
                  value={pickupSearch}
                  onChange={(e) => handlePickupSearch(e.target.value)}
                  onFocus={() => pickupSearch.length >= 3 && setShowPickupResults(true)}
                  className="pl-9 pr-4"
                />
                {isSearchingPickup && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>

              {/* Pickup Search Results */}
              {showPickupResults && pickupResults.length > 0 && (
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
                  {pickupResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectPickupLocation(result)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {result.display_name.split(',')[0]}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {result.display_name}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Pickup */}
              {formState.pickup && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-emerald-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-900">Selected Pickup</p>
                      <p className="text-xs text-emerald-700 mt-1">{formState.pickup.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dropoff Location */}
            <div className="space-y-3">
              <Label htmlFor="dropoff-search" className="text-base font-semibold">
                Dropoff Location <span className="text-red-500">*</span>
              </Label>
              
              {/* Saved Locations Quick Select */}
              {savedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {savedLocations.slice(0, 3).map((loc) => (
                    <Button
                      key={loc.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => useSavedLocation(loc, 'dropoff')}
                      className="text-xs"
                    >
                      <MapPin className="mr-1 h-3 w-3" />
                      {loc.label}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="dropoff-search"
                  placeholder="Search for destination... (e.g., Ghum Railway Station)"
                  value={dropoffSearch}
                  onChange={(e) => handleDropoffSearch(e.target.value)}
                  onFocus={() => dropoffSearch.length >= 3 && setShowDropoffResults(true)}
                  className="pl-9 pr-4"
                />
                {isSearchingDropoff && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>

              {/* Dropoff Search Results */}
              {showDropoffResults && dropoffResults.length > 0 && (
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
                  {dropoffResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectDropoffLocation(result)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-sky-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {result.display_name.split(',')[0]}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {result.display_name}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Dropoff */}
              {formState.dropoff && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-sky-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sky-900">Selected Destination</p>
                      <p className="text-xs text-sky-700 mt-1">{formState.dropoff.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special requirements? (e.g., luggage, accessibility needs, meeting point)"
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
                className="resize-none"
              />
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formState.pickup || !formState.dropoff}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-sky-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Confirm Ride Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

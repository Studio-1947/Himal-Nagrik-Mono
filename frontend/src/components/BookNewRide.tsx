import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MapPin, Clock, Users, Car, CreditCard, Calendar } from 'lucide-react';
import { bookingService, CreateBookingRequest, NearbyDriver } from '@/lib/booking-service';

const bookingSchema = z.object({
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  pickupTime: z.string().min(1, 'Pickup time is required'),
  vehicleType: z.enum(['standard', 'premium', 'suv', 'shared']),
  passengerCount: z.number().min(1).max(8),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']),
  specialRequests: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookNewRideProps {
  onBookingSuccess?: (bookingId: string) => void;
}

export function BookNewRide({ onBookingSuccess }: BookNewRideProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      vehicleType: 'standard',
      passengerCount: 1,
      paymentMethod: 'cash',
      specialRequests: '',
    },
  });

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          // Fetch nearby drivers
          fetchNearbyDrivers(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const fetchNearbyDrivers = async (lat: number, lng: number) => {
    try {
      const response = await bookingService.getNearbyDrivers(lat, lng);
      setNearbyDrivers(response.drivers);
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
    }
  };

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      if (!currentLocation) {
        throw new Error('Current location not available');
      }

      const bookingData: CreateBookingRequest = {
        pickupLocation: {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          address: data.pickupAddress,
        },
        destinationLocation: {
          latitude: currentLocation.lat + 0.01, // Simplified - would use geocoding in real app
          longitude: currentLocation.lng + 0.01,
          address: data.destinationAddress,
        },
        pickupTime: new Date(data.pickupTime).toISOString(),
        vehicleType: data.vehicleType,
        passengerCount: data.passengerCount,
        paymentMethod: data.paymentMethod,
        specialRequests: data.specialRequests,
      };

      return bookingService.createBooking(bookingData);
    },
    onSuccess: (response) => {
      toast.success('Booking created successfully!');
      form.reset();
      onBookingSuccess?.(response.booking.id);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create booking');
    },
  });

  const onSubmit = (data: BookingFormData) => {
    createBookingMutation.mutate(data);
  };

  // Get minimum datetime for pickup (current time + 15 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now.toISOString().slice(0, 16);
  };

  const vehicleTypes = [
    { value: 'standard', label: 'Standard Car', price: 'NPR 50 base fare', icon: Car },
    { value: 'premium', label: 'Premium Car', price: 'NPR 80 base fare', icon: Car },
    { value: 'suv', label: 'SUV', price: 'NPR 100 base fare', icon: Car },
    { value: 'shared', label: 'Shared Ride', price: 'NPR 30 base fare', icon: Users },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Book a New Ride
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Location Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Pick-up & Destination</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={!!currentLocation}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {currentLocation ? 'Location Set' : 'Use Current Location'}
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="pickupAddress">Pickup Address</Label>
                <Input
                  id="pickupAddress"
                  placeholder="Enter pickup location"
                  {...form.register('pickupAddress')}
                />
                {form.formState.errors.pickupAddress && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.pickupAddress.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="destinationAddress">Destination Address</Label>
                <Input
                  id="destinationAddress"
                  placeholder="Where to?"
                  {...form.register('destinationAddress')}
                />
                {form.formState.errors.destinationAddress && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.destinationAddress.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Time and Passengers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickupTime">Pickup Time</Label>
              <Input
                id="pickupTime"
                type="datetime-local"
                min={getMinDateTime()}
                {...form.register('pickupTime')}
              />
              {form.formState.errors.pickupTime && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.pickupTime.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="passengerCount">Number of Passengers</Label>
              <Select
                value={form.watch('passengerCount').toString()}
                onValueChange={(value) => form.setValue('passengerCount', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1} {i === 0 ? 'Passenger' : 'Passengers'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vehicle Type */}
          <div className="space-y-3">
            <Label>Vehicle Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vehicleTypes.map((vehicle) => (
                <div
                  key={vehicle.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    form.watch('vehicleType') === vehicle.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => form.setValue('vehicleType', vehicle.value as 'standard' | 'premium' | 'suv' | 'shared')}
                >
                  <div className="flex items-center space-x-3">
                    <vehicle.icon className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{vehicle.label}</p>
                      <p className="text-sm text-gray-500">{vehicle.price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={form.watch('paymentMethod')}
              onValueChange={(value) => form.setValue('paymentMethod', value as 'cash' | 'card' | 'digital_wallet')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Special Requests */}
          <div>
            <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
            <Textarea
              id="specialRequests"
              placeholder="Any special requests or notes for the driver..."
              rows={3}
              {...form.register('specialRequests')}
            />
          </div>

          {/* Nearby Drivers */}
          {nearbyDrivers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Nearby Drivers ({nearbyDrivers.length})</h3>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {nearbyDrivers.slice(0, 3).map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-gray-500">
                        {driver.vehicle.manufacturer} {driver.vehicle.model} • {driver.distance.toFixed(1)}km away
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">⭐ {driver.stats.rating.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">{driver.stats.totalTrips} trips</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={createBookingMutation.isPending || !currentLocation}
          >
            {createBookingMutation.isPending ? 'Creating Booking...' : 'Book Ride'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
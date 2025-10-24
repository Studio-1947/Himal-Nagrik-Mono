import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { BookingList } from '@/components/BookingList';
import { toast } from 'sonner';
import { 
  Car, 
  MapPin, 
  Clock, 
  Star, 
  User, 
  LogOut, 
  Navigation,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import { bookingService, Booking } from '@/lib/booking-service';

export default function DriverDashboard() {
  const { profile, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('bookings');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Location tracking
  useEffect(() => {
    if (isOnline && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          // Update location on server
          if (isOnline) {
            updateLocationMutation.mutate({
              latitude,
              longitude,
              isAvailable: true,
            });
          }
        },
        (error) => {
          console.error('Error tracking location:', error);
          toast.error('Unable to track location. Please enable location services.');
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isOnline]);

  const updateLocationMutation = useMutation({
    mutationFn: bookingService.updateLocation,
    onError: (error: any) => {
      console.error('Failed to update location:', error);
    },
  });

  const handleOnlineToggle = (checked: boolean) => {
    setIsOnline(checked);
    if (!checked && currentLocation) {
      // Mark as offline
      updateLocationMutation.mutate({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        isAvailable: false,
      });
    }
    toast.success(checked ? 'You are now online and available for bookings' : 'You are now offline');
  };

  const handleBookingSelect = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const driverStats = profile?.stats || {
    totalTrips: 0,
    rating: 5,
    yearsOfExperience: 0,
    cancellationRate: 0,
  };

  const vehicle = profile?.vehicle || {
    manufacturer: '',
    model: '',
    registrationNumber: '',
    capacity: 4,
    color: '',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Car className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Himal Nagrik Driver</h1>
                <p className="text-sm text-gray-500">Welcome back, {profile?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Online</span>
                <Switch checked={isOnline} onCheckedChange={handleOnlineToggle} />
                <Badge variant={isOnline ? "default" : "secondary"}>
                  {isOnline ? 'Available' : 'Offline'}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('profile')}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="bookings" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="earnings" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Earnings
                </TabsTrigger>
                <TabsTrigger value="vehicle" className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bookings" className="mt-6">
                <BookingList onBookingSelect={handleBookingSelect} />
              </TabsContent>

              <TabsContent value="earnings" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Earnings Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">NPR 0</p>
                          <p className="text-sm text-gray-500">Today</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">NPR 0</p>
                          <p className="text-sm text-gray-500">This Week</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">NPR 0</p>
                          <p className="text-sm text-gray-500">This Month</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">NPR 0</p>
                          <p className="text-sm text-gray-500">Total</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Trips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500 text-center py-8">No completed trips yet</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="vehicle" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vehicle Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Manufacturer</label>
                        <p className="text-lg">{vehicle.manufacturer || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Model</label>
                        <p className="text-lg">{vehicle.model || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Registration Number</label>
                        <p className="text-lg">{vehicle.registrationNumber || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Capacity</label>
                        <p className="text-lg">{vehicle.capacity} passengers</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Color</label>
                        <p className="text-lg">{vehicle.color || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">License Number</label>
                        <p className="text-lg">{profile?.licenseNumber || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button variant="outline">Edit Vehicle Info</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Driver Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-lg">{profile?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-lg">{profile?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-lg">{profile?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-lg">{profile?.location || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Years of Experience</label>
                        <p className="text-lg">{driverStats.yearsOfExperience} years</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Rating</label>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-lg">{driverStats.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    {profile?.bio && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Bio</label>
                        <p className="text-lg">{profile.bio}</p>
                      </div>
                    )}
                    <div className="pt-4">
                      <Button variant="outline">Edit Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Driver Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <Badge variant={isOnline ? "default" : "secondary"}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                {currentLocation && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Location</span>
                    <span className="text-sm">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      Tracking
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Availability</span>
                  <span className="text-sm capitalize">
                    {(profile as any)?.availability?.shift || 'Not set'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Trips</span>
                  <span className="font-semibold">{driverStats.totalTrips}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-semibold">{driverStats.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Cancellation Rate</span>
                  <span className="font-semibold">{driverStats.cancellationRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Experience</span>
                  <span className="font-semibold">{driverStats.yearsOfExperience} years</span>
                </div>
              </CardContent>
            </Card>

            {/* Current Booking Details */}
            {selectedBooking && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Booking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Booking ID</p>
                    <p className="text-sm text-gray-600">#{selectedBooking.id.slice(-8)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {selectedBooking.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Passenger</p>
                    <p className="text-sm text-gray-600">{selectedBooking.passenger_name}</p>
                    {selectedBooking.passenger_phone && (
                      <p className="text-sm text-gray-500">{selectedBooking.passenger_phone}</p>
                    )}
                  </div>
                  {selectedBooking.estimated_fare && (
                    <div>
                      <p className="text-sm font-medium">Estimated Fare</p>
                      <p className="text-sm text-gray-600">NPR {selectedBooking.estimated_fare}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('bookings')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  View Bookings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('earnings')}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Check Earnings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('vehicle')}
                >
                  <Car className="h-4 w-4 mr-2" />
                  Vehicle Info
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
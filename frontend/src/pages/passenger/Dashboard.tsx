import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookNewRide } from '@/components/BookNewRide';
import { BookingList } from '@/components/BookingList';
import { Car, MapPin, Clock, Star, User, LogOut } from 'lucide-react';
import { Booking } from '@/lib/booking-service';

export default function PassengerDashboard() {
  const { profile: user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('book');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const handleBookingSuccess = (bookingId: string) => {
    setActiveTab('bookings');
  };

  const handleBookingSelect = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const recentTripsCount = 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Car className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Himal Nagrik Taxi</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="book" className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Book Ride
                </TabsTrigger>
                <TabsTrigger value="bookings" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  My Trips
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="book" className="mt-6">
                <BookNewRide onBookingSuccess={handleBookingSuccess} />
              </TabsContent>

              <TabsContent value="bookings" className="mt-6">
                <BookingList onBookingSelect={handleBookingSelect} />
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-lg">{user?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-lg">{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-lg">{user?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-lg">{user?.location || 'Not set'}</p>
                      </div>
                    </div>
                    {user?.bio && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Bio</label>
                        <p className="text-lg">{user.bio}</p>
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
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Trips</span>
                  <span className="font-semibold">{recentTripsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Favorite Routes</span>
                  <span className="font-semibold">{(user as any)?.preferences?.favouriteRoutes?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Preferred Seat</span>
                  <span className="font-semibold capitalize">
                    {(user as any)?.preferences?.preferredSeat || 'Any'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {(user as any)?.emergencyContact && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{(user as any).emergencyContact.name}</p>
                    <p className="text-sm text-gray-500">{(user as any).emergencyContact.phone}</p>
                    {(user as any).emergencyContact.relation && (
                      <p className="text-sm text-gray-500">
                        Relation: {(user as any).emergencyContact.relation}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
                  {selectedBooking.estimated_fare && (
                    <div>
                      <p className="text-sm font-medium">Estimated Fare</p>
                      <p className="text-sm text-gray-600">NPR {selectedBooking.estimated_fare}</p>
                    </div>
                  )}
                  {selectedBooking.driver_name && (
                    <div>
                      <p className="text-sm font-medium">Driver</p>
                      <p className="text-sm text-gray-600">{selectedBooking.driver_name}</p>
                      {selectedBooking.driver_phone && (
                        <p className="text-sm text-gray-500">{selectedBooking.driver_phone}</p>
                      )}
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
                  onClick={() => setActiveTab('book')}
                >
                  <Car className="h-4 w-4 mr-2" />
                  Book New Ride
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('bookings')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  View My Trips
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('profile')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
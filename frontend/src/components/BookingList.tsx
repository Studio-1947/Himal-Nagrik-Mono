import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  MapPin, 
  Clock, 
  Users, 
  Car, 
  Phone, 
  Star,
  CheckCircle,
  XCircle,
  PlayCircle,
  AlertCircle
} from 'lucide-react';
import { bookingService, Booking } from '@/lib/booking-service';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

const statusIcons = {
  pending: AlertCircle,
  accepted: CheckCircle,
  in_progress: PlayCircle,
  completed: CheckCircle,
  cancelled: XCircle,
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface BookingListProps {
  onBookingSelect?: (booking: Booking) => void;
}

export function BookingList({ onBookingSelect }: BookingListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data: bookingsData, isLoading, error } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingService.getBookings(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const acceptBookingMutation = useMutation({
    mutationFn: (bookingId: string) => bookingService.acceptBooking(bookingId),
    onSuccess: () => {
      toast.success('Booking accepted successfully!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept booking');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ bookingId, status, reason }: { 
      bookingId: string; 
      status: 'in_progress' | 'completed' | 'cancelled';
      reason?: string;
    }) => bookingService.updateBookingStatus(bookingId, { status, cancellationReason: reason }),
    onSuccess: () => {
      toast.success('Booking status updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update booking status');
    },
  });

  const handleAcceptBooking = (bookingId: string) => {
    acceptBookingMutation.mutate(bookingId);
  };

  const handleUpdateStatus = (bookingId: string, status: 'in_progress' | 'completed' | 'cancelled', reason?: string) => {
    updateStatusMutation.mutate({ bookingId, status, reason });
  };

  const formatLocation = (location: any) => {
    if (typeof location === 'string') {
      try {
        const parsed = JSON.parse(location);
        return parsed.address || 'Unknown location';
      } catch {
        return location;
      }
    }
    return location?.address || 'Unknown location';
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Failed to load bookings. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  const bookings = bookingsData?.bookings || [];

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            {user?.role === 'passenger' ? 'No bookings yet. Book your first ride!' : 'No bookings available.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {user?.role === 'passenger' ? 'My Bookings' : 'Available Bookings'}
        </h2>
        <Badge variant="outline">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => {
          const StatusIcon = statusIcons[booking.status];
          
          return (
            <Card 
              key={booking.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedBookingId === booking.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                setSelectedBookingId(booking.id);
                onBookingSelect?.(booking);
              }}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">Booking #{booking.id.slice(-8)}</p>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(booking.pickup_time)}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[booking.status]}>
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  {/* Trip Details */}
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 mt-1 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Pickup</p>
                        <p className="text-sm text-gray-600">
                          {formatLocation(booking.pickup_location)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 mt-1 text-red-500" />
                      <div>
                        <p className="text-sm font-medium">Destination</p>
                        <p className="text-sm text-gray-600">
                          {formatLocation(booking.destination_location)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Trip Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4" />
                      <span className="capitalize">{booking.vehicle_type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{booking.passenger_count} passenger{booking.passenger_count !== 1 ? 's' : ''}</span>
                    </div>
                    {booking.estimated_fare && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">NPR {booking.estimated_fare}</span>
                      </div>
                    )}
                    {booking.estimated_duration && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{booking.estimated_duration} min</span>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  {user?.role === 'driver' && booking.passenger_name && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{booking.passenger_name}</span>
                      {booking.passenger_phone && (
                        <span className="text-gray-500">• {booking.passenger_phone}</span>
                      )}
                    </div>
                  )}

                  {user?.role === 'passenger' && booking.driver_name && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{booking.driver_name}</span>
                      {booking.driver_phone && (
                        <span className="text-gray-500">• {booking.driver_phone}</span>
                      )}
                    </div>
                  )}

                  {/* Special Requests */}
                  {booking.special_requests && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Special Requests:</p>
                      <p className="text-sm text-gray-600">{booking.special_requests}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-2">
                    {user?.role === 'driver' && booking.status === 'pending' && !booking.driver_id && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptBooking(booking.id);
                        }}
                        disabled={acceptBookingMutation.isPending}
                      >
                        Accept Booking
                      </Button>
                    )}

                    {user?.role === 'driver' && booking.driver_id === user.id && booking.status === 'accepted' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(booking.id, 'in_progress');
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        Start Trip
                      </Button>
                    )}

                    {user?.role === 'driver' && booking.driver_id === user.id && booking.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(booking.id, 'completed');
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        Complete Trip
                      </Button>
                    )}

                    {(booking.status === 'pending' || booking.status === 'accepted') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const reason = prompt('Reason for cancellation (optional):');
                          handleUpdateStatus(booking.id, 'cancelled', reason || undefined);
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
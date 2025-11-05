import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { tripService, type TripHistoryItem } from "@/lib/trip-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TripHistoryPage = () => {
  const { session, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !session?.token) {
      navigate("/login");
      return;
    }

    loadTripHistory();
  }, [isAuthenticated, session, navigate]);

  const loadTripHistory = async () => {
    if (!session?.token) return;

    try {
      setIsLoading(true);
      const history = await tripService.getTripHistory(session.token);
      setTrips(history);
    } catch (error) {
      console.error("Failed to load trip history:", error);
      toast({
        title: "Error",
        description: "Failed to load trip history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/15 text-green-200";
      case "cancelled_passenger":
      case "cancelled_driver":
      case "cancelled_system":
        return "bg-red-500/15 text-red-200";
      default:
        return "bg-blue-500/15 text-blue-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Trip History</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg bg-white/5"
              />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="py-12 text-center">
              <p className="text-slate-300">No trips found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {trips.map((trip) => (
              <Card
                key={trip.rideId}
                className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/trips/${trip.rideId}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Trip on{" "}
                      {new Date(trip.requestedAt).toLocaleDateString()}
                    </CardTitle>
                    <Badge className={getStatusColor(trip.status)}>
                      {trip.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-white">Pickup</p>
                      <p>
                        Lat: {trip.pickupLocation.latitude.toFixed(4)}, Lng:{" "}
                        {trip.pickupLocation.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-white">Dropoff</p>
                      <p>
                        Lat: {trip.dropoffLocation.latitude.toFixed(4)}, Lng:{" "}
                        {trip.dropoffLocation.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Calendar className="h-4 w-4" />
                      {new Date(trip.requestedAt).toLocaleString()}
                    </div>

                    {trip.fare && (
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                        <DollarSign className="h-4 w-4" />
                        {trip.fare.currency} {trip.fare.amount}
                      </div>
                    )}
                  </div>

                  {trip.distanceTraveled && (
                    <div className="text-sm text-slate-400">
                      Distance: {(trip.distanceTraveled / 1000).toFixed(2)} km
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripHistoryPage;











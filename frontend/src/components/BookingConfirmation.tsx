import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Phone, MessageSquare, MapPin, Clock, User } from "lucide-react";

interface Taxi {
  id: string;
  driverName: string;
  vehicleNumber: string;
  departureTime: string;
  phone: string;
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

export const BookingConfirmation = ({ taxi, route, onConfirmBooking }: BookingConfirmationProps) => {
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!passengerName || !passengerPhone) return;
    
    setIsLoading(true);
    
    // Simulate booking process
    setTimeout(() => {
      const bookingData: BookingData = {
        bookingId: `BK${Date.now()}`,
        passenger: { name: passengerName, phone: passengerPhone },
        taxi,
        route,
        bookingTime: new Date().toLocaleString(),
        status: "confirmed"
      };
      
      onConfirmBooking(bookingData);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <CheckCircle className="h-12 w-12 text-success mx-auto" />
        <h3 className="text-xl font-bold text-foreground">Confirm Your Booking</h3>
        <p className="text-muted-foreground">Review details and book your seat</p>
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
                  <p className="font-medium">{route.from} → {route.to}</p>
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
              onChange={(e) => setPassengerName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+91 98765 43210"
              value={passengerPhone}
              onChange={(e) => setPassengerPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button 
          variant="taxi" 
          size="lg" 
          className="w-full text-lg py-6"
          onClick={handleConfirm}
          disabled={!passengerName || !passengerPhone || isLoading}
        >
          {isLoading ? "Confirming Booking..." : "Confirm Booking"}
        </Button>
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>SMS confirmation will be sent</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your booking will be confirmed via SMS. Please arrive 10 minutes before departure.
          </p>
        </div>
      </div>
    </div>
  );
};
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, MessageSquare, Phone, MapPin, Clock, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingData {
  bookingId: string;
  passenger: { name: string; phone: string };
  taxi: {
    driverName: string;
    vehicleNumber: string;
    departureTime: string;
    phone: string;
  };
  route: { from: string; to: string; fare: string };
  bookingTime: string;
}

interface BookingSuccessProps {
  bookingData: BookingData;
  onNewBooking: () => void;
}

export const BookingSuccess = ({ bookingData, onNewBooking }: BookingSuccessProps) => {
  const { toast } = useToast();

  const copyBookingId = () => {
    navigator.clipboard.writeText(bookingData.bookingId);
    toast({
      title: "Copied!",
      description: "Booking ID copied to clipboard",
    });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto animate-pulse-taxi" />
        <h2 className="text-2xl font-bold text-foreground">Booking Confirmed!</h2>
        <p className="text-muted-foreground">Your seat has been reserved</p>
      </div>

      <Card className="border-success/20 bg-success/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="font-mono font-bold text-lg">{bookingData.bookingId}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={copyBookingId}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-1" />
                <div>
                  <p className="font-medium">{bookingData.route.from}</p>
                  <p className="text-sm text-muted-foreground">Pickup Point</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-success mt-1" />
                <div>
                  <p className="font-medium">{bookingData.route.to}</p>
                  <p className="text-sm text-muted-foreground">Destination</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-primary mt-1" />
                <div>
                  <p className="font-medium">{bookingData.taxi.departureTime}</p>
                  <p className="text-sm text-muted-foreground">Departure Time</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-primary mt-1" />
                <div>
                  <p className="font-medium">{bookingData.taxi.driverName}</p>
                  <p className="text-sm text-muted-foreground">{bookingData.taxi.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Amount to Pay:</span>
              <span className="text-2xl font-bold text-primary">{bookingData.route.fare}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">💰 Pay the driver in cash</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Important Instructions
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Arrive at the pickup point 10 minutes before departure</li>
              <li>• Show this booking ID to the driver</li>
              <li>• Payment is in cash to the driver</li>
              <li>• SMS confirmation has been sent to {bookingData.passenger.phone}</li>
              <li>• Contact driver for any queries: {bookingData.taxi.phone}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button variant="outline" size="lg" className="w-full" onClick={onNewBooking}>
          Book Another Trip
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Have a safe journey! 🚖
          </p>
        </div>
      </div>
    </div>
  );
};
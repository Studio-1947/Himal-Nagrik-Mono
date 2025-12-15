import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Shield, MapPin, Navigation, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ActiveRideProps {
  bookingData: any; // Using loose type for MVP speed, refine later
  onComplete: () => void;
}

export const ActiveRide = ({ bookingData, onComplete }: ActiveRideProps) => {
  const [status, setStatus] = useState<"assigned" | "arriving" | "arrived" | "in_progress" | "completed">("assigned");
  const [eta, setEta] = useState(5); // minutes
  const [progress, setProgress] = useState(10);

  // SIMULATION: Simulate ride progress for MVP Demo
  useEffect(() => {
    const timer = setInterval(() => {
      setEta((prev) => Math.max(0, prev - 1));
      setProgress((prev) => Math.min(100, prev + 10));
      
      if (progress > 30 && status === "assigned") setStatus("arriving");
      if (progress > 60 && status === "arriving") setStatus("arrived");
      if (progress > 80 && status === "arrived") setStatus("in_progress");
      if (progress >= 100) {
        setStatus("completed");
        clearInterval(timer);
      }
    }, 3000); // Fast forward updates every 3 seconds

    return () => clearInterval(timer);
  }, [progress, status]);

  if (status === "completed") {
    return (
      <div className="space-y-6 animate-fade-in text-center p-4">
         <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Star className="h-8 w-8 text-green-600 fill-green-600" />
         </div>
         <h2 className="text-2xl font-bold">Ride Completed!</h2>
         <p className="text-muted-foreground">You have arrived at {bookingData.route.to}.</p>
         <div className="p-4 bg-muted/20 rounded-lg">
            <p className="font-semibold">Total Fare: {bookingData.route.fare}</p>
            <p className="text-xs text-muted-foreground">Paid via Cash/UPI</p>
         </div>
         <Button size="lg" className="w-full" onClick={onComplete}>Rate Driver & Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up pb-20">
      {/* Map Placeholder */}
      <div className="h-64 bg-slate-100 rounded-xl relative overflow-hidden border">
         <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-slate-50">
           <MapPin className="h-8 w-8 animate-bounce text-primary" />
           <span className="ml-2 font-medium">Live Map View</span>
         </div>
         {/* Status Overlay */}
         <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-sm border border-black/5">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {status === "assigned" && "Driver Assigned"}
                  {status === "arriving" && `Arriving in ${eta} min`}
                  {status === "arrived" && "Driver has Arrived"}
                  {status === "in_progress" && "Heading to Destination"}
                </span>
                <Badge variant={status === "in_progress" ? "default" : "secondary"}>
                  {status === "in_progress" ? "On Trip" : "Wait"}
                </Badge>
            </div>
            <Progress value={progress} className="h-1 mt-2" />
         </div>
      </div>

      {/* Driver Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
             <span>{bookingData.taxi.driverName}</span>
             <div className="flex items-center text-sm font-normal bg-yellow-100 px-2 py-1 rounded text-yellow-800">
               <Star className="h-3 w-3 fill-yellow-700 mr-1" />
               4.8
             </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{bookingData.taxi.vehicleNumber}</span>
              <span>Tata Sumo Gold</span>
           </div>
           
           <div className="flex gap-2">
              <Button className="flex-1" variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button className="flex-1" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
           </div>
        </CardContent>
      </Card>

      {/* Ride Details */}
      <Card>
         <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
               <div className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <div className="w-0.5 h-8 bg-gray-200 my-1" />
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
               </div>
               <div className="space-y-6 flex-1">
                  <div>
                    <p className="text-xs text-muted-foreground">PICKUP</p>
                    <p className="font-medium text-sm">{bookingData.route.from}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DROP</p>
                    <p className="font-medium text-sm">{bookingData.route.to}</p>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>

      {/* Safety / Share */}
      <Button variant="ghost" className="w-full text-muted-foreground">
        <Shield className="h-4 w-4 mr-2" />
        Share Ride Details
      </Button>
    </div>
  );
};

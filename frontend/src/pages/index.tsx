import { useState } from "react";
import { RouteSelector } from "@/components/RouteSelector";
import { TaxiAvailability } from "@/components/TaxiAvailability";
import { BookingConfirmation } from "@/components/BookingConfirmation";
import { BookingSuccess } from "@/components/BookingSuccess";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Car, Users, Star, ArrowLeft } from "lucide-react";
import heroTaxiImage from "@/assets/hero-taxi.jpg";

type Step = "route" | "availability" | "booking" | "success";

interface Route {
  from: string;
  to: string;
  duration: string;
  fare: string;
}

interface Taxi {
  id: string;
  driverName: string;
  vehicleNumber: string;
  seatsAvailable: number;
  totalSeats: number;
  departureTime: string;
  rating: number;
  phone: string;
  status: "filling" | "ready" | "departed";
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>("route");
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedTaxi, setSelectedTaxi] = useState<Taxi | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    setCurrentStep("availability");
  };

  const handleTaxiSelect = (taxi: Taxi) => {
    setSelectedTaxi(taxi);
    setCurrentStep("booking");
  };

  const handleBookingConfirm = (data: any) => {
    setBookingData(data);
    setCurrentStep("success");
  };

  const handleNewBooking = () => {
    setCurrentStep("route");
    setSelectedRoute(null);
    setSelectedTaxi(null);
    setBookingData(null);
  };

  const goBack = () => {
    switch (currentStep) {
      case "availability":
        setCurrentStep("route");
        break;
      case "booking":
        setCurrentStep("availability");
        break;
      case "success":
        setCurrentStep("route");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img 
          src={heroTaxiImage} 
          alt="Taxi in Darjeeling mountains" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Darjeeling Taxi
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto px-4">
              Book shared taxis across the beautiful hills of Darjeeling
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <MapPin className="h-3 w-3 mr-1" />
                15+ Routes
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <Car className="h-3 w-3 mr-1" />
                50+ Taxis
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <Users className="h-3 w-3 mr-1" />
                1000+ Passengers
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {currentStep !== "route" && (
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={goBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {currentStep === "route" && (
          <RouteSelector onRouteSelect={handleRouteSelect} />
        )}
        
        {currentStep === "availability" && selectedRoute && (
          <TaxiAvailability 
            route={selectedRoute} 
            onBookSeat={handleTaxiSelect} 
          />
        )}
        
        {currentStep === "booking" && selectedTaxi && selectedRoute && (
          <BookingConfirmation 
            taxi={selectedTaxi}
            route={selectedRoute}
            onConfirmBooking={handleBookingConfirm}
          />
        )}
        
        {currentStep === "success" && bookingData && (
          <BookingSuccess 
            bookingData={bookingData}
            onNewBooking={handleNewBooking}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-muted/30 border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Darjeeling Taxi</h3>
              <p className="text-sm text-muted-foreground">
                Connecting you with shared taxis across the beautiful hills of Darjeeling.
                Safe, reliable, and community-driven transport.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Popular Routes</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Darjeeling - Mirik</li>
                <li>Siliguri - Darjeeling</li>
                <li>Kurseong - Darjeeling</li>
                <li>Kalimpong - Darjeeling</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Contact</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Phone: +91 98765 43210</p>
                <p>Email: hello@darjeeling-taxi.com</p>
                <p>Office: Chowk Bazaar, Darjeeling</p>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Darjeeling Taxi. Connecting communities across the hills.</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Index;

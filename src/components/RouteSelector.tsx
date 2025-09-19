import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ArrowRight } from "lucide-react";

interface Route {
  from: string;
  to: string;
  duration: string;
  fare: string;
}

interface RouteSelectorProps {
  onRouteSelect: (route: Route) => void;
}

const popularRoutes: Route[] = [
  {
    from: "Darjeeling",
    to: "Mirik",
    duration: "1.5 hours",
    fare: "₹150"
  },
  {
    from: "Siliguri",
    to: "Darjeeling", 
    duration: "3 hours",
    fare: "₹300"
  },
  {
    from: "Kurseong",
    to: "Darjeeling",
    duration: "1 hour", 
    fare: "₹100"
  },
  {
    from: "Kalimpong",
    to: "Darjeeling",
    duration: "2 hours",
    fare: "₹200"
  },
  {
    from: "Darjeeling",
    to: "Siliguri",
    duration: "3 hours",
    fare: "₹300"
  },
  {
    from: "Mirik",
    to: "Darjeeling", 
    duration: "1.5 hours",
    fare: "₹150"
  }
];

export const RouteSelector = ({ onRouteSelect }: RouteSelectorProps) => {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const handleRouteClick = (route: Route) => {
    setSelectedRoute(route);
  };

  const handleContinue = () => {
    if (selectedRoute) {
      onRouteSelect(selectedRoute);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Select Your Route</h2>
        <p className="text-muted-foreground">Choose from our popular routes or search for a specific destination</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {popularRoutes.map((route, index) => (
          <Card 
            key={index}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRoute?.from === route.from && selectedRoute?.to === route.to
                ? "border-primary ring-2 ring-primary/20" 
                : ""
            }`}
            onClick={() => handleRouteClick(route)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{route.from}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{route.to}</span>
                </div>
                <Badge variant="secondary">{route.fare}</Badge>
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {route.duration}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRoute && (
        <div className="text-center">
          <Button onClick={handleContinue} size="lg" className="px-8">
            Continue to Available Taxis
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};
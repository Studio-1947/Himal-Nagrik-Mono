import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { MapPin, Car, Users, Star, ArrowRight, Clock } from "lucide-react";
import heroTaxiImage from "@/assets/hero-taxi.jpg";

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to their respective dashboards
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'passenger') {
        navigate('/passenger/dashboard');
      } else if (user.role === 'driver') {
        navigate('/driver/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const goToDriverLogin = () => navigate("/driver/login");
  const goToPassengerLogin = () => navigate("/login");
  const goToDriverSignup = () => navigate("/driver/signup");
  const goToPassengerSignup = () => navigate("/signup");

  // Don't show anything while redirecting authenticated users
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.35em] text-black/60">
            Himal Nagrik
          </span>
          <p className="text-lg font-semibold text-black/60">
            Your trusted taxi booking service
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-black hover:bg-white/10"
            onClick={goToDriverLogin}
          >
            Driver Login
          </Button>
          <Button
            className="bg-gradient-to-r from-sky-500 via-emerald-500 to-emerald-400 text-white shadow-emerald-500/30 hover:opacity-90"
            onClick={goToPassengerLogin}
          >
            Book a Ride
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-96 md:h-[500px] overflow-hidden">
        <img
          src={heroTaxiImage}
          alt="Taxi service in beautiful mountains"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white space-y-6 max-w-4xl mx-auto px-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Himal Nagrik Taxi
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Safe, reliable, and convenient taxi booking service. 
              Book your ride in minutes and travel with confidence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 font-semibold px-8 py-4 text-lg"
                onClick={goToPassengerSignup}
              >
                Book Your First Ride
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black font-semibold px-8 py-4 text-lg"
                onClick={goToDriverSignup}
              >
                Become a Driver
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm pt-6">
              <Badge
                variant="secondary"
                className="bg-white/10 text-white border-white/20"
              >
                <MapPin className="h-3 w-3 mr-1" />
                GPS Tracking
              </Badge>
              <Badge
                variant="secondary"
                className="bg-white/10 text-white border-white/20"
              >
                <Car className="h-3 w-3 mr-1" />
                Multiple Vehicle Types
              </Badge>
              <Badge
                variant="secondary"
                className="bg-white/10 text-white border-white/20"
              >
                <Clock className="h-3 w-3 mr-1" />
                24/7 Service
              </Badge>
              <Badge
                variant="secondary"
                className="bg-white/10 text-white border-white/20"
              >
                <Star className="h-3 w-3 mr-1" />
                Rated Drivers
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Us?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience the best taxi booking service with modern features and reliable drivers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Real-time Tracking</h3>
            <p className="text-muted-foreground">
              Track your ride in real-time and share your location with family and friends
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Rated Drivers</h3>
            <p className="text-muted-foreground">
              All our drivers are verified and rated by passengers for your safety
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Car className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Multiple Options</h3>
            <p className="text-muted-foreground">
              Choose from standard cars, premium vehicles, SUVs, or shared rides
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">24/7 Available</h3>
            <p className="text-muted-foreground">
              Book rides anytime, anywhere. Our service is available round the clock
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust us for their daily commute
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-primary text-white hover:bg-primary/90 font-semibold px-8 py-4"
              onClick={goToPassengerSignup}
            >
              Sign Up as Passenger
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-semibold px-8 py-4"
              onClick={goToDriverSignup}
            >
              Join as Driver
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted/30 border-t">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Himal Nagrik Taxi</h3>
              <p className="text-sm text-muted-foreground">
                Your trusted partner for safe and reliable transportation. 
                Connecting passengers with professional drivers across the city.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">For Passengers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={goToPassengerSignup} className="hover:text-primary">Sign Up</button></li>
                <li><button onClick={goToPassengerLogin} className="hover:text-primary">Login</button></li>
                <li>Book a Ride</li>
                <li>Safety Features</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">For Drivers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={goToDriverSignup} className="hover:text-primary">Join as Driver</button></li>
                <li><button onClick={goToDriverLogin} className="hover:text-primary">Driver Login</button></li>
                <li>Driver Requirements</li>
                <li>Earnings Info</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Support</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Phone: +91 98765 43210</p>
                <p>Email: support@himalnagrik.com</p>
                <p>Help Center</p>
                <p>Terms & Conditions</p>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>
              &copy; 2024 Himal Nagrik Taxi. Safe rides, trusted drivers, satisfied customers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

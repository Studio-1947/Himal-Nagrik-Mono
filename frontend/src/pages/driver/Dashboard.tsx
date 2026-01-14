import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    LogOut,
    MapPin,
    User,
    Settings,
    Search,
    History,
    Menu,
    Bell
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDriverOffers } from "@/hooks/use-driver-offers";

import { DispatchTestPanel } from "@/components/dispatch/DispatchTestPanel";
import { DriverLocationStatus } from "@/components/driver/DriverLocationStatus";
import { ActiveRideDisplay } from "@/components/driver/ActiveRideDisplay";
import { RideOfferNotification } from "@/components/driver/RideOfferNotification";

import { bookingService, type BookingResponse } from "@/lib/booking-service";
import { tripService } from "@/lib/trip-service";

const DriverDashboard = () => {
    const { profile, session, logout } = useAuth();
    const navigate = useNavigate();
    const [activeBooking, setActiveBooking] = useState<BookingResponse | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Offers Hook
    const {
        currentOffer,
        isAccepting,
        isRejecting,
        acceptOffer,
        rejectOffer,
    } = useDriverOffers();

    // Check for Active Trip on Load
    const loadActiveBooking = useCallback(async () => {
        if (!session?.token) return;
        try {
            const currentTrip = await tripService.getCurrentTrip(session.token);
            if (currentTrip) {
                const booking = await bookingService.get(session.token, currentTrip.rideId);
                setActiveBooking(booking);
            } else {
                setActiveBooking(null);
            }
        } catch (error) {
            console.error("Failed to load active trip", error);
        }
    }, [session?.token]);

    useEffect(() => {
        void loadActiveBooking();
    }, [loadActiveBooking]);

    // Handlers
    const handleLogout = async () => {
        await logout();
        navigate("/driver/login");
    };

    const handleAcceptOffer = async (offerId: string) => {
        const booking = await acceptOffer(offerId);
        if (booking) {
            toast({
                title: "Ride Accepted!",
                description: "Navigate to the pickup location.",
            });
            setActiveBooking(booking);
        }
    };

    const handleRejectOffer = async (offerId: string, reason?: string) => {
        await rejectOffer(offerId, reason);
    };

    if (!profile || profile.role !== "driver") return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Mobile Header */}
            <header className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                        <AvatarFallback className="bg-emerald-500/20 text-emerald-100">
                            {profile.name.slice(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="font-semibold text-white leading-tight">{profile.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Online
                            </span>
                            <span>•</span>
                            <span>{profile.vehicle.registrationNumber}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative">
                        <Bell className="h-5 w-5" />
                        {currentOffer && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate('/driver/profile')}>
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-4 pb-24 space-y-6 overflow-y-auto">

                {/* 1. Status/Map Card (Placeholder for Map) */}
                <div className="relative h-64 bg-slate-900 rounded-2xl border border-white/10 overflow-hidden group">
                    <div className="absolute inset-0 flex items-center justify-center bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/88.26,26.71,13,0/600x400?access_token=pk.xxx')] bg-cover opacity-50">
                        {/* Fallback pattern if image fails */}
                        <div className="text-center">
                            <MapPin className="h-8 w-8 text-emerald-500 mx-auto mb-2 animate-bounce" />
                            <p className="text-sm font-medium text-slate-300">Searching for rides near you...</p>
                        </div>
                    </div>

                    {/* Floating Status Control */}
                    <div className="absolute bottom-4 left-4 right-4">
                        {session?.token && (
                            <DriverLocationStatus
                                token={session.token}
                                capacity={profile.vehicle.capacity}
                                activeRideId={activeBooking?.id ?? null}
                            />
                        )}
                    </div>
                </div>

                {/* 2. Active Ride Card (Priority) */}
                {activeBooking && (
                    <div className="animate-in slide-in-from-bottom duration-500">
                        <ActiveRideDisplay
                            booking={activeBooking}
                            onStartTrip={() => {
                                // Refresh triggers automatically via activeBooking/state
                                loadActiveBooking();
                            }}
                            onCompleteTrip={() => {
                                setActiveBooking(null);
                                loadActiveBooking();
                            }}
                        />
                    </div>
                )}

                {/* 3. Empty State / Stats */}
                {!activeBooking && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-2xl font-bold text-emerald-400">{profile.stats.totalTrips}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Today's Trips</p>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-2xl font-bold text-sky-400">₹{profile.stats.totalTrips * 150}</p> {/* Mock Earnings */}
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Earnings</p>
                        </div>
                    </div>
                )}

                {/* 4. Tools / Menu */}
                <div className="grid gap-3">
                    <Button variant="outline" className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 hover:text-white h-12" onClick={() => navigate('/driver/earnings')}>
                        <History className="mr-3 h-5 w-5 text-emerald-500" />
                        Earnings History
                    </Button>
                    {/* Debug Tools Toggler */}
                    <details className="group">
                        <summary className="list-none">
                            <Button variant="outline" className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5 hover:text-white h-12">
                                <Search className="mr-3 h-5 w-5 text-sky-500" />
                                Developer Tools (Dispatch Simulation)
                            </Button>
                        </summary>
                        <div className="mt-4">
                            {session?.token && (
                                <DispatchTestPanel
                                    token={session.token}
                                    defaultCapacity={profile.vehicle.capacity}
                                />
                            )}
                        </div>
                    </details>
                </div>
            </main>

            {/* Ride Offer Popup (Global) */}
            <RideOfferNotification
                offer={currentOffer}
                isAccepting={isAccepting}
                isRejecting={isRejecting}
                onAccept={handleAcceptOffer}
                onReject={handleRejectOffer}
            />
        </div>
    );
};

export default DriverDashboard;

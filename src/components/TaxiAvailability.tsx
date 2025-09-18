import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Users, Clock, Star, Phone } from "lucide-react";

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

const mockTaxis: Taxi[] = [
    {
        id: "1",
        driverName: "Pemba Sherpa",
        vehicleNumber: "WB 73 A 1234",
        seatsAvailable: 2,
        totalSeats: 8,
        departureTime: "10:30 AM",
        rating: 4.8,
        phone: "+91 98765 43210",
        status: "filling"
    },
    {
        id: "2",
        driverName: "Rajesh Kumar",
        vehicleNumber: "WB 73 B 5678",
        seatsAvailable: 5,
        totalSeats: 8,
        departureTime: "11:00 AM",
        rating: 4.6,
        phone: "+91 98765 43211",
        status: "filling"
    },
    {
        id: "3",
        driverName: "Tenzin Norbu",
        vehicleNumber: "WB 73 C 9012",
        seatsAvailable: 1,
        totalSeats: 8,
        departureTime: "11:30 AM",
        rating: 4.9,
        phone: "+91 98765 43212",
        status: "ready"
    }
];

interface TaxiAvailabilityProps {
    route: { from: string; to: string; fare: string };
    onBookSeat: (taxi: Taxi) => void;
}

export const TaxiAvailability = ({ route, onBookSeat }: TaxiAvailabilityProps) => {
    const [taxis, setTaxis] = useState<Taxi[]>(mockTaxis);

    const getStatusColor = (status: Taxi["status"]) => {
        switch (status) {
            case "filling": return "bg-primary text-primary-foreground";
            case "ready": return "bg-success text-success-foreground";
            case "departed": return "bg-muted text-muted-foreground";
            default: return "bg-muted";
        }
    };

    const getStatusText = (status: Taxi["status"]) => {
        switch (status) {
            case "filling": return "Filling Up";
            case "ready": return "Ready to Go";
            case "departed": return "Departed";
            default: return "Unknown";
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                    {route.from} → {route.to}
                </h3>
                <p className="text-muted-foreground">Available shared taxis</p>
            </div>

            <div className="space-y-4">
                {taxis.map((taxi) => (
                    <Card key={taxi.id} className="transition-smooth hover:shadow-card">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Car className="h-5 w-5 text-primary" />
                                    {taxi.driverName}
                                </CardTitle>
                                <Badge className={getStatusColor(taxi.status)}>
                                    {getStatusText(taxi.status)}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{taxi.vehicleNumber}</p>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span>{taxi.seatsAvailable}/{taxi.totalSeats} seats</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>{taxi.departureTime}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-primary fill-primary" />
                                    <span>{taxi.rating}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs">{taxi.phone}</span>
                                </div>
                            </div>

                            {/* Seat visualization */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Seat Availability:</p>
                                <div className="flex gap-1">
                                    {Array.from({ length: taxi.totalSeats }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-6 h-6 rounded border-2 ${i < taxi.totalSeats - taxi.seatsAvailable
                                                    ? 'bg-muted border-muted-foreground'
                                                    : 'bg-success border-success'
                                                }`}
                                            title={i < taxi.totalSeats - taxi.seatsAvailable ? 'Occupied' : 'Available'}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <span className="font-bold text-xl text-primary">{route.fare}</span>
                                <Button
                                    variant={taxi.seatsAvailable > 0 ? "taxi" : "secondary"}
                                    disabled={taxi.seatsAvailable === 0 || taxi.status === "departed"}
                                    onClick={() => onBookSeat(taxi)}
                                    className="px-6"
                                >
                                    {taxi.seatsAvailable > 0 ? 'Book Seat' : 'Full'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {taxis.filter(t => t.seatsAvailable > 0).length === 0 && (
                <Card className="text-center p-8">
                    <CardContent className="space-y-4">
                        <p className="text-lg font-medium">No seats available right now</p>
                        <p className="text-muted-foreground">Check back in a few minutes or try a different route</p>
                        <Button variant="outline">Notify When Available</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
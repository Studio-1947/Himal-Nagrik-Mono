import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AdminUser, AdminRide, adminService } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

export default function AdminDashboard() {
    const { session } = useAuth();
    const token = session?.token;
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [rides, setRides] = useState<AdminRide[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token) {
            loadData();
        }
    }, [token]);

    const loadData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [usersData, ridesData] = await Promise.all([
                adminService.getUsers(token),
                adminService.getRides(token)
            ]);
            setUsers(usersData);
            setRides(ridesData);
        } catch (err) {
            toast({
                title: "Error loading admin data",
                description: "Failed to fetch users or rides",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRide = async (rideId: string) => {
        if (!token) return;
        if (!confirm("Are you sure you want to forcefully cancel this ride?")) return;

        try {
            await adminService.cancelRide(token, rideId);
            toast({ title: "Ride cancelled" });
            loadData(); // Refresh
        } catch (err) {
            toast({
                title: "Action failed",
                description: "Could not cancel ride",
                variant: "destructive"
            });
        }
    };

    if (!session || session.profile.role !== 'admin') {
        return <div className="p-8 text-white">Access Denied. You must be an admin.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6 text-slate-100 pb-24">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Admin Console
                    </h1>
                    <Button onClick={loadData} disabled={loading} variant="outline" className="border-white/10 hover:bg-white/5">
                        Refresh Data
                    </Button>
                </div>

                <Tabs defaultValue="rides" className="w-full">
                    <TabsList className="bg-slate-900 border border-white/10">
                        <TabsTrigger value="rides">Rides Management</TabsTrigger>
                        <TabsTrigger value="users">User Database</TabsTrigger>
                    </TabsList>

                    <TabsContent value="rides">
                        <Card className="bg-slate-900/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">All Rides</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs uppercase bg-white/5 text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3">ID</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Passenger</th>
                                                <th className="px-4 py-3">Driver</th>
                                                <th className="px-4 py-3">Created</th>
                                                <th className="px-4 py-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {rides.map((ride) => (
                                                <tr key={ride.id} className="hover:bg-white/5">
                                                    <td className="px-4 py-3 font-mono text-xs">{ride.id.slice(0, 8)}...</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${ride.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                                                ride.status === 'requested' ? 'bg-yellow-500/10 text-yellow-400' :
                                                                    ride.status.includes('cancelled') ? 'bg-red-500/10 text-red-400' :
                                                                        'bg-blue-500/10 text-blue-400'
                                                            }`}>
                                                            {ride.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{ride.passengerId}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{ride.driverId || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-400">{new Date(ride.createdAt).toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        {!ride.status.includes('cancelled') && ride.status !== 'completed' && (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={() => handleCancelRide(ride.id)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card className="bg-slate-900/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Registered Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs uppercase bg-white/5 text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3">Role</th>
                                                <th className="px-4 py-3">Email</th>
                                                <th className="px-4 py-3">Joined</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {users.map((user) => (
                                                <tr key={user.id} className="hover:bg-white/5">
                                                    <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' :
                                                                user.role === 'driver' ? 'bg-indigo-500/10 text-indigo-400' :
                                                                    'bg-slate-500/10 text-slate-400'
                                                            }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">{user.email}</td>
                                                    <td className="px-4 py-3 text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

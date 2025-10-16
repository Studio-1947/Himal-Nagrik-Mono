import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarClock,
  CheckCircle2,
  GaugeCircle,
  LogOut,
  MapPin,
  Route,
  ShieldCheck,
  CarFront,
  Users,
  Wrench,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const optionalShortString = z.string().max(160).optional().or(z.literal(""));
const optionalMediumString = z.string().max(120).optional().or(z.literal(""));

const driverSettingsSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phone: z.string().min(8, { message: "Add a contact number" }),
  location: optionalMediumString,
  bio: optionalShortString,
  licenseNumber: optionalMediumString,
  vehicleManufacturer: z
    .string()
    .min(2, { message: "Add vehicle manufacturer" }),
  vehicleModel: z.string().min(1, { message: "Add vehicle model" }),
  vehicleRegistrationNumber: z
    .string()
    .min(4, { message: "Add registration number" }),
  vehicleCapacity: z.coerce
    .number({ invalid_type_error: "Enter a valid seat count" })
    .min(4, {
      message: "Capacity must be at least 4",
    }),
  vehicleColor: optionalMediumString,
  statsTotalTrips: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, {
      message: "Trips cannot be negative",
    }),
  statsRating: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, {
      message: "Rating cannot be negative",
    })
    .max(5, { message: "Rating must be 5 or below" }),
  statsYearsExperience: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, {
      message: "Experience cannot be negative",
    }),
  statsCancellationRate: z.coerce
    .number({ invalid_type_error: "Enter a percentage" })
    .min(0, {
      message: "Cancellation rate cannot be negative",
    })
    .max(100, { message: "Keep rate under 100" }),
  availabilityShift: z.enum(["morning", "day", "evening", "night"]),
  availabilityWeekdays: z
    .string()
    .min(2, { message: "List at least one working day" }),
});

type DriverSettingsValues = z.infer<typeof driverSettingsSchema>;

const DriverProfilePage = () => {
  const { profile, updateProfile, isPending, logout } = useAuth();
  const navigate = useNavigate();
  const formValues = useMemo<DriverSettingsValues>(() => {
    if (profile?.role === "driver") {
      return {
        name: profile.name,
        phone: profile.phone ?? "",
        location: profile.location ?? "",
        bio: profile.bio ?? "",
        licenseNumber: profile.licenseNumber ?? "",
        vehicleManufacturer: profile.vehicle.manufacturer,
        vehicleModel: profile.vehicle.model,
        vehicleRegistrationNumber: profile.vehicle.registrationNumber,
        vehicleCapacity: profile.vehicle.capacity,
        vehicleColor: profile.vehicle.color ?? "",
        statsTotalTrips: profile.stats.totalTrips,
        statsRating: profile.stats.rating,
        statsYearsExperience: profile.stats.yearsOfExperience,
        statsCancellationRate: profile.stats.cancellationRate,
        availabilityShift: profile.availability.shift,
        availabilityWeekdays: profile.availability.weekdays.join(", "),
      };
    }

    return {
      name: "",
      phone: "",
      location: "",
      bio: "",
      licenseNumber: "",
      vehicleManufacturer: "",
      vehicleModel: "",
      vehicleRegistrationNumber: "",
      vehicleCapacity: 4,
      vehicleColor: "",
      statsTotalTrips: 0,
      statsRating: 0,
      statsYearsExperience: 0,
      statsCancellationRate: 0,
      availabilityShift: "morning",
      availabilityWeekdays: "",
    };
  }, [profile]);

  const form = useForm<DriverSettingsValues>({
    resolver: zodResolver(driverSettingsSchema),
    defaultValues: formValues,
  });

  useEffect(() => {
    form.reset(formValues);
  }, [formValues, form]);

  if (!profile || profile.role !== "driver") {
    return null;
  }

  const handleSubmit = async (values: DriverSettingsValues) => {
    try {
      const weekdays = values.availabilityWeekdays
        .split(",")
        .map((day) => day.trim())
        .filter(Boolean);

      await updateProfile({
        role: "driver",
        name: values.name,
        phone: values.phone,
        location: values.location || undefined,
        bio: values.bio || undefined,
        licenseNumber: values.licenseNumber || undefined,
        vehicle: {
          manufacturer: values.vehicleManufacturer,
          model: values.vehicleModel,
          registrationNumber: values.vehicleRegistrationNumber,
          capacity: values.vehicleCapacity,
          color: values.vehicleColor || undefined,
        },
        stats: {
          totalTrips: values.statsTotalTrips,
          rating: values.statsRating,
          yearsOfExperience: values.statsYearsExperience,
          cancellationRate: values.statsCancellationRate,
        },
        availability: {
          shift: values.availabilityShift,
          weekdays,
        },
      });

      toast({
        title: "Profile saved",
        description: "Your driver details were updated successfully.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update profile";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/driver/login");
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900" />
      <div className="absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-br from-amber-400/20 via-orange-500/15 to-transparent blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border border-white/20">
              <AvatarImage src={profile.avatarUrl} alt={profile.name} />
              <AvatarFallback className="bg-amber-400/20 text-lg text-amber-100">
                {profile.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                  {profile.name}
                </h1>
                <Badge className="bg-amber-400/15 text-amber-100">Driver</Badge>
              </div>
              <p className="text-sm text-slate-300">
                {profile.bio || "Share more about your driving experience."}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-amber-100/80">
                {profile.location ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Capacity {profile.vehicle.capacity} seats
                </span>
                <span className="inline-flex items-center gap-2">
                  <CarFront className="h-4 w-4" />
                  {profile.stats.yearsOfExperience} yrs experience
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Home
            </Link>
            <Button
              variant="outline"
              className="border-amber-300/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </header>

        <main className="mt-10 grid gap-10 lg:grid-cols-[2fr,1fr]">
          <section className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">
                Driver profile
              </h2>
              <p className="text-sm text-slate-300">
                Keep your permits, vehicle, and availability details current for
                dispatch.
              </p>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="mt-6 space-y-6"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact number</FormLabel>
                          <FormControl>
                            <Input placeholder="+91" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base stand</FormLabel>
                          <FormControl>
                            <Input placeholder="Ghoom, Darjeeling" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License number</FormLabel>
                          <FormControl>
                            <Input placeholder="WB-DRI-2024-7788" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About you</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share any specialties, favourite routes, or languages you speak."
                            className="min-h-[96px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-2xl border border-white/10 bg-amber-400/10 p-4 text-sm text-amber-100">
                    <p className="flex items-center gap-2 font-semibold uppercase tracking-[0.25em] text-white/60">
                      <Wrench className="h-4 w-4" /> Vehicle details
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="vehicleManufacturer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufacturer</FormLabel>
                            <FormControl>
                              <Input placeholder="Mahindra" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vehicleModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <Input placeholder="Bolero" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vehicleRegistrationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration number</FormLabel>
                            <FormControl>
                              <Input placeholder="WB-76A-4210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vehicleColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Colour</FormLabel>
                            <FormControl>
                              <Input placeholder="Moss Green" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vehicleCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seating capacity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={4}
                                max={20}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="statsTotalTrips"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total trips</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="statsRating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rating</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              max={5}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="statsYearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of experience</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="statsCancellationRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cancellation rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              max={100}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
                      <Route className="h-4 w-4" /> Availability
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr,1fr]">
                      <FormField
                        control={form.control}
                        name="availabilityShift"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred shift</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="text-white">
                                  <SelectValue placeholder="Select a shift" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="morning">
                                    Morning
                                  </SelectItem>
                                  <SelectItem value="day">Day</SelectItem>
                                  <SelectItem value="evening">
                                    Evening
                                  </SelectItem>
                                  <SelectItem value="night">Night</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="availabilityWeekdays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating days</FormLabel>
                            <FormControl>
                              <Input placeholder="Mon, Tue, Wed" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_55px_rgba(251,191,36,0.25)]"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 animate-spin" />{" "}
                        Saving
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Save changes
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
                Performance snapshot
              </h3>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Average rating
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {profile.stats.rating.toFixed(1)} / 5
                    </p>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-amber-200" />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Total trips
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {profile.stats.totalTrips}
                    </p>
                  </div>
                  <GaugeCircle className="h-6 w-6 text-amber-200" />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Cancellation rate
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {profile.stats.cancellationRate}%
                    </p>
                  </div>
                  <Route className="h-6 w-6 text-amber-200" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-amber-400/10 p-6 backdrop-blur-xl text-sm text-amber-100">
              <p className="flex items-center gap-3 text-base font-semibold text-amber-50">
                <CalendarClock className="h-5 w-5" /> Dispatch note
              </p>
              <p className="mt-3 text-amber-100/90">
                Update your operating days each week to receive priority
                bookings from passengers who favour your routes.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default DriverProfilePage;

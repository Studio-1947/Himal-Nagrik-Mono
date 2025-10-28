import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  CheckCircle2,
  Feather,
  LogOut,
  MapPin,
  Mountain,
  Music4,
  RadioReceiver,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePassengerDashboard } from "@/hooks/use-passenger-dashboard";
import { PassengerDashboard } from "@/features/passenger/dashboard/PassengerDashboard";

const passengerSettingsSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phone: z.string().min(8, { message: "Add a contact number" }),
  location: z.string().optional(),
  bio: z
    .string()
    .max(160, { message: "Bio can be up to 160 characters" })
    .optional(),
  preferredSeat: z.enum(["front", "middle", "back"]).or(z.literal("")),
  musicPreference: z.enum(["quiet", "neutral", "lively"]).or(z.literal("")),
  accessibilityNeeds: z.string().max(120).optional(),
  favouriteRoutes: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
});

type PassengerSettingsValues = z.infer<typeof passengerSettingsSchema>;

const PassengerProfilePage = () => {
  const { profile, updateProfile, isPending, logout } = useAuth();
  const {
    summary: dashboardSummary,
    isLoading: isDashboardLoading,
    isRefreshing: isDashboardRefreshing,
    refresh: refreshDashboard,
    setFocus: setDashboardFocus,
  } = usePassengerDashboard();
  const navigate = useNavigate();
  const formValues = useMemo<PassengerSettingsValues>(() => {
    if (profile?.role === "passenger") {
      return {
        name: profile.name,
        phone: profile.phone ?? "",
        location: profile.location ?? "",
        bio: profile.bio ?? "",
        preferredSeat: profile.preferences.preferredSeat ?? "",
        musicPreference: profile.preferences.musicPreference ?? "",
        accessibilityNeeds: profile.preferences.accessibilityNeeds ?? "",
        favouriteRoutes: profile.preferences.favouriteRoutes.join(", "),
        emergencyContactName: profile.emergencyContact?.name ?? "",
        emergencyContactPhone: profile.emergencyContact?.phone ?? "",
        emergencyContactRelation: profile.emergencyContact?.relation ?? "",
      };
    }

    return {
      name: "",
      phone: "",
      location: "",
      bio: "",
      preferredSeat: "",
      musicPreference: "",
      accessibilityNeeds: "",
      favouriteRoutes: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
    };
  }, [profile]);

  const form = useForm<PassengerSettingsValues>({
    resolver: zodResolver(passengerSettingsSchema),
    defaultValues: formValues,
  });

  useEffect(() => {
    form.reset(formValues);
  }, [formValues, form]);

  if (!profile || profile.role !== "passenger") {
    return null;
  }

  const handleSubmit = async (values: PassengerSettingsValues) => {
    try {
      const favouriteRoutes =
        values.favouriteRoutes
          ?.split(",")
          .map((route) => route.trim())
          .filter(Boolean) ?? [];

      await updateProfile({
        role: "passenger",
        name: values.name,
        phone: values.phone,
        location: values.location,
        bio: values.bio,
        preferences: {
          preferredSeat: (values.preferredSeat || undefined) as
            | "front"
            | "middle"
            | "back"
            | undefined,
          musicPreference: (values.musicPreference || undefined) as
            | "quiet"
            | "neutral"
            | "lively"
            | undefined,
          accessibilityNeeds: values.accessibilityNeeds || undefined,
          favouriteRoutes,
        },
        emergencyContact:
          values.emergencyContactName ||
          values.emergencyContactPhone ||
          values.emergencyContactRelation
            ? {
                name: values.emergencyContactName || "",
                phone: values.emergencyContactPhone || "",
                relation: values.emergencyContactRelation || undefined,
              }
            : undefined,
      });

      toast({
        title: "Profile saved",
        description: "Your passenger preferences were updated successfully.",
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
    navigate("/login");
  };

  const completedTrips = profile.recentTrips.filter(
    (trip) => trip.status === "completed"
  ).length;
  const savedLocations = profile.savedLocations ?? [];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900" />
      <div className="absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-br from-emerald-500/20 via-sky-500/15 to-transparent blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border border-white/20">
              <AvatarImage src={profile.avatarUrl} alt={profile.name} />
              <AvatarFallback className="bg-emerald-500/20 text-lg text-emerald-100">
                {profile.name
                  .split(" ")
                  .map((segment) => segment[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                  {profile.name}
                </h1>
                <Badge className="bg-emerald-500/15 text-emerald-200">
                  Passenger
                </Badge>
              </div>
              <p className="text-sm text-slate-300">
                {profile.bio || "Add a short bio to let drivers know you."}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100/80">
                {profile.location ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {completedTrips} completed rides
                </span>
                <span className="inline-flex items-center gap-2">
                  <Mountain className="h-4 w-4" />
                  Favourite routes: {profile.preferences.favouriteRoutes.length}
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
              className="border-emerald-300/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </header>

        <main className="mt-10 grid gap-10 lg:grid-cols-[2fr,1fr]">
          <section className="space-y-8">
            {dashboardSummary ? (
              <PassengerDashboard
                summary={dashboardSummary}
                onRefresh={refreshDashboard}
                isRefreshing={isDashboardRefreshing}
                onSetFocus={setDashboardFocus}
              />
            ) : isDashboardLoading ? (
              <div className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">
                Update your preferences
              </h2>
              <p className="text-sm text-slate-300">
                Tailor your shared rides and keep emergency contacts handy for
                faster dispatch.
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
                          <FormLabel>Base location</FormLabel>
                          <FormControl>
                            <Input placeholder="Darjeeling Bazaar" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="favouriteRoutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Favourite routes</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Darjeeling ↔ Siliguri, Darjeeling ↔ Mirik"
                              {...field}
                            />
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
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share something about your travel style."
                            className="min-h-[96px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="preferredSeat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred seat</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="front / middle / back"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="musicPreference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Music preference</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="quiet / neutral / lively"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accessibilityNeeds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accessibility needs</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    <p className="flex items-center gap-2 font-semibold uppercase tracking-[0.25em] text-white/60">
                      <RadioReceiver className="h-4 w-4" /> Emergency contact
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Who should we reach out to?"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyContactRelation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relation</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Brother" {...field} />
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
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_55px_rgba(16,185,129,0.25)]"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <Music4 className="h-4 w-4 animate-spin" /> Saving
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

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Saved pickup points
                </h3>
                <Badge className="bg-emerald-500/15 text-emerald-200">
                  {savedLocations.length} saved
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                Keep your frequent boarding spots handy for quicker bookings.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {savedLocations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                    No saved locations yet. Add your home, work, or favourite
                    stop from the mobile app to get started.
                  </div>
                ) : (
                  savedLocations.map((location) => (
                    <div
                      key={location.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between text-sm text-slate-200">
                        <span className="inline-flex items-center gap-2 font-medium text-white">
                          <MapPin className="h-4 w-4 text-emerald-300" />
                          {location.label}
                        </span>
                        {location.isDefault ? (
                          <Badge className="bg-emerald-500/15 text-emerald-200">
                            Default
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-300">
                        {location.address}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
                Recent journeys
              </h3>
              <div className="mt-4 space-y-3">
                {profile.recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(trip.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Badge className="bg-emerald-500/15 capitalize text-emerald-200">
                        {trip.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">
                      {trip.route}
                    </p>
                    <p className="text-xs text-slate-400">with {trip.driver}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-emerald-500/10 p-6 backdrop-blur-xl text-sm text-emerald-100">
              <p className="flex items-center gap-3 text-base font-semibold text-emerald-50">
                <Feather className="h-5 w-5" /> Travel tip
              </p>
              <p className="mt-3 text-emerald-100/90">
                Leaving early from Chowk Bazaar? Mark the route as favourite to
                get automatic reminders when seats fill up.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default PassengerProfilePage;

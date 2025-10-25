import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { driverService } from "@/lib/driver-service";

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
  const { profile, updateProfile, refreshProfile, session, isPending, logout } =
    useAuth();
  const navigate = useNavigate();
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [documentType, setDocumentType] = useState("");
  const [documentMetadata, setDocumentMetadata] = useState("");
  const [isSubmittingDocument, setIsSubmittingDocument] = useState(false);

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

  const handleToggleAvailability = async () => {
    if (!session?.token || profile.role !== "driver") {
      return;
    }
    const targetStatus = !(profile.availability.isActive ?? true);
    setIsTogglingAvailability(true);
    try {
      await driverService.toggleAvailability(session.token, targetStatus);
      await refreshProfile();
      toast({
        title: "Availability updated",
        description: `You are now ${targetStatus ? "online" : "offline"} for dispatch requests.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to toggle availability";
      toast({
        title: "Toggle failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const handleDocumentSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!session?.token || profile.role !== "driver") {
      return;
    }
    if (!documentType.trim()) {
      toast({
        title: "Missing document type",
        description: "Please add a document type before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingDocument(true);
    try {
      let metadata: Record<string, unknown> | undefined;
      if (documentMetadata.trim()) {
        try {
          metadata = JSON.parse(documentMetadata);
        } catch {
          toast({
            title: "Invalid metadata",
            description: "Metadata must be valid JSON.",
            variant: "destructive",
          });
          setIsSubmittingDocument(false);
          return;
        }
      }

      await driverService.submitDocument(session.token, {
        documentType: documentType.trim(),
        metadata,
      });
      await refreshProfile();
      setDocumentType("");
      setDocumentMetadata("");
      toast({
        title: "Document submitted",
        description: "We will review it shortly.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit document";
      toast({
        title: "Submission failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDocument(false);
    }
  };

  const completedTrips = profile.stats.totalTrips;
  const savedDocuments = profile.documents ?? [];
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
                  Driver
                </Badge>
              </div>
              <p className="text-sm text-slate-300">
                {profile.bio || "Share a brief summary of your driving style."}
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
                  <ShieldCheck className="h-4 w-4" />
                  {profile.stats.rating.toFixed(1)} passenger rating
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
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Availability
                  </h2>
                  <p className="text-sm text-slate-300">
                    Toggle your dispatch status when you are ready to accept
                    rides.
                  </p>
                </div>
                <Badge
                  className={
                    profile.availability.isActive ?? true
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-slate-700/40 text-slate-200"
                  }
                >
                  {profile.availability.isActive ?? true ? "Online" : "Offline"}
                </Badge>
              </div>
              <Button
                className="mt-4"
                variant={
                  profile.availability.isActive ?? true ? "outline" : "default"
                }
                onClick={handleToggleAvailability}
                disabled={isTogglingAvailability}
              >
                {isTogglingAvailability
                  ? "Updating..."
                  : profile.availability.isActive ?? true
                  ? "Go offline"
                  : "Go online"}
              </Button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">
                Update your profile
              </h2>
              <p className="text-sm text-slate-300">
                Keep your vehicle and availability information fresh to gain
                trust from passengers.
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
                            <Input placeholder="Siliguri" {...field} />
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
                            <Input placeholder="WB-XX-1234567" {...field} />
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
                            placeholder="Share something about your routes and experience."
                            className="min-h-[96px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
                        Vehicle details
                      </h3>
                      <div className="mt-4 grid gap-3">
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
                                <Input placeholder="Bolero Camper" {...field} />
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
                                <Input placeholder="WB-XX-0000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="vehicleCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Capacity</FormLabel>
                                <FormControl>
                                  <Input type="number" min={4} {...field} />
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
                                <FormLabel>Color</FormLabel>
                                <FormControl>
                                  <Input placeholder="White" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
                        Performance & availability
                      </h3>
                      <div className="mt-4 grid gap-3">
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
                                <Input type="number" min={0} max={5} step="0.1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="statsYearsExperience"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Experience (years)</FormLabel>
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
                                  <Input type="number" min={0} max={100} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="availabilityShift"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred shift</FormLabel>
                              <FormControl>
                                <Input placeholder="day / evening / night" {...field} />
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
                              <FormLabel>Working days</FormLabel>
                              <FormControl>
                                <Input placeholder="Mon, Tue, Wed" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_55px_rgba(16,185,129,0.25)]"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <GaugeCircle className="h-4 w-4 animate-spin" /> Saving
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
                Compliance documents
              </h3>

              <form className="mt-4 space-y-3 text-sm" onSubmit={handleDocumentSubmit}>
                <Input
                  placeholder="Document type (e.g. driving_license)"
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                />
                <Textarea
                  placeholder='Optional metadata (JSON). Example: {"number":"DL-12345"}'
                  value={documentMetadata}
                  onChange={(event) => setDocumentMetadata(event.target.value)}
                  className="min-h-[96px]"
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmittingDocument}
                >
                  {isSubmittingDocument ? "Submitting..." : "Submit document"}
                </Button>
              </form>

              <div className="mt-6 space-y-3">
                {savedDocuments.length === 0 ? (
                  <p className="text-sm text-slate-300">
                    No documents uploaded yet.
                  </p>
                ) : (
                  savedDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold capitalize text-white">
                          {document.documentType.replace(/_/g, " ")}
                        </span>
                        <Badge
                          className={
                            document.status === "approved"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : document.status === "rejected"
                              ? "bg-red-500/15 text-red-200"
                              : "bg-slate-700/40 text-slate-200"
                          }
                        >
                          {document.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Submitted {new Date(document.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
                Performance snapshot
              </h3>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <Route className="h-4 w-4" />
                    Trips this season
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {profile.stats.totalTrips}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <Users className="h-4 w-4" />
                    Passenger rating
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {profile.stats.rating.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <Wrench className="h-4 w-4" />
                    Experience
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {profile.stats.yearsOfExperience} years
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <CarFront className="h-4 w-4" />
                    Cancellation rate
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {profile.stats.cancellationRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl text-sm text-emerald-100">
              <p className="flex items-center gap-3 text-base font-semibold text-emerald-50">
                <CalendarClock className="h-5 w-5" /> Scheduling tip
              </p>
              <p className="mt-3 text-emerald-100/90">
                Mark yourself offline during maintenance windows to avoid
                dispatch conflicts. Toggle back online once you are ready.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default DriverProfilePage;

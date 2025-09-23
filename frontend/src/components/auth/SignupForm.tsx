import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Loader2, LockKeyhole, Mail, MapPin, Phone, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { AuthRole, AuthSession } from "@/lib/auth-service";
import { cn } from "@/lib/utils";

const optionalShortString = z.string().max(160).optional().or(z.literal(""));
const optionalMediumString = z.string().max(120).optional().or(z.literal(""));
const optionalPhoneString = z.string().min(6, { message: "Enter a valid phone" }).optional().or(z.literal(""));

const riderSignupSchema = z
  .object({
    role: z.literal("rider"),
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Enter a valid email" }),
    phone: optionalPhoneString,
    location: optionalMediumString,
    bio: optionalShortString,
    preferredSeat: z.enum(["front", "middle", "back"]).optional(),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

const driverSignupSchema = z
  .object({
    role: z.literal("driver"),
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Enter a valid email" }),
    phone: optionalPhoneString,
    location: optionalMediumString,
    bio: optionalShortString,
    licenseNumber: optionalMediumString,
    vehicleManufacturer: z.string().min(2, { message: "Enter the manufacturer" }),
    vehicleModel: z.string().min(1, { message: "Enter the vehicle model" }),
    vehicleRegistrationNumber: optionalMediumString,
    vehicleCapacity: z.coerce
      .number({ invalid_type_error: "Enter a valid seat count" })
      .min(4, { message: "Capacity must be at least 4" })
      .max(18, { message: "Capacity must be 18 or less" }),
    vehicleColor: optionalMediumString,
    yearsOfExperience: z.coerce
      .number({ invalid_type_error: "Enter years of experience" })
      .min(0, { message: "Experience cannot be negative" })
      .max(50, { message: "Experience must be 50 or less" }),
    availabilityShift: z.enum(["morning", "day", "evening", "night"]),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

export type RiderSignupValues = z.infer<typeof riderSignupSchema>;
export type DriverSignupValues = z.infer<typeof driverSignupSchema>;
export type SignupFormValues = RiderSignupValues | DriverSignupValues;

interface SignupFormProps {
  role: AuthRole;
  onSuccess?: (session: AuthSession) => void;
  className?: string;
}

const riderDefaultValues: RiderSignupValues = {
  role: "rider",
  name: "",
  email: "",
  phone: "",
  location: "",
  bio: "",
  preferredSeat: undefined,
  password: "",
  confirmPassword: "",
};

const driverDefaultValues: DriverSignupValues = {
  role: "driver",
  name: "",
  email: "",
  phone: "",
  location: "",
  bio: "",
  licenseNumber: "",
  vehicleManufacturer: "Mahindra",
  vehicleModel: "Bolero",
  vehicleRegistrationNumber: "",
  vehicleCapacity: 10,
  vehicleColor: "",
  yearsOfExperience: 0,
  availabilityShift: "day",
  password: "",
  confirmPassword: "",
};

const trimToUndefined = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const SignupForm = ({ role, onSuccess, className }: SignupFormProps) => {
  const schema = role === "driver" ? driverSignupSchema : riderSignupSchema;
  const defaultValues = (role === "driver"
    ? { ...driverDefaultValues }
    : { ...riderDefaultValues }) as SignupFormValues;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { register: registerAccount, isPending } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (values: SignupFormValues) => {
    try {
      const basePayload = {
        role,
        name: values.name,
        email: values.email,
        password: values.password,
        phone: trimToUndefined(values.phone),
        location: trimToUndefined(values.location),
        bio: trimToUndefined(values.bio),
      } as const;

      const payload =
        role === "driver"
          ? {
              ...basePayload,
              role: "driver" as const,
              licenseNumber: trimToUndefined((values as DriverSignupValues).licenseNumber),
              vehicle: {
                manufacturer: (values as DriverSignupValues).vehicleManufacturer,
                model: (values as DriverSignupValues).vehicleModel,
                registrationNumber: trimToUndefined((values as DriverSignupValues).vehicleRegistrationNumber),
                capacity: (values as DriverSignupValues).vehicleCapacity,
                color: trimToUndefined((values as DriverSignupValues).vehicleColor),
              },
              availability: {
                shift: (values as DriverSignupValues).availabilityShift,
                weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
              },
              yearsOfExperience: (values as DriverSignupValues).yearsOfExperience,
            }
          : {
              ...basePayload,
              role: "rider" as const,
              preferences: (values as RiderSignupValues).preferredSeat
                ? { preferredSeat: (values as RiderSignupValues).preferredSeat }
                : undefined,
            };

      const result = await registerAccount(payload);

      toast({
        title: role === "driver" ? "Driver account created" : "Welcome to Himal Nagrik",
        description:
          role === "driver"
            ? "Your driver workspace is ready. Add your route details to get started."
            : "Your rider profile is live. Start planning your hill journeys now.",
      });

      if (onSuccess) {
        onSuccess(result.session);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign up";
      toast({
        title: "Sign-up failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const passwordFieldType = showPassword ? "text" : "password";
  const confirmPasswordFieldType = showConfirmPassword ? "text" : "password";

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input placeholder="Tsering Wangmo" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="you@himal.app"
                        className="pl-10"
                        autoComplete="email"
                        {...field}
                      />
                    </div>
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
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input placeholder="+91 98 7654 3210" className="pl-10" {...field} />
                    </div>
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
                  <FormLabel>Home base</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input placeholder="Darjeeling Bazaar" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>About you</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Share a quick intro" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === "rider" ? (
              <FormField
                control={form.control}
                name="preferredSeat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred seat</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a seat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="front">Front seat</SelectItem>
                        <SelectItem value="middle">Middle seat</SelectItem>
                        <SelectItem value="back">Back seat</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
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
                <FormField
                  control={form.control}
                  name="vehicleManufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle manufacturer</FormLabel>
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
                      <FormLabel>Vehicle model</FormLabel>
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
                  name="vehicleCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat capacity</FormLabel>
                      <FormControl>
                        <Input type="number" min={4} max={18} {...field} />
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
                      <FormLabel>Vehicle color</FormLabel>
                      <FormControl>
                        <Input placeholder="Forest green" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearsOfExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (years)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={50} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="availabilityShift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred shift</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type={passwordFieldType}
                        className="pl-10"
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type={confirmPasswordFieldType}
                        className="pl-10"
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-200"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 via-sky-500 to-sky-400 text-white shadow-[0_18px_55px_rgba(16,185,129,0.25)]"
            disabled={isPending}
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </Form>
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200/80">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-emerald-200" />
          <span>
            {role === "driver"
              ? "Join the verified driver network across the Darjeeling hills."
              : "Plan your shared journeys with trusted local drivers."}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <CalendarClock className="h-4 w-4 text-sky-200" />
          <span>
            {role === "driver"
              ? "Set availability once and keep dispatch in sync automatically."
              : "Track bookings and departures in real time."}
          </span>
        </div>
      </div>
    </div>
  );
};

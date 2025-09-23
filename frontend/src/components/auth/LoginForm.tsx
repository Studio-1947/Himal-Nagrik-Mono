import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LockKeyhole, Mail, MapPin, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { AuthRole, AuthSession } from "@/lib/auth-service";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, { message: "Enter your registered email or phone" })
    .max(80),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  remember: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  role: AuthRole;
  onSuccess?: (session: AuthSession) => void;
  className?: string;
}

export const LoginForm = ({ role, onSuccess, className }: LoginFormProps) => {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      remember: true,
    },
  });

  const { login, isPending } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const result = await login({
        identifier: values.identifier,
        password: values.password,
        role,
      });

      toast({
        title: role === "driver" ? "Shift ready" : "Welcome back",
        description:
          role === "driver"
            ? "Your dashboard is syncing with today's bookings. Drive safe!"
            : "Let's plan your next shared ride through the hills.",
      });

      if (onSuccess) {
        onSuccess(result.session);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to log in";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const demoCredentials =
    role === "driver"
      ? { identifier: "karma.driver@himal.app", password: "himal999" }
      : { identifier: "pema.rider@himal.app", password: "himal123" };

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or phone</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder={demoCredentials.identifier}
                        className="pl-10"
                        autoComplete="username"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        className="pl-10"
                        autoComplete="current-password"
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
          </div>

          <div className="flex items-center justify-between text-sm">
            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Remember me on this device</FormLabel>
                </FormItem>
              )}
            />
            <button
              type="button"
              className="text-sm font-medium text-slate-200 underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-sky-500 via-emerald-500 to-emerald-400 text-white shadow-[0_18px_55px_rgba(14,165,233,0.25)]"
            disabled={isPending}
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing you in
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </Form>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200/90">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Demo credentials</p>
        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-300">
          <span>
            {demoCredentials.identifier} / <span className="font-semibold text-slate-100">{demoCredentials.password}</span>
          </span>
          <span>Use the demo account to explore the experience instantly.</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs uppercase tracking-[0.35em] text-white/40">
        {role === "driver" ? (
          <>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Fleet
            </span>
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />
              Live Dispatch
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Live Routes
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Safe Journeys
            </span>
          </>
        )}
      </div>
    </div>
  );
};


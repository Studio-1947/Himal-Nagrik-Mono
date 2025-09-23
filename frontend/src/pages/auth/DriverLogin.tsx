import { ArrowRight, CalendarClock, Gauge, ListChecks } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import type { AuthSession } from "@/lib/auth-service";

const driverHighlights = [
  {
    icon: CalendarClock,
    title: "Plan your shifts",
    description: "Lock your preferred departure slots and keep regular riders informed.",
  },
  {
    icon: Gauge,
    title: "Performance insights",
    description: "Monitor ratings, completed rides, and seat fill rate in one glance.",
  },
  {
    icon: ListChecks,
    title: "Route compliance",
    description: "Get notified about permits, checkpoints, and weather advisories in real time.",
  },
];

const DriverLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname;

  const handleSuccess = (session: AuthSession) => {
    const fallback = session.profile.role === "driver" ? "/driver/profile" : "/rider/profile";
    navigate(from ?? fallback, { replace: true });
  };

  return (
    <AuthLayout
      variant="driver"
      eyebrow="Driver desk"
      title="Sign in to manage your hill routes"
      subtitle="Confirm bookings, update availability, and stay aligned with dispatch and co-operatives across Darjeeling."
      supportCta={{ label: "Driver support", href: "mailto:drivers@himal.app" }}
    >
      <div className="space-y-8">
        <LoginForm role="driver" onSuccess={handleSuccess} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          <div className="flex items-center gap-3">
            <span>Need a driver account?</span>
          </div>
          <Button
            variant="outline"
            className="border-amber-300/40 bg-transparent text-amber-100 hover:bg-amber-400/10"
            onClick={() => navigate("/driver/signup")}
          >
            Join as driver
          </Button>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/40">
            Built for local drivers
          </p>
          <div className="mt-4 space-y-4">
            {driverHighlights.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-300">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          <div className="flex items-center gap-3">
            <ArrowRight className="h-4 w-4" />
            <span>Looking to book a ride?</span>
          </div>
          <Button
            variant="outline"
            className="border-amber-300/40 bg-transparent text-amber-100 hover:bg-amber-400/10"
            onClick={() => navigate("/login")}
          >
            Rider sign-in
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default DriverLoginPage;

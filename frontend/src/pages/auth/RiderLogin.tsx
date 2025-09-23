import { ArrowRight, HeartHandshake, MapPin, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import type { AuthSession } from "@/lib/auth-service";

const riderHighlights = [
  {
    icon: MapPin,
    title: "Realtime departures",
    description: "Check live seat availability before you leave your home base.",
  },
  {
    icon: Users,
    title: "Familiar co-travellers",
    description: "Ride with trusted community members you have travelled with before.",
  },
  {
    icon: HeartHandshake,
    title: "Save favourite routes",
    description: "Bookmark your frequent journeys for one-tap booking next time.",
  },
];

const RiderLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname;

  const handleSuccess = (session: AuthSession) => {
    const fallback = session.profile.role === "driver" ? "/driver/profile" : "/rider/profile";
    navigate(from ?? fallback, { replace: true });
  };

  return (
    <AuthLayout
      variant="rider"
      eyebrow="Rider access"
      title="Log in to continue your shared journeys"
      subtitle="Manage bookings, track taxi availability, and stay in sync with community rides across the Darjeeling hills."
      supportCta={{ label: "Contact support", href: "mailto:care@himal.app" }}
    >
      <div className="space-y-8">
        <LoginForm role="rider" onSuccess={handleSuccess} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <div className="flex items-center gap-3">
            <span>New to Himal Nagrik?</span>
          </div>
          <Button
            variant="outline"
            className="border-emerald-300/40 bg-transparent text-emerald-100 hover:bg-emerald-400/10"
            onClick={() => navigate("/signup")}
          >
            Create rider account
          </Button>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/40">
            Why riders love Himal Nagrik
          </p>
          <div className="mt-4 space-y-4">
            {riderHighlights.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <div className="flex items-center gap-3">
            <ArrowRight className="h-4 w-4" />
            <span>Are you a driver?</span>
          </div>
          <Button variant="outline" className="border-emerald-300/40 bg-transparent text-emerald-100 hover:bg-emerald-500/10" onClick={() => navigate("/driver/login")}
          >
            Driver sign-in
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default RiderLoginPage;


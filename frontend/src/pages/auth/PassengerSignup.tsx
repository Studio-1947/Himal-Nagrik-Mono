import { CalendarClock, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import { Button } from "@/components/ui/button";
import type { AuthSession } from "@/lib/auth-service";

const passengerHighlights = [
  {
    icon: MapPin,
    title: "Trusted hill routes",
    description:
      "Browse verified shared jeeps and reserve seats before the rush.",
  },
  {
    icon: CalendarClock,
    title: "Live schedules",
    description: "Track departures, delays, and weather alerts in real time.",
  },
  {
    icon: Users,
    title: "Local community",
    description:
      "Ride with drivers and co-travellers who know the terrain inside out.",
  },
];

const PassengerSignupPage = () => {
  const navigate = useNavigate();

  const handleSuccess = (session: AuthSession) => {
    const fallback =
      session.profile.role === "driver"
        ? "/driver/profile"
        : "/passenger/profile";
    navigate(fallback, { replace: true });
  };

  return (
    <AuthLayout
      eyebrow="Passenger onboarding"
      title="Create your Himal Nagrik account"
      subtitle="Plan reliable shared journeys across Darjeeling, Kalimpong, and Siliguri with status alerts and trusted drivers."
      supportCta={{ label: "Passenger help", href: "mailto:hello@himal.app" }}
    >
      <div className="space-y-8">
        <SignupForm role="passenger" onSuccess={handleSuccess} />

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/40">
            Why passengers choose Himal Nagrik
          </p>
          <div className="mt-4 space-y-4">
            {passengerHighlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <div className="flex items-center gap-3">
            <span>Already have an account?</span>
          </div>
          <Button
            variant="outline"
            className="border-emerald-300/40 bg-transparent text-emerald-100 hover:bg-emerald-400/10"
            onClick={() => navigate("/login")}
          >
            Passenger sign-in
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default PassengerSignupPage;

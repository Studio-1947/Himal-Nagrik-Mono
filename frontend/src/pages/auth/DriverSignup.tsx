import { CalendarClock, CarFront, Gauge, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import { Button } from "@/components/ui/button";
import type { AuthSession } from "@/lib/auth-service";

const driverHighlights = [
  {
    icon: CarFront,
    title: "Verified fleet",
    description:
      "Showcase your routes, seat capacity, and permits to trusted passengers.",
  },
  {
    icon: Gauge,
    title: "Performance pulse",
    description:
      "Track completion rate, passenger feedback, and seat fill at a glance.",
  },
  {
    icon: ListChecks,
    title: "Proactive compliance",
    description:
      "Get reminders for renewals, weather advisories, and checkpoint updates.",
  },
];

const DriverSignupPage = () => {
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
      variant="driver"
      eyebrow="Driver onboarding"
      title="Join the Himal Nagrik driver network"
      subtitle="Manage ride demand, keep co-operatives updated, and stay in sync with dispatch across the hills."
      supportCta={{ label: "Driver support", href: "mailto:drivers@himal.app" }}
    >
      <div className="space-y-8">
        <SignupForm role="driver" onSuccess={handleSuccess} />

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/40">
            Built for professional hill drivers
          </p>
          <div className="mt-4 space-y-4">
            {driverHighlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
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
            <span>Already part of the network?</span>
          </div>
          <Button
            variant="outline"
            className="border-amber-300/40 bg-transparent text-amber-100 hover:bg-amber-400/10"
            onClick={() => navigate("/driver/login")}
          >
            Driver sign-in
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default DriverSignupPage;

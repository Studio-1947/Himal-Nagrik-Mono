import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import heroTaxiImage from "@/assets/hero-taxi.jpg";
import { cn } from "@/lib/utils";

export type AuthLayoutVariant = "passenger" | "driver";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  eyebrow?: string;
  variant?: AuthLayoutVariant;
  supportCta?: {
    label: string;
    href: string;
  };
}

const variantStyles: Record<
  AuthLayoutVariant,
  { badge: string; glow: string; shadow: string }
> = {
  passenger: {
    badge: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
    glow: "from-emerald-500/20 via-sky-500/10 to-transparent",
    shadow: "shadow-[0_30px_90px_rgba(16,185,129,0.22)]",
  },
  driver: {
    badge: "border-amber-400/60 bg-amber-400/10 text-amber-200",
    glow: "from-amber-400/25 via-orange-500/10 to-transparent",
    shadow: "shadow-[0_30px_90px_rgba(234,179,8,0.22)]",
  },
};

export const AuthLayout = ({
  children,
  title,
  subtitle,
  eyebrow,
  variant = "passenger",
  supportCta,
}: AuthLayoutProps) => {
  const styles = variantStyles[variant];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <img
          src={heroTaxiImage}
          alt="Darjeeling taxi weaving through the hills"
          className="h-full w-full object-cover opacity-[0.12]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900" />
        <div
          className={cn(
            "pointer-events-none absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full blur-3xl",
            `bg-gradient-to-br ${styles.glow}`
          )}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden w-full flex-1 flex-col justify-between border-r border-white/10 bg-gradient-to-b from-white/5 via-transparent to-transparent px-12 py-12 lg:flex">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-lg font-semibold"
            >
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                Himal Nagrik
              </span>
            </Link>
            <div className="mt-12 space-y-6">
              <h1 className="text-4xl font-semibold leading-tight text-white">
                Connecting the hills with
                <span className="ml-2 bg-gradient-to-r from-sky-400 to-emerald-300 bg-clip-text text-transparent">
                  shared journeys
                </span>
              </h1>
              <p className="max-w-md text-base text-slate-300">
                One place for passengers and drivers to manage their routes,
                schedules, and community travel in the Himalayas. Stay synced
                with the Darjeeling vibe wherever you drive or ride.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">
                Trusted network
              </p>
              <p className="mt-3 text-lg font-medium text-white">
                2,500+ daily travellers rely on Himal Nagrik
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">
                Mountain ready
              </p>
              <p className="mt-3 text-lg font-medium text-white">
                Weather alerts, live seat counts, and route insights
              </p>
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen w-full flex-1 items-center justify-center px-4 py-12 sm:px-8 lg:px-16">
          <div className="w-full max-w-xl space-y-8">
            <div>
              {eyebrow ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em]",
                    styles.badge
                  )}
                >
                  {eyebrow}
                </span>
              ) : null}
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </h2>
              <p className="mt-3 text-base text-slate-300 sm:text-lg">
                {subtitle}
              </p>
            </div>

            <div
              className={cn(
                "rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-xl",
                styles.shadow
              )}
            >
              {children}
            </div>

            {supportCta ? (
              <div className="text-sm text-slate-400">
                Need a hand?
                <Link
                  to={supportCta.href}
                  className="ml-2 inline-flex items-center gap-2 font-medium text-slate-200 hover:text-white"
                >
                  {supportCta.label}
                </Link>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
};

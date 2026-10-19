// app/choose-plan/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, ArrowRight } from "lucide-react";

import { useClientGate } from "../../hooks/useClientGate";
import { isOnboarded } from "../../lib/client-data";
import { createCheckoutSession } from "../../lib/dashboard-api";
import { PAYWALL_REDIRECT_KEY } from "../../components/dashboard/dashboard-guard";
import { brand } from "../../lib/tenant";

type FeatureRow = {
  label: string;
  helper?: string;
  trial: boolean;
  pro: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// `navy`/`purple` are tenant-driven brand identity colors. `navy2`/`ink`/
// `blue`/`cyan` are decorative gradient accents for this landing page only,
// not brand identity, so they stay fixed across tenants.
const BRAND = {
  navy: "var(--brand-primary)",
  navy2: "#0A1533",
  ink: "#060A18",
  blue: "#2F6BFF",
  cyan: "#35C7FF",
  purple: "var(--brand-accent)",
};

function AccessPill({
  variant,
}: {
  variant: "full" | "limited" | "not-included";
}) {
  if (variant === "full") {
    return (
      <div className="flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-900">
          Full access
        </span>
      </div>
    );
  }

  if (variant === "limited") {
    return (
      <div className="flex items-center justify-center">
        <span className="text-sm font-medium text-slate-600">Limited</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <span className="text-sm font-medium text-slate-400">Not included</span>
    </div>
  );
}

function LogoSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 500);
    const t2 = setTimeout(() => setPhase("out"), 1500);
    const t3 = setTimeout(() => onDone(), 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `
          radial-gradient(circle at 30% 30%, rgba(47,107,255,0.12), transparent 55%),
          radial-gradient(circle at 70% 70%, rgba(168,85,247,0.12), transparent 55%),
          #ffffff
        `,
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.6s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes logoEnter {
          0% {
            transform: scale(0.95);
            opacity: 0;
            filter: blur(8px);
          }
          100% {
            transform: scale(1);
            opacity: 1;
            filter: blur(0);
          }
        }

        @keyframes logoPulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes glowPulse {
          0%   { opacity: 0.4; transform: scale(0.9); }
          50%  { opacity: 0.7; transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.9); }
        }
      `}</style>

      <div className="relative flex items-center justify-center">
        {/* Soft glowing aura */}
        <div
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(47,107,255,0.25), rgba(168,85,247,0.15), transparent 70%)",
            animation: "glowPulse 2.2s ease-in-out infinite",
            filter: "blur(12px)",
          }}
        />

        {/* Secondary subtle glow */}
        <div
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(53,199,255,0.25), transparent 70%)",
            animation: "glowPulse 2.6s ease-in-out infinite",
            filter: "blur(10px)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            animation: `
              logoEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              logoPulse 2.4s ease-in-out 0.35s infinite
            `,
          }}
        >
          <img
            src={brand.logo.dark}
            alt={brand.name}
            style={{
              width: brand.logoClassName ? 168 : 220,
              height: brand.logoClassName ? 32 : 68,
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function ChoosePlanPage() {
  const router = useRouter();
  const { ready, auth, sub } = useClientGate();
  const [splashDone, setSplashDone] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [trialUpgrading, setTrialUpgrading] = useState(false);
  const [proUpgrading, setProUpgrading] = useState(false);

  // Reveal content right after splash exits
  const handleSplashDone = React.useCallback(() => {
    setSplashDone(true);
    // small rAF delay so the browser paints before starting the fade-in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setContentVisible(true));
    });
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!auth.loggedIn) {
      router.replace("/");
      return;
    }

    if (!isOnboarded()) {
      router.replace("/onboarding");
      return;
    }

    // DashboardGuard just sent us here because the API reported no
    // subscription. Do not bounce back to /dashboard on a stale local
    // "trialing" mock - that is what caused the loading-screen loop.
    let fromPaywallGuard = false;
    try {
      fromPaywallGuard = !!sessionStorage.getItem(PAYWALL_REDIRECT_KEY);
      if (fromPaywallGuard) {
        sessionStorage.removeItem(PAYWALL_REDIRECT_KEY);
      }
    } catch {
      /* noop */
    }

    if (
      !fromPaywallGuard &&
      (sub.status === "trialing" || sub.status === "active")
    ) {
      router.replace("/dashboard");
      return;
    }
  }, [ready, auth, sub, router]);

  async function startTrial(): Promise<void> {
    setTrialUpgrading(true);
    try {
      const result = await createCheckoutSession("trial");
      if (result?.url) {
        window.location.href = result.url;
      } else {
        setTrialUpgrading(false);
      }
    } catch {
      setTrialUpgrading(false);
    }
  }

  async function goProNow(): Promise<void> {
    setProUpgrading(true);
    try {
      const result = await createCheckoutSession("pro");
      if (result?.url) {
        window.location.href = result.url;
      } else {
        setProUpgrading(false);
      }
    } catch {
      setProUpgrading(false);
    }
  }

  const rows: FeatureRow[] = useMemo(
    () => [
      {
        label: "Dashboard access",
        helper: "Explore the dashboard experience and core tracking views.",
        trial: true,
        pro: true,
      },
      {
        label: "Clarity call",
        helper:
          `A one-on-one session with a ${brand.name} Advisor to understand your goals and set a clear path.`,
        trial: true,
        pro: true,
      },
      {
        label: "Portfolio tracking and performance insights",
        helper: "Monitor allocations, performance snapshots, and key changes.",
        trial: true,
        pro: true,
      },
      {
        label: "Financial health scan and baseline score",
        helper: "Capture your starting point and your key gaps.",
        trial: true,
        pro: true,
      },
      {
        label: "Goals and roadmap builder",
        helper: "Turn goals into clear milestones and a structured plan.",
        trial: true,
        pro: true,
      },
      {
        label: "Continuous portfolio intelligence",
        helper: "Highlights risks and opportunities as your data changes.",
        trial: true,
        pro: true,
      },
      {
        label: "Two advisory sessions per year",
        helper: `Direct sessions with a certified ${brand.name} Advisor.`,
        trial: false,
        pro: true,
      },
      {
        label: "Quarterly progress reviews",
        helper: "Structured reviews with tailored recommendations.",
        trial: false,
        pro: true,
      },
      {
        label: "Monthly accountability check-ins",
        helper: "Lightweight check-ins to keep momentum and clarity.",
        trial: false,
        pro: true,
      },
      {
        label: "Priority email and WhatsApp support",
        helper: "Faster response times and guided follow ups.",
        trial: false,
        pro: true,
      },
      {
        label: "Member webinars and masterclasses",
        helper: "Learning sessions and partner benefits.",
        trial: false,
        pro: true,
      },
    ],
    [],
  );

  const trialVariant = (r: FeatureRow): "full" | "limited" | "not-included" => {
    if (r.trial) return "limited";
    return "not-included";
  };

  const proVariant = (r: FeatureRow): "full" | "limited" | "not-included" => {
    if (r.pro) return "full";
    return "not-included";
  };

  return (
    <>
      {/* Keyframes for staggered content reveal */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .reveal-content {
          opacity: 0;
        }
        .reveal-content.visible {
          animation: fadeSlideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .reveal-content.visible.delay-1 { animation-delay: 0.05s; }
        .reveal-content.visible.delay-2 { animation-delay: 0.13s; }
        .reveal-content.visible.delay-3 { animation-delay: 0.21s; }
      `}</style>

      {/* Splash */}
      {!splashDone && <LogoSplash onDone={handleSplashDone} />}

      {/* Page content — hidden until splash exits */}
      <div
        style={{
          visibility: splashDone ? "visible" : "hidden",
        }}
        className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className={cn(
              "absolute left-1/2 top-10 -translate-x-1/2 rounded-full blur-3xl opacity-25",
              "h-104 w-104 sm:h-128 sm:w-lg md:h-144 md:w-xl",
            )}
            style={{
              background: `radial-gradient(circle at 30% 30%, ${BRAND.cyan}, transparent 55%),
                           radial-gradient(circle at 70% 70%, ${BRAND.purple}, transparent 55%),
                           radial-gradient(circle at 40% 80%, ${BRAND.blue}, transparent 60%)`,
            }}
          />
        </div>

        {/* Header */}
        <div
          className={cn(
            "text-center reveal-content delay-1",
            contentVisible && "visible",
          )}
        >
          <p
            className="text-xs font-semibold tracking-[0.18em]"
            style={{ color: BRAND.navy }}
          >
            PLANS
          </p>

          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Start free, or go Pro now
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            Trial gives you limited access to explore the dashboard. Pro gives
            you full access plus advisory support, reviews, and accountability.
          </p>
        </div>

        {/* Comparison table / cards */}
        <div
          className={cn(
            "mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm reveal-content delay-2",
            contentVisible && "visible",
          )}
        >
          {/* MOBILE */}
          <div className="block sm:hidden">
            <div className="border-b border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900">
                What you get
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Trial is 7 days. Pro is billed annually at $300.
              </p>
            </div>

            <div className="grid gap-4 p-5">
              {/* Trial card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                  FREE TRIAL
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  Core Trial
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-semibold text-slate-900">
                    $0
                  </span>
                  <span className="pb-1 text-xs text-slate-500">
                    for 7 days
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Limited access to explore the dashboard and key tracking.
                </p>

                <button
                  type="button"
                  onClick={startTrial}
                  disabled={trialUpgrading}
                  className={cn(
                    "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
                    "text-slate-600 font-semibold border border-slate-200 bg-white",
                    "transition-transform hover:bg-slate-50 active:translate-y-0",
                    trialUpgrading && "opacity-70 cursor-not-allowed",
                  )}
                >
                  {trialUpgrading ? "Starting trial…" : "Start free trial"}
                  {!trialUpgrading && <ArrowRight className="h-4 w-4" />}
                </button>

                <p className="mt-2 text-center text-xs text-slate-500">
                  7 days. No payment now.
                </p>
              </div>

              {/* Pro card */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
                <div
                  className="absolute inset-0 z-0 opacity-[0.14]"
                  style={{
                    background: `radial-gradient(circle at 30% 20%, ${BRAND.cyan}, transparent 55%),
                                 radial-gradient(circle at 70% 60%, ${BRAND.purple}, transparent 55%),
                                 radial-gradient(circle at 40% 90%, ${BRAND.blue}, transparent 60%)`,
                  }}
                />

                <div className="relative z-10">
                  <p
                    className="text-xs font-semibold tracking-[0.18em]"
                    style={{ color: BRAND.navy }}
                  >
                    FULL ACCESS
                  </p>

                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    Core Full Access
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl font-semibold text-slate-900">
                      $300
                    </span>
                    <span className="pb-1 text-xs text-slate-500">
                      USD / year
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Full access to everything in the dashboard, plus advisory
                    and structured reviews.
                  </p>

                  <button
                    type="button"
                    onClick={goProNow}
                    disabled={proUpgrading}
                    className={cn(
                      "mt-4 relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
                      "text-white font-semibold shadow-sm",
                      "transition-transform translate-y-px active:translate-y-1",
                      proUpgrading && "opacity-70 cursor-not-allowed",
                    )}
                    style={{
                      background: `linear-gradient(90deg, ${BRAND.navy} 0%, ${BRAND.navy2} 60%, ${BRAND.ink} 100%)`,
                    }}
                  >
                    {proUpgrading ? "Processing…" : "Go Pro now"}
                    {!proUpgrading && <ArrowRight className="h-4 w-4" />}
                  </button>

                  <p className="mt-2 text-center text-xs text-slate-500">
                    Billed annually at $300.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200">
              {rows.map((r) => (
                <div key={r.label} className="border-t border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 inline-flex items-center justify-center rounded-full p-0.5 ring-1"
                      style={{
                        backgroundColor: "rgba(11,16,42,0.04)",
                        borderColor: "rgba(11,16,42,0.10)",
                      }}
                    >
                      <Info className="h-4 w-4" style={{ color: BRAND.navy }} />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{r.label}</p>
                      {r.helper ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {r.helper}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
                        TRIAL
                      </p>
                      <div className="mt-2">
                        {r.label === "Clarity call" ? (
                          <span className="text-sm font-semibold text-slate-900">
                            Included
                          </span>
                        ) : (
                          <AccessPill variant={trialVariant(r)} />
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p
                        className="text-xs font-semibold tracking-[0.12em]"
                        style={{ color: BRAND.navy }}
                      >
                        PRO
                      </p>
                      <div className="mt-2">
                        {r.label === "Clarity call" ? (
                          <span className="text-sm font-semibold text-slate-900">
                            Included
                          </span>
                        ) : (
                          <AccessPill variant={proVariant(r)} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 bg-slate-50/60 p-5">
              <p className="text-sm text-slate-600">
                Start with the trial if you want to explore. Go Pro if you want
                advisory support and structured progress reviews immediately.
              </p>
            </div>
          </div>

          {/* DESKTOP */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-[1.25fr_1fr_1fr] gap-0 border-b border-slate-200">
              <div className="p-5 sm:p-6">
                <p className="text-sm font-semibold text-slate-900">
                  What you get
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Trial is 7 days. Pro is billed annually at $300.
                </p>
              </div>

              <div className="border-l border-slate-200 p-5 sm:p-6">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                  FREE TRIAL
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  Core Trial
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-semibold text-slate-900">
                    $0
                  </span>
                  <span className="pb-1 text-xs text-slate-500">
                    for 7 days
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Limited access to explore the dashboard and key tracking.
                </p>
              </div>

              <div className="relative border-l border-slate-200 p-5 sm:p-6">
                <div
                  className="absolute inset-0 z-0 opacity-[0.14]"
                  style={{
                    background: `radial-gradient(circle at 30% 20%, ${BRAND.cyan}, transparent 55%),
                                 radial-gradient(circle at 70% 60%, ${BRAND.purple}, transparent 55%),
                                 radial-gradient(circle at 40% 90%, ${BRAND.blue}, transparent 60%)`,
                  }}
                />
                <div className="relative z-10">
                  <p
                    className="text-xs font-semibold tracking-[0.18em]"
                    style={{ color: BRAND.navy }}
                  >
                    FULL ACCESS
                  </p>

                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    Core Full Access
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl font-semibold text-slate-900">
                      $300
                    </span>
                    <span className="pb-1 text-xs text-slate-500">
                      USD / year
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Full access to everything in the dashboard, plus advisory
                    and structured reviews.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[1.25fr_1fr_1fr] gap-0"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 inline-flex items-center justify-center rounded-full p-0.5 ring-1"
                        style={{
                          backgroundColor: "rgba(11,16,42,0.04)",
                          borderColor: "rgba(11,16,42,0.10)",
                        }}
                      >
                        <Info
                          className="h-4 w-4"
                          style={{ color: BRAND.navy }}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {r.label}
                        </p>
                        {r.helper ? (
                          <p className="mt-1 text-sm text-slate-600">
                            {r.helper}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="border-l border-slate-200 p-5 sm:p-6">
                    {r.label === "Clarity call" ? (
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-semibold text-slate-900">
                          Included
                        </span>
                      </div>
                    ) : (
                      <AccessPill variant={trialVariant(r)} />
                    )}
                  </div>

                  <div className="border-l border-slate-200 p-5 sm:p-6">
                    {r.label === "Clarity call" ? (
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-semibold text-slate-900">
                          Included
                        </span>
                      </div>
                    ) : (
                      <AccessPill variant={proVariant(r)} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1.25fr_1fr_1fr] gap-0 border-t border-slate-200 bg-slate-50/60">
              <div className="p-5 sm:p-6">
                <p className="text-sm text-slate-600">
                  Start with the trial if you want to explore. Go Pro if you
                  want advisory support and structured progress reviews
                  immediately.
                </p>
              </div>

              <div className="border-l border-slate-200 p-5 sm:p-6">
                <button
                  type="button"
                  onClick={startTrial}
                  disabled={trialUpgrading}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
                    "text-slate-600 font-semibold border border-slate-200 bg-white",
                    "transition-transform hover:bg-slate-50 active:translate-y-0",
                    trialUpgrading && "opacity-70 cursor-not-allowed",
                  )}
                >
                  {trialUpgrading ? "Starting trial…" : "Start free trial"}
                  {!trialUpgrading && <ArrowRight className="h-4 w-4" />}
                </button>

                <p className="mt-2 text-center text-xs text-slate-500">
                  7 days. No payment now.
                </p>
              </div>

              <div className="border-l border-slate-200 p-5 sm:p-6">
                <button
                  type="button"
                  onClick={goProNow}
                  disabled={proUpgrading}
                  className={cn(
                    "relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
                    "text-white font-semibold shadow-sm",
                    "transition-transform translate-y-px active:translate-y-1",
                    proUpgrading && "opacity-70 cursor-not-allowed",
                  )}
                  style={{
                    background: `linear-gradient(90deg, ${BRAND.navy} 0%, ${BRAND.navy2} 60%, ${BRAND.ink} 100%)`,
                  }}
                >
                  {proUpgrading ? "Processing…" : "Go Pro now"}
                  {!proUpgrading && <ArrowRight className="h-4 w-4" />}
                </button>

                <p className="mt-2 text-center text-xs text-slate-500">
                  Billed annually at $300.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coaching strip */}
        <div
          className={cn(
            "mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm reveal-content delay-3",
            contentVisible && "visible",
          )}
        >
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                Still unsure?
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Take the $100 Financial Coaching session to get aligned, clarify
                your goals, and choose the right path.
              </p>
            </div>

            <a
              href={brand.marketingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3",
                "font-semibold text-white shadow-sm",
                "transition-transform hover:-translate-y-px active:translate-y-0",
              )}
              style={{
                background: `linear-gradient(90deg, ${BRAND.navy} 0%, ${BRAND.navy2} 60%, ${BRAND.ink} 100%)`,
              }}
            >
              Get coaching ($100)
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <p
          className={cn(
            "mx-auto mt-6 max-w-3xl text-center text-xs text-slate-500 reveal-content delay-3",
            contentVisible && "visible",
          )}
        >
          Trial shows limited access. Pro shows full access.
        </p>
      </div>
    </>
  );
}

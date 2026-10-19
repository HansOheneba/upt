"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import LightRays from "@/components/light-rays";
import { brand } from "@/lib/tenant";

interface Step8CompleteProps {
  /** display_name — works for solo (full name) and partner/family (household name) */
  displayName: string;
  goalCount: number;
  totalIncome: number;
  /**
   * Where the CTA sends the user next. Invited users (who typically already
   * have a subscription) skip the plan-picker and go straight to /dashboard -
   * DashboardGuard still verifies their real subscription status there.
   */
  nextHref?: string;
  ctaLabel?: string;
}

export function Step8Complete({
  displayName,
  goalCount,
  totalIncome,
  nextHref = "/choose-plan",
  ctaLabel = "Choose your plan",
}: Step8CompleteProps) {
  const router = useRouter();

  function handleCta() {
    router.push(nextHref);
  }

  useEffect(() => {
    // subtle confetti burst
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const STATS = [
    { label: "Goals set", value: goalCount.toString() },
    {
      label: "Monthly income",
      value: `$${totalIncome.toLocaleString()}`,
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--brand-primary)] px-4 py-12 text-center">
      {/* Animated light rays background */}
      <div className="pointer-events-none absolute inset-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={0.2}
          lightSpread={2}
          rayLength={1.5}
          pulsating
          fadeDistance={1.9}
          saturation={1}
          followMouse={false}
          mouseInfluence={0.1}
          noiseAmount={0}
          distortion={0}
        />
      </div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, transform: "translateY(12px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.4 }}
        className="relative z-10 space-y-3 max-w-md"
      >
        <h1 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">
          You're all set, <span className="text-blue-300">{displayName}</span>
        </h1>

        <p className="text-white/70 text-base sm:text-lg leading-relaxed">
          Your dashboard is ready. You can now see your net worth, track your
          finances, and get a clear view of where you stand.
        </p>
      </motion.div>

      {/* Stats */}
      {/* <motion.div
        initial={{ opacity: 0, transform: "translateY(16px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-10 grid grid-cols-2 gap-4 w-full max-w-sm"
      >
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-100 bg-white p-4"
          >
            <p className="text-xl sm:text-2xl font-semibold text-primary">
              {s.value}
            </p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div> */}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, transform: "translateY(16px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="relative z-10 mt-10 w-full max-w-sm"
      >
        <Button
          type="button"
          onClick={handleCta}
          className="w-full bg-white hover:bg-white/90 text-[var(--brand-primary)] h-12 text-base rounded-xl"
        >
          {ctaLabel}
        </Button>

        <p className="mt-3 text-xs text-white/50">
          You can update your information anytime from your settings
        </p>
      </motion.div>

      {/* Logo */}
      <div className="relative z-10 mt-12 opacity-70">
        <Image
          src={brand.logo.light}
          alt={brand.name}
          width={180}
          height={56}
          className={brand.logoClassName?.wordmark ?? "h-10 w-auto object-contain"}
        />
      </div>
    </div>
  );
}

"use client";

// components/onboarding/onboarding-shell.tsx
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { brand } from "@/lib/tenant";

const STEP_LABELS: Record<number, string> = {
  1: "Account Setup",
  2: "Personal Info",
  3: "Your Goals",
  4: "Income",
  5: "Expenses",
  6: "Emergency Fund",
  7: "Retirement",
  8: "Review",
  9: "All Done",
};

// Map each step to one of the named stages shown in the indicator
const STAGES = [
  { label: "Account", steps: [1] },
  { label: "Profile", steps: [2] },
  { label: "Finances", steps: [3, 4, 5, 6, 7] },
  { label: "Review", steps: [8, 9] },
];

/* ─── Premium Splash Loader ───────────────────────────────────── */
function OnboardingSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 1100);
    const t3 = setTimeout(() => onDone(), 1500);

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
        transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes logoEnter {
          0% { transform: scale(0.95); opacity: 0; filter: blur(6px); }
          100% { transform: scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes logoPulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes glowPulse {
          0%   { opacity: 0.4; transform: scale(0.9); }
          50%  { opacity: 0.7; transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.9); }
        }
      `}</style>

      <div className="relative flex items-center justify-center">
        <div
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(47,107,255,0.25), rgba(168,85,247,0.15), transparent 70%)",
            animation: "glowPulse 2.2s ease-in-out infinite",
            filter: "blur(12px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(53,199,255,0.25), transparent 70%)",
            animation: "glowPulse 2.6s ease-in-out infinite",
            filter: "blur(10px)",
          }}
        />
        <div
          style={{
            animation: `
              logoEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              logoPulse 2.2s ease-in-out 0.35s infinite
            `,
          }}
        >
          <Image
            src={brand.logo.dark}
            alt={brand.name}
            width={220}
            height={68}
            priority
            className={brand.logoClassName?.wordmark ?? "h-14 w-auto object-contain"}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Step Indicator ─────────────────────────────────────────── */
export type OnboardingStage = { label: string; steps: number[] };

function StepIndicator({
  currentStep,
  stages,
}: {
  currentStep: number;
  stages: OnboardingStage[];
}) {
  // Find which stage the current step belongs to
  const currentStageIndex = stages.findIndex((s) =>
    s.steps.includes(currentStep),
  );

  return (
    <div className="flex items-center justify-center gap-0">
      {stages.map((stage, i) => {
        const isCompleted = i < currentStageIndex;
        const isActive = i === currentStageIndex;

        return (
          <React.Fragment key={stage.label}>
            {/* Node */}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted
                    ? "var(--brand-primary)"
                    : isActive
                      ? "var(--brand-primary)"
                      : "transparent",
                  borderColor: isCompleted || isActive ? "var(--brand-primary)" : "#d1d5db",
                  scale: isActive ? 1.08 : 1,
                }}
                transition={{ duration: 0.25 }}
                className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2"
              >
                {isCompleted ? (
                  <motion.svg
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] as const }}
                    width="12"
                    height="12"
                    className="sm:w-3.5 sm:h-3.5"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M2.5 7L5.5 10L11.5 4"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                ) : (
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      isActive ? "text-white" : "text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
              </motion.div>

              {/* Label */}
              <span
                className={`text-xs font-medium transition-colors duration-200 ${
                  isCompleted || isActive ? "text-slate-800" : "text-gray-400"
                }`}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector line between nodes */}
            {i < stages.length - 1 && (
              <div className="relative mx-1 sm:mx-2 mb-5 h-0.5 w-8 sm:w-16 md:w-24 bg-gray-200 overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: isCompleted ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="absolute inset-y-0 left-0 bg-slate-800"
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Main Shell ─────────────────────────────────────────────── */
interface OnboardingShellProps {
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
  stages?: OnboardingStage[];
}

export function OnboardingShell({
  currentStep,
  totalSteps,
  children,
  stages = STAGES,
}: OnboardingShellProps) {
  const [splashDone, setSplashDone] = useState(false);

  // Step 9 (Complete) bypasses shell
  if (currentStep === 9) {
    return <>{children}</>;
  }

  return (
    <>
      {!splashDone && <OnboardingSplash onDone={() => setSplashDone(true)} />}

      <div
        style={{
          visibility: splashDone ? "visible" : "hidden",
          background: `
      radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 32%),
      radial-gradient(circle at top right, rgba(168,85,247,0.14), transparent 30%),
      radial-gradient(circle at bottom left, rgba(14,165,233,0.12), transparent 28%),
      radial-gradient(circle at bottom right, rgba(99,102,241,0.14), transparent 35%),
      linear-gradient(
        135deg,
        #f8fafc 0%,
        #f1f5f9 35%,
        #eef2ff 65%,
        #f8fafc 100%
      )
    `,
        }}
        className="relative flex min-h-svh flex-col overflow-x-hidden"
      >
        {/* ── Ambient blur + grid texture ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Grid texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, #0f172a 1px, transparent 1px),
                linear-gradient(to bottom, #0f172a 1px, transparent 1px)
              `,
              backgroundSize: "48px 48px",
            }}
          />
          {/* Floating orbs */}
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute top-1/3 -right-32 h-112 w-md rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        {/* ── Top Bar ───────────────── */}
        <header className="pt-8 pb-6">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 sm:px-6">
            <Image
              src={brand.logo.dark}
              alt={brand.name}
              width={220}
              height={68}
              priority
              className={brand.logoClassName?.wordmark ?? "h-14 w-auto object-contain"}
            />

            <StepIndicator currentStep={currentStep} stages={stages} />
          </div>
        </header>

        {/* ── Content ───────────────── */}
        <main className="flex flex-1 justify-center items-start md:items-center px-4 pt-4 pb-10 sm:px-6">
          <div
            className="
              w-full
              max-w-2xl
              rounded-3xl
              border
              border-white/40
              bg-white/70
              backdrop-blur-xl
              shadow-[0_20px_80px_rgba(15,23,42,0.08)]
              p-6
              sm:p-8
            "
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, transform: "translateX(28px)" }}
                animate={{ opacity: 1, transform: "translateX(0px)" }}
                exit={{ opacity: 0, transform: "translateX(-28px)" }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] as const }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}

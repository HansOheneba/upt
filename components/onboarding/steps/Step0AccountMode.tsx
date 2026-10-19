"use client";

// components/onboarding/steps/Step0AccountMode.tsx
import React from "react";
import { motion } from "framer-motion";
import { User, Users, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountMode } from "@/lib/onboarding/copy";

interface AccountModeOption {
  value: AccountMode;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const OPTIONS: AccountModeOption[] = [
  {
    value: "solo",
    icon: <User className="h-6 w-6" />,
    label: "Solo",
    description: "I am setting this up for myself.",
  },
  {
    value: "partner",
    icon: <Users className="h-6 w-6" />,
    label: "Partner",
    description: "We are managing our finances together.",
  },
  {
    value: "family",
    icon: <Home className="h-6 w-6" />,
    label: "My family",
    description: "This covers our whole household, including dependants.",
  },
];

interface Step0AccountModeProps {
  defaultValue?: AccountMode;
  onComplete: (mode: AccountMode) => void;
}

export function Step0AccountMode({
  defaultValue = "solo",
  onComplete,
}: Step0AccountModeProps) {
  const [selected, setSelected] = React.useState<AccountMode>(defaultValue);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
          Who are you setting this up for?
        </h1>
        <p className="mt-2 text-slate-500 text-sm sm:text-base">
          We will personalise everything to fit your situation.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          You can change this later.
        </p>
      </div>

      {/* Option cards */}
      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(opt.value)}
            className={cn(
              "w-full rounded-2xl border p-5 text-left transition-[color,background-color,border-color,box-shadow,transform] duration-160 ease-out flex items-center gap-4 cursor-pointer",
              selected === opt.value
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-md shadow-sm",
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                selected === opt.value
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {opt.icon}
            </div>

            <div>
              <p className="font-semibold text-slate-900">{opt.label}</p>
              <p className="text-sm text-slate-500 mt-0.5">{opt.description}</p>
            </div>

            {/* Selection indicator */}
            <div className="ml-auto">
              <div
                className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  selected === opt.value
                    ? "border-primary bg-primary"
                    : "border-slate-300",
                )}
              >
                {selected === opt.value && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Continue button */}
      <Button
        type="button"
        className="w-full gap-2 h-12 bg-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] text-white rounded-xl"
        onClick={() => onComplete(selected)}
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

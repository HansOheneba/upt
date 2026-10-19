// components/services/ServiceInquiryDialog.tsx
"use client";

import * as React from "react";

import { getUserFullName } from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ConciergeService = {
  id: string;
  title: string;
  subtitle?: string;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;

  preferredContact: "WhatsApp" | "Email" | "Phone call";
  timeframe: "ASAP" | "This week" | "This month" | "Flexible";
  country: string;

  goal: string;
  context: string;

  // custom-only (kept minimal + 2-step UI)
  customTopic: string;
};

type ServiceInquiryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ConciergeService | null;

  onSubmit?: (payload: {
    service: ConciergeService;
    fullName: string;
    email: string;
    phone: string;
    preferredContact: FormState["preferredContact"];
    timeframe: FormState["timeframe"];
    country: string;
    goal: string;
    context: string;

    custom?: {
      topic: string;
    };
  }) => Promise<void> | void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isCustom(service: ConciergeService | null): boolean {
  return service?.id === "custom";
}

// NOTE: we are returning a placeholder hint for context, not a value
function buildSmartPrefill(service: ConciergeService | null): {
  goal?: string;
  contextPlaceholder?: string;
} {
  if (!service) return {};

  const baseGoal =
    service.id === "tax"
      ? "I want clarity on my tax exposure and a plan for the next filing cycle."
      : service.id === "debt"
        ? "I want a payoff plan that reduces stress and improves monthly flexibility."
        : service.id === "budget"
          ? "I want a simple monthly plan I can follow without micromanaging."
          : service.id === "savings"
            ? "I want to build an emergency fund and a savings routine that sticks."
            : service.id === "investing"
              ? "I want a sensible investing setup aligned to my timeline and risk."
              : service.id === "property"
                ? "I want clarity on a property decision and the numbers behind it."
                : "I want a clear plan for one specific outcome.";

  const contextHint =
    service.id === "tax"
      ? "Tax jurisdiction(s), income sources (employment, business, investments), and any deadlines."
      : service.id === "debt"
        ? "List debts (type, balance, interest, monthly payment) and what you can comfortably pay monthly."
        : service.id === "budget"
          ? "Monthly income, fixed expenses, and the one area you want to control most."
          : service.id === "savings"
            ? "Monthly essentials, current savings, and your target emergency fund if you have one."
            : service.id === "investing"
              ? "Timeline, risk comfort, current investments (if any), and what you want investing to achieve."
              : service.id === "property"
                ? "Location, what the decision is (buy/sell/rent/finance/strategy), and any constraints."
                : "Share any context that will help us match you correctly.";

  return {
    goal: baseGoal,
    contextPlaceholder: `Notes:\n- ${contextHint}\n`,
  };
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

type Step = 1 | 2;

export function ServiceInquiryDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
}: ServiceInquiryDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState<Step>(1);

  const custom = isCustom(service);
  const user = useFinancialStore((s) => s.user);

  const knownDefaults: Pick<
    FormState,
    "fullName" | "email" | "phone" | "country"
  > = React.useMemo(
    () => ({
      fullName: getUserFullName(user ?? undefined),
      email: user?.email ?? "",
      phone: user?.phone_number ?? "",
      country: user?.resident_country ?? "",
    }),
    [user],
  );

  const [form, setForm] = React.useState<FormState>({
    ...knownDefaults,

    preferredContact: "WhatsApp",
    timeframe: "This week",

    goal: "",
    context: "",

    customTopic: "",
  });

  const [contextPlaceholder, setContextPlaceholder] = React.useState(
    "Any details that help us match you well (you can keep it brief).",
  );

  React.useEffect(() => {
    if (!open || !service) return;

    // reset step whenever dialog opens with a service
    setStep(1);

    const prefill = buildSmartPrefill(service);

    setForm((prev) => {
      const next = { ...prev };

      const shouldPrefillGoal = next.goal.trim().length < 3;

      if (shouldPrefillGoal && prefill.goal) next.goal = prefill.goal;

      // if switching away from custom, clear custom topic (keeps things tidy)
      if (!isCustom(service)) next.customTopic = "";

      // IMPORTANT: we are NOT pre-filling `context` value anymore
      return next;
    });

    setContextPlaceholder(
      prefill.contextPlaceholder ??
        "Any details that help us match you well (you can keep it brief).",
    );
  }, [open, service]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const postSubmitTip =
    "After we receive your request, we will email you to confirm scope and request any further details we need.";

  const serviceHint =
    service?.id === "tax"
      ? "Include your tax jurisdiction(s) and any deadlines."
      : service?.id === "debt"
        ? "List each debt with balance, interest rate, and monthly payment."
        : service?.id === "budget"
          ? "Share monthly income and fixed expenses, then what you want to optimise."
          : service?.id === "savings"
            ? "Share monthly essentials and your emergency fund target if you have one."
            : service?.id === "investing"
              ? "Share your timeline and what you want investing to achieve."
              : service?.id === "property"
                ? "Share the location and what decision you are trying to make (buy/sell/rent/finance/strategy)."
                : custom
                  ? "Describe the outcome you want. Keep it simple."
                  : "";

  const tipLine = [serviceHint, postSubmitTip].filter(Boolean).join(" ");

  // fullName, email, phone, country are pre-filled from the user profile - always valid
  const step1Valid = Boolean(service);

  const step2Valid =
    form.goal.trim().length > 6 &&
    (!custom || form.customTopic.trim().length > 2);

  const canSubmit = Boolean(service) && step1Valid && step2Valid;

  function goNext() {
    if (!step1Valid) return;
    setStep(2);
  }

  function goBack() {
    setStep(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !canSubmit) return;

    setLoading(true);
    try {
      const payload = {
        service,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        preferredContact: form.preferredContact,
        timeframe: form.timeframe,
        country: form.country.trim(),
        goal: form.goal.trim(),
        context: form.context.trim(),
        ...(custom ? { custom: { topic: form.customTopic.trim() } } : {}),
      };

      console.log("Concierge request payload:", payload);

      await onSubmit?.(payload);

      setForm({
        ...knownDefaults,
        preferredContact: "Email",
        timeframe: "This week",
        goal: "",
        context: "",
        customTopic: "",
      });

      setStep(1);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-155 rounded-[22px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-neutral-900">
            {service ? "Request concierge support" : "Request a service"}
          </DialogTitle>
        </DialogHeader>

        {service && (
          <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
            <p className="text-xs tracking-[0.22em] text-neutral-500">
              SELECTED SERVICE
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {service.title}
            </p>
            {service.subtitle && (
              <p className="mt-1 text-xs leading-5 text-neutral-600">
                {service.subtitle}
              </p>
            )}
            <p className="mt-2 text-xs text-[#b07d3d]">{tipLine}</p>
          </div>
        )}

        {/* Step indicator (quiet, not tacky) */}
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <p>
            Step {step} of 2<span className="mx-2 text-neutral-300">•</span>
            <span className="text-neutral-600">
              {step === 1 ? "Your details" : "What you need"}
            </span>
          </p>
          {step === 2 ? (
            <button
              type="button"
              onClick={goBack}
              className="text-neutral-600 hover:text-neutral-900 hover:underline underline-offset-4"
            >
              Back
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-5">
          {step === 1 ? (
            <>
              {/* Read-only profile snapshot */}
              <div className="space-y-3 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                      Name
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-900">
                      {form.fullName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                      Phone
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-900">
                      {form.phone || (
                        <span className="italic text-neutral-400">Not set</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                      Email
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-900">
                      {form.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                      Country
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-900">
                      {form.country}
                    </p>
                  </div>
                </div>

                <p className="border-t border-black/5 pt-2 text-[11px] text-neutral-400">
                  Details pulled from your profile. Need to update them?{" "}
                  <a
                    href="/dashboard/account"
                    className="text-[#1a1856] underline underline-offset-4 hover:opacity-75"
                  >
                    Go to Settings
                  </a>
                  .
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred contact" htmlFor="preferredContact">
                  <select
                    id="preferredContact"
                    value={form.preferredContact}
                    onChange={(e) =>
                      update(
                        "preferredContact",
                        e.target.value as FormState["preferredContact"],
                      )
                    }
                    className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-neutral-900"
                  >
                    <option>WhatsApp</option>
                    <option>Email</option>
                    <option>Phone call</option>
                  </select>
                </Field>

                <Field label="Timeframe" htmlFor="timeframe">
                  <select
                    id="timeframe"
                    value={form.timeframe}
                    onChange={(e) =>
                      update(
                        "timeframe",
                        e.target.value as FormState["timeframe"],
                      )
                    }
                    className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-neutral-900"
                  >
                    <option>ASAP</option>
                    <option>This week</option>
                    <option>This month</option>
                    <option>Flexible</option>
                  </select>
                </Field>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={goNext}
                  disabled={!step1Valid}
                  className="rounded-full bg-[#1a1856] text-white hover:bg-[#1a1856]/90"
                >
                  Continue
                </Button>
              </div>

              {/* <p className="text-xs text-neutral-500">{postSubmitTip}</p> */}
            </>
          ) : (
            <>
              {custom ? (
                <Field label="Topic" htmlFor="customTopic">
                  <Input
                    id="customTopic"
                    value={form.customTopic}
                    onChange={(e) => update("customTopic", e.target.value)}
                    placeholder="What do you need help with?"
                  />
                </Field>
              ) : null}

              <Field label="What outcome do you want?" htmlFor="goal">
                <Input
                  id="goal"
                  value={form.goal}
                  onChange={(e) => update("goal", e.target.value)}
                  placeholder="One sentence outcome you want to achieve"
                />
              </Field>

              <Field label="Context (optional, but helpful)" htmlFor="context">
                <Textarea
                  id="context"
                  value={form.context}
                  onChange={(e) => update("context", e.target.value)}
                  placeholder={contextPlaceholder}
                  className="min-h-[120px]"
                />
              </Field>

              <div className="flex items-center justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBack}
                  className="rounded-full"
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="rounded-full bg-[#1a1856] text-white hover:bg-[#1a1856]/90"
                >
                  {loading ? "Sending..." : "Submit request"}
                </Button>
              </div>

              {/* <p className="text-xs text-neutral-500">{postSubmitTip}</p> */}
            </>
          )}

          {!service ? (
            <p className="text-xs text-neutral-500">
              Select a service first, then your details can be submitted.
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}

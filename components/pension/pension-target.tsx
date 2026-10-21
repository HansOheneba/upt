"use client";

import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatAmountTyping, finalizeAmountInput, formatGhs, parseAmountInput } from "@/lib/pension/metrics";
import { personalMembership } from "@/lib/pension/portfolio";
import { usePensionStore } from "@/store/pensionStore";

export function PensionTargetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const memberships = usePensionStore((state) => state.memberships);
  const personal = personalMembership(memberships);
  const updateTargets = usePensionStore((state) => state.updateTargets);
  if (!personal) return null;

  return (
    <TargetDialog
      open={open}
      onOpenChange={onOpenChange}
      targetPot={personal.targetPot && personal.targetPot > 0 ? personal.targetPot : 0}
      retirementAge={personal.retirementAge && personal.retirementAge > 0 ? personal.retirementAge : 60}
      onSave={(next) => {
        updateTargets(next);
        onOpenChange(false);
      }}
    />
  );
}

export function PensionTarget({
  targetPot,
  retirementAge,
  currentValue,
  variant = "full",
  schemeName,
}: {
  targetPot: number;
  retirementAge: number;
  currentValue: number | null;
  variant?: "full" | "aside";
  schemeName?: string;
}) {
  const updateTargets = usePensionStore((state) => state.updateTargets);
  const [open, setOpen] = useState(false);
  const hasTarget = Number.isFinite(targetPot) && targetPot > 0;
  const progress =
    hasTarget && currentValue != null
      ? Math.min(100, Math.round((currentValue / targetPot) * 100))
      : null;

  const dialog = (
    <TargetDialog
      open={open}
      onOpenChange={setOpen}
      targetPot={hasTarget ? targetPot : 0}
      retirementAge={retirementAge > 0 ? retirementAge : 60}
      onSave={(next) => {
        updateTargets(next);
        setOpen(false);
      }}
    />
  );

  if (variant === "aside") {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">Pension target</p>
          <Button
            type="button"
            variant="link"
            className="h-auto shrink-0 p-0 text-sm"
            onClick={() => setOpen(true)}
          >
            {hasTarget ? "Edit" : "Set target"}
          </Button>
        </div>
        {hasTarget ? (
          <>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {formatGhs(targetPot, 2)}
            </p>
            {retirementAge > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">By age {retirementAge}</p>
            ) : null}
            {progress != null ? (
              <div className="mt-3">
                <Progress value={progress} aria-label="Progress toward your pension target" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatGhs(currentValue ?? 0, 2)}
                  {schemeName ? ` in ${schemeName}` : " saved"} · {progress}%
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Set the amount you want in your pension and the age you plan to retire.
          </p>
        )}
        {dialog}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Pension target</p>
          {hasTarget ? (
            <>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                {formatGhs(targetPot, 2)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {retirementAge > 0
                  ? `The amount you set as your aim by age ${retirementAge}.`
                  : "The amount you set as your aim."}{" "}
                This is not a forecast of what your pension will be worth.
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Set the amount you want in your pension and the age you plan to retire.
            </p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Target aria-hidden className="size-4" />
          {hasTarget ? "Edit target" : "Set target"}
        </Button>
      </div>

      {hasTarget && progress != null ? (
        <div className="mt-3">
          <Progress value={progress} aria-label="Progress toward your pension target" />
          <p className="mt-2 text-sm text-muted-foreground">
            {formatGhs(currentValue ?? 0, 2)} of {formatGhs(targetPot, 2)} · {progress}%
          </p>
        </div>
      ) : null}

      {dialog}
    </div>
  );
}

function TargetDialog({
  open,
  onOpenChange,
  targetPot,
  retirementAge,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPot: number;
  retirementAge: number;
  onSave: (next: { targetPot: number; retirementAge: number }) => void;
}) {
  const [amount, setAmount] = useState(
    targetPot > 0 ? finalizeAmountInput(String(targetPot)) : "",
  );
  const [age, setAge] = useState(String(retirementAge));
  const [error, setError] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setAmount(targetPot > 0 ? finalizeAmountInput(String(targetPot)) : "");
      setAge(String(retirementAge));
      setError(null);
    }
    wasOpen.current = open;
  }, [open, targetPot, retirementAge]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  function save() {
    const pot = parseAmountInput(amount);
    const years = Number(age.trim());
    if (!Number.isFinite(pot) || pot < 100) {
      setError("Enter a pension target of at least GHS 100.");
      return;
    }
    if (!Number.isInteger(years) || years < 18 || years > 100) {
      setError("Enter a retirement age between 18 and 100.");
      return;
    }
    onSave({ targetPot: pot, retirementAge: years });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pension target</DialogTitle>
          <DialogDescription>
            The amount you want in your pot, and the age you plan to retire.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="pension-target-amount">Target amount (GHS)</Label>
            <Input
              id="pension-target-amount"
              inputMode="decimal"
              value={formatAmountTyping(amount)}
              onChange={(event) => setAmount(formatAmountTyping(event.target.value))}
              onBlur={(event) => setAmount(finalizeAmountInput(event.currentTarget.value))}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pension-retirement-age">Retirement age</Label>
            <Input
              id="pension-retirement-age"
              inputMode="numeric"
              value={age}
              onChange={(event) => setAge(event.target.value.replace(/\D/g, ""))}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

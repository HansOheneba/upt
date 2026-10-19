"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFinancialStore } from "@/store/financialStore";

export type CashFlowSettings = {
  emergencyFundMonths: number;
  currentCashBalance: number;
};

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  setSettings,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: CashFlowSettings;
  setSettings: (s: CashFlowSettings) => void;
}) {
  const userCurrency = useFinancialStore((s) => s.user?.currency ?? "USD");
  const currencySymbol =
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: userCurrency,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? userCurrency;

  const [draft, setDraft] = React.useState<{
    emergencyFundMonths: string;
    currentCashBalance: string;
  }>({
    emergencyFundMonths: String(settings.emergencyFundMonths),
    currentCashBalance: String(settings.currentCashBalance),
  });

  React.useEffect(() => {
    if (!open) return;
    setDraft({
      emergencyFundMonths: String(settings.emergencyFundMonths),
      currentCashBalance: String(settings.currentCashBalance),
    });
  }, [open, settings.emergencyFundMonths, settings.currentCashBalance]);

  const monthsNum = Number(draft.emergencyFundMonths);
  const balanceNum = Number(draft.currentCashBalance.replace(/,/g, ""));
  const valid =
    Number.isFinite(monthsNum) &&
    monthsNum >= 0 &&
    monthsNum <= 36 &&
    Number.isFinite(balanceNum) &&
    balanceNum >= 0;

  function save(): void {
    if (!valid) return;
    setSettings({
      emergencyFundMonths: Math.round(monthsNum),
      currentCashBalance: Math.round(balanceNum),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Cash Flow Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ccb">Current cash savings</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="ccb"
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="pl-7"
                value={draft.currentCashBalance.replace(
                  /\B(?=(\d{3})+(?!\d))/g,
                  ",",
                )}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    currentCashBalance: e.target.value.replace(/[^\d]/g, ""),
                  }))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              How much do you currently have in cash savings or a dedicated
              emergency fund account?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="efm">Emergency fund (months)</Label>
            <Input
              id="efm"
              type="number"
              min={0}
              max={36}
              value={draft.emergencyFundMonths}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  emergencyFundMonths: e.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Used for the overview card. (0-36 months)
            </p>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!valid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

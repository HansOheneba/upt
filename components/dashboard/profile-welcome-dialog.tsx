"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { useFinancialStore } from "@/store/financialStore";
import { useProfilePanel } from "./profile-panel-context";
import {
  pickRandomIncompleteItem,
} from "@/lib/profile-checklist";
import { toProfileStoreSnapshot } from "@/hooks/useProfileChecklistUI";
import { isTourCompleted } from "@/lib/dashboard-tour";
import { getAuth } from "@/lib/client-data";

const PRIMARY = "var(--brand-primary)";
const ACCENT = "var(--brand-accent)";

/**
 * Returning users: welcome back + one random incomplete profile step.
 * New users see the driver.js tour instead (until tour is completed).
 */
export function ProfileWelcomeDialog() {
  const router = useRouter();
  const { welcomeOpen, dismissWelcome, openRiskQuiz } = useProfilePanel();
  const store = useFinancialStore();
  const score = store.profileCompletionScore;
  const displayName = store.user?.display_name;
  const tourUserId = store.user?.user_id ?? getAuth().email ?? null;

  const snapshot = React.useMemo(
    () => toProfileStoreSnapshot(store),
    [
      store.user,
      store.incomeRows,
      store.expenseCategories,
      store.goals,
      store.retirement,
      store.liabilities,
      store.propertyAssets,
      store.emergencyFund,
      store.holdings,
      store.accounts,
      store.insurancePolicies,
    ],
  );

  const nudge = React.useMemo(
    () => pickRandomIncompleteItem(snapshot),
    [snapshot, welcomeOpen],
  );

  if (score >= 100) return null;
  if (!tourUserId || !isTourCompleted(tourUserId)) return null;

  const firstName = displayName?.split(" ")[0] ?? "there";

  function handleGoToItem() {
    if (!nudge) {
      dismissWelcome();
      return;
    }
    dismissWelcome();
    if (nudge.id === "risk-assessment") {
      openRiskQuiz();
      return;
    }
    if (nudge.href) {
      router.push(nudge.href);
    }
  }

  return (
    <Dialog
      open={welcomeOpen}
      onOpenChange={(open) => {
        if (!open) dismissWelcome();
      }}
    >
      <DialogContent className="sm:max-w-md border-[color-mix(in_srgb,var(--brand-accent)_35%,transparent)]">
        <DialogHeader>
          <div
            className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--brand-accent) 14%, transparent)" }}
          >
            <Sparkles className="h-4 w-4" style={{ color: ACCENT }} />
          </div>
          <DialogTitle className="text-lg" style={{ color: PRIMARY }}>
            Welcome back, {firstName}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Your profile is {score}% complete.{" "}
            {nudge
              ? `You have not finished "${nudge.label.toLowerCase()}" yet.`
              : "A few more steps will sharpen your insights."}
          </DialogDescription>
        </DialogHeader>

        {nudge && (
          <div
            className="rounded-xl border px-4 py-3 space-y-1.5"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-accent) 28%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--brand-accent) 8%, transparent)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: PRIMARY }}>
              {nudge.label}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {nudge.description}
            </p>
            <p className="text-xs leading-relaxed pt-0.5" style={{ color: PRIMARY }}>
              {nudge.benefit}
            </p>
          </div>
        )}

        <div className="space-y-2 py-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Profile completion</span>
            <span className="tabular-nums">{score}%</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        <DialogFooter className="sm:justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            onClick={dismissWelcome}
            className="sm:order-1 text-muted-foreground"
          >
            Maybe later
          </Button>
          {nudge?.href || nudge?.id === "risk-assessment" ? (
            <Button
              onClick={handleGoToItem}
              className="sm:order-2 text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              {nudge.actionLabel}
            </Button>
          ) : (
            <Button
              asChild
              className="sm:order-2 text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              <Link href="/dashboard/profile/setup" onClick={dismissWelcome}>
                View checklist
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

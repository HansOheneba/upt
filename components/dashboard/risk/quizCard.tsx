// components/dashboard/risk/quizCard.tsx
"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Skeleton } from "@/components/ui/skeleton";

import RiskAttitudeQuiz from "@/components/dashboard/risk/quiz";
import {
  fetchLatestRiskAssessment,
  getRiskBand,
  submitRiskAssessment,
  type RiskAssessmentResult,
} from "@/lib/dashboard-api";
import { getAuth } from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { useProfilePanel } from "@/components/dashboard/profile-panel-context";

// ─── Shared logic ─────────────────────────────────────────────────────────────

function useRiskQuiz() {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(
    responses: Record<string, number>,
    onSuccess: (result: RiskAssessmentResult) => void,
  ) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const submitted = await submitRiskAssessment({
        questionnaire_version: "1.0",
        responses,
      });
      if (submitted) {
        const riskProfile = getRiskBand(submitted);
        if (riskProfile) {
          useFinancialStore.getState().setRiskAssessment(submitted);
        }
        onSuccess(submitted);
      } else {
        setSubmitError("Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, submitError, handleSubmit };
}

// ─── Results screen shown after submission ────────────────────────────────────

export function RiskResultScreen({
  result,
  onDone,
}: {
  result: RiskAssessmentResult;
  onDone: () => void;
}) {
  const band = getRiskBand(result) ?? "Unknown";
  const description = result.result?.description;
  const strategy = result.result?.strategy;
  const finalScore = result.scoring?.final_score;
  const qScore = result.scoring?.questionnaire_score;
  const mods = result.scoring?.modifiers;
  const snap = result.profile_snapshot;

  const modEntries = mods
    ? (Object.entries(mods) as [string, number][]).filter(([, v]) => v !== 0)
    : [];

  const modLabel: Record<string, string> = {
    age: "Age",
    dependents: "Dependents",
    debt: "Debt level",
    emergency_fund: "Emergency fund",
  };

  return (
    <div className="flex flex-col h-full px-6 py-8 overflow-auto space-y-6">
      {/* Band badge */}
      <div className="flex flex-col items-center text-center gap-3 pt-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">
            {finalScore != null ? finalScore.toFixed(1) : "?"}
          </span>
        </div>
        <div>
          <p className="text-xs capitalize uppercase tracking-widest text-muted-foreground font-medium">
            Your risk profile
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 mt-1">{band}</h2>
        </div>
        {description && (
          <p className="text-sm text-slate-500 max-w-sm">{description}</p>
        )}
        {strategy && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 w-full text-left">
            <p className="text-xs font-semibold capitalize uppercase tracking-widest text-primary mb-1">
              Suggested strategy
            </p>
            <p className="text-sm text-slate-700">{strategy}</p>
          </div>
        )}
      </div>

      {/* Score breakdown */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold capitalize uppercase tracking-widest text-slate-400">
          Score breakdown
        </p>
        <div className="space-y-2 text-sm">
          {qScore != null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Questionnaire score</span>
              <span className="font-medium tabular-nums">
                {qScore.toFixed(2)}
              </span>
            </div>
          )}
          {modEntries.map(([key, val]) => (
            <div key={key} className="flex justify-between">
              <span className="text-slate-500">
                {modLabel[key] ?? key} modifier
              </span>
              <span
                className={`font-medium tabular-nums ${
                  val > 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {val > 0 ? "+" : ""}
                {val.toFixed(2)}
              </span>
            </div>
          ))}
          {finalScore != null && (
            <div className="flex justify-between border-t pt-2 mt-1">
              <span className="font-semibold text-slate-700">Final score</span>
              <span className="font-bold tabular-nums">
                {finalScore.toFixed(2)} / 5
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Profile factors considered */}
      {snap && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold capitalize uppercase tracking-widest text-slate-400">
            Profile factors considered
          </p>
          <div className="space-y-2 text-sm">
            {snap.age != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Age</span>
                <span className="font-medium">{snap.age}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Dependents</span>
              <span className="font-medium">
                {snap.dependents != null ? snap.dependents : "Not provided"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Debt level</span>
              <span className="font-medium capitalize">
                {snap.debt_level ?? "Not provided"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Emergency fund</span>
              <span className="font-medium capitalize">
                {snap.emergency_fund_status?.replace("_", " ") ??
                  "Not provided"}
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="w-full h-12 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ─── Standalone dialog (used globally from the layout) ────────────────────────

export function RiskQuizDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { submitting, submitError, handleSubmit } = useRiskQuiz();
  const [everOpened, setEverOpened] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [assessmentResult, setAssessmentResult] =
    useState<RiskAssessmentResult | null>(null);

  useEffect(() => {
    if (open) {
      setEverOpened(true);
      setAssessmentResult(null);
    }
  }, [open]);

  function requestClose() {
    if (assessmentResult) {
      onClose();
    } else {
      setConfirmOpen(true);
    }
  }

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(v) => {
          if (v) setEverOpened(true);
        }}
      >
        <DialogPrimitive.Portal>
          {/* Backdrop */}
          <DialogPrimitive.Overlay
            forceMount
            onClick={requestClose}
            className={[
              "fixed inset-0 z-50 bg-black/50",
              open
                ? "animate-fade animate-duration-200"
                : everOpened
                  ? "animate-fade animate-reverse animate-duration-150 animate-fill-forwards pointer-events-none"
                  : "hidden",
            ].join(" ")}
          />

          {/* Panel */}
          <DialogPrimitive.Content
            forceMount
            aria-describedby={undefined}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              requestClose();
            }}
            className={[
              "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden border-l bg-background shadow-lg outline-none sm:max-w-lg",
              open
                ? "animate-fade-left animate-duration-300 animate-ease-out"
                : everOpened
                  ? "animate-fade-left animate-reverse animate-duration-150 animate-ease-out animate-fill-forwards pointer-events-none"
                  : "hidden",
            ].join(" ")}
          >
            <DialogPrimitive.Title className="sr-only">
              Risk attitude quiz
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Answer honestly. There are no right or wrong answers.
            </DialogPrimitive.Description>

            {/* Close button */}
            <button
              type="button"
              onClick={requestClose}
              className="absolute right-4 top-4 z-10 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
            >
              <XIcon className="h-4 w-4" />
            </button>

            <div className="flex-1 overflow-auto">
              {assessmentResult ? (
                <RiskResultScreen result={assessmentResult} onDone={onClose} />
              ) : submitting ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Analysing your responses...
                  </p>
                </div>
              ) : (
                <>
                  {submitError && (
                    <div className="px-8 pt-6 text-sm text-red-500">
                      {submitError}
                    </div>
                  )}
                  <RiskAttitudeQuiz
                    onSave={({ responses }) =>
                      handleSubmit(responses, (r) => setAssessmentResult(r))
                    }
                  />
                </>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Confirm exit - only when quiz is in progress */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit the quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress won&apos;t be saved. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setConfirmOpen(false);
                onClose();
              }}
            >
              Exit quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Card (used on the overview page) ────────────────────────────────────────

export default function QuizCard() {
  const [localResult, setLocalResult] = useState<RiskAssessmentResult | null>(
    null,
  );
  const [resultLoading, setResultLoading] = useState(true);
  const { openRiskQuiz, riskQuizOpen } = useProfilePanel();
  const prevQuizOpen = useRef(false);
  const setRiskAssessment = useFinancialStore((s) => s.setRiskAssessment);
  const storeAssessment = useFinancialStore((s) => s.riskAssessment);
  const result = localResult ?? storeAssessment;

  const applyResult = React.useCallback(
    (r: RiskAssessmentResult | null) => {
      if (!r) return;
      setLocalResult(r);
      setRiskAssessment(r);
    },
    [setRiskAssessment],
  );

  useEffect(() => {
    if (!getAuth().loggedIn) {
      setResultLoading(false);
      return;
    }
    fetchLatestRiskAssessment()
      .then((r) => applyResult(r))
      .catch(() => {
        /* session-expired modal handled globally */
      })
      .finally(() => setResultLoading(false));
  }, [applyResult]);

  // Re-fetch when the quiz panel closes in case the user submitted
  useEffect(() => {
    if (prevQuizOpen.current && !riskQuizOpen && getAuth().loggedIn) {
      fetchLatestRiskAssessment().then((r) => applyResult(r));
    }
    prevQuizOpen.current = riskQuizOpen;
  }, [riskQuizOpen, applyResult]);

  const profileLabel = result ? (getRiskBand(result) ?? "Unknown") : null;
  const scoreValue = result?.scoring?.final_score;

  return (
    <DashCard>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {result ? "Your risk attitude" : "Risk attitude quiz"}
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {result
            ? "Retake the quiz any time to update your profile."
            : "Take a quick questionnaire to understand your investment comfort level."}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {resultLoading && !result ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ) : result ? (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  Risk profile
                </div>
                <div className="mt-1 text-sm font-semibold capitalize">
                  {profileLabel}
                </div>
              </div>
              {typeof scoreValue === "number" && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    Risk score
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {scoreValue.toFixed(1)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / 5
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="mt-1 text-sm font-semibold">Not completed yet</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Complete it to tailor suggestions.
            </div>
          </div>
        )}

        {!resultLoading && (
          <Button className="w-full justify-between" onClick={openRiskQuiz}>
            {result ? "Retake test" : "Take quiz"}
            <span aria-hidden>→</span>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}

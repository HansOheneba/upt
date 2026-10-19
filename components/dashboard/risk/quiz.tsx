"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft } from "lucide-react";
import { fetchRiskQuestions, type RiskQuestion } from "@/lib/dashboard-api";

type OptionScore = 1 | 2 | 3 | 4 | 5;
type RiskBand =
  | "Capital Preservation"
  | "Conservative"
  | "Balanced"
  | "Growth"
  | "Aggressive";

interface QuizProps {
  onSave: (result: {
    score: number;
    band: RiskBand;
    answers: Record<number, OptionScore>;
    responses: Record<string, number>;
  }) => void;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const OPTION_COLORS = [
  "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]",
  "bg-orange-100 text-orange-500",
  "bg-emerald-100 text-emerald-600",
  "bg-violet-100 text-violet-600",
  "bg-rose-100 text-rose-500",
  "bg-amber-100 text-amber-600",
];

function scoreToBand(score: number, maxScore: number): RiskBand {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct <= 0.2) return "Capital Preservation";
  if (pct <= 0.4) return "Conservative";
  if (pct <= 0.6) return "Balanced";
  if (pct <= 0.8) return "Growth";
  return "Aggressive";
}

export default function RiskAttitudeQuiz({ onSave }: QuizProps) {
  const [questions, setQuestions] = useState<RiskQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const loadQuestions = React.useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetchRiskQuestions()
      .then((qs) => {
        setQuestions(qs);
        setLoadError(qs.length === 0);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const totalSteps = questions.length;
  const currentQuestion = questions[step - 1];
  const currentId = currentQuestion?.id ?? `q${step}`;
  const selectedScore = answers[currentId];
  const canGoNext = selectedScore !== undefined;
  const progressPct = totalSteps > 0 ? (step / totalSteps) * 100 : 0;

  function handleSelect(score: number) {
    setAnswers((prev) => ({ ...prev, [currentId]: score }));
  }

  function handlePrevious() {
    if (step <= 1) return;
    setStep((s) => s - 1);
  }

  function handleNext() {
    if (!canGoNext) return;
    if (step >= totalSteps) {
      const score = Object.values(answers).reduce((s, v) => s + v, 0);
      const maxScore = questions.reduce(
        (s, q) => s + Math.max(...q.options.map((o) => o.score)),
        0,
      );
      const band = scoreToBand(score, maxScore);
      // Build Record<number, OptionScore> keyed by 1-based question index
      const indexedAnswers: Record<number, OptionScore> = {};
      questions.forEach((q, i) => {
        const val = answers[q.id];
        if (val !== undefined) indexedAnswers[i + 1] = val as OptionScore;
      });
      onSave({ score, band, answers: indexedAnswers, responses: answers });
      return;
    }
    setStep((s) => s + 1);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-24 gap-4">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-slate-500">Loading questions…</p>
      </div>
    );
  }

  if (loadError || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-24 gap-4">
        <p className="text-sm text-slate-500">
          Unable to load quiz questions. Please try again.
        </p>
        <Button variant="outline" onClick={loadQuestions}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white px-6 py-8 min-h-full">
      {/* ── Progress bar ── */}
      <div className="mx-auto w-full my-5 max-w-lg">
        <div className="flex gap-2 h-1.5">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="h-full rounded-full bg-gray-200 transition-[width] duration-200 ease-out"
            style={{ width: `${100 - progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Question ── */}
      <div className="mx-auto w-full max-w-lg mt-10 flex-1">
        <h2 className="text-2xl md:text-[1.75rem] font-bold text-slate-900 text-center leading-snug">
          {currentQuestion?.question}
        </h2>
        <p className="mt-2.5 text-center text-sm text-slate-500">
          Please select one option, you can always retake the quiz later.
        </p>

        {/* ── Options ── */}
        <div className="mt-8 space-y-3">
          {currentQuestion?.options.map((option, i) => {
            const isActive = selectedScore === option.score;
            const colorClass = OPTION_COLORS[i % OPTION_COLORS.length];
            return (
              <button
                key={option.score}
                onClick={() => handleSelect(option.score)}
                className={cn(
                  "w-full flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97]",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60",
                )}
              >
                <span className="flex-1 text-sm md:text-[15px] font-medium text-slate-700">
                  {option.label}
                </span>
                <span
                  className={cn(
                    "h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-[color,background-color,border-color] duration-160 ease-out",
                    isActive
                      ? "border-primary bg-primary"
                      : "border-gray-300 bg-white",
                  )}
                >
                  {isActive && <Check className="h-3 w-3 text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mx-auto w-full max-w-lg mt-10 flex gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={step === 1}
          className="flex-1 h-12 gap-1 disabled:opacity-30 border-gray-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canGoNext}
          className="flex-2 h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground"
        >
          {step >= totalSteps ? "Submit" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthMode } from "@/components/login/types";
import { brand } from "@/lib/tenant";

interface EmailFormProps {
  onSubmit: (email: string) => void;
  mode: AuthMode;
  onModeToggle: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  infoMessage?: string | null;
}

export function EmailForm({
  onSubmit,
  mode,
  onModeToggle,
  isSubmitting,
  errorMessage,
  infoMessage,
}: EmailFormProps) {
  const [email, setEmail] = React.useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isSubmitting || email.trim().length === 0) return;

    onSubmit(email.trim());
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {mode === "login" ? "Welcome back" : `Welcome to ${brand.name}`}
        </h1>

        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {mode === "login"
            ? "Enter your email to log in to your dashboard."
            : "Enter your email to get into your dashboard."}
        </p>
      </div>

      {infoMessage ? (
        <div
          role="status"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {infoMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>

          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-lg text-sm sm:h-12 sm:text-base"
            disabled={isSubmitting}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || email.trim().length === 0}
          className="h-11 w-full rounded-lg text-sm font-medium sm:h-12 sm:text-base"
        >
          {isSubmitting
            ? "Sending code…"
            : mode === "login"
              ? "Send login code"
              : "Continue"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-left">
        {mode === "login" ? `New to ${brand.name}?` : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={onModeToggle}
          disabled={isSubmitting}
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthMode } from "@/components/login/types";
import { brand } from "@/lib/tenant";
import { cn } from "@/lib/utils";

interface EmailFormProps {
  onSubmit: (email: string) => void;
  mode: AuthMode;
  onModeToggle: () => void;
  /** When set, "Create an account" opens registration instead of switching the email form. */
  onCreateAccount?: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  infoMessage?: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return null;
}

export function EmailForm({
  onSubmit,
  mode,
  onModeToggle,
  onCreateAccount,
  isSubmitting,
  errorMessage,
  infoMessage,
}: EmailFormProps) {
  const [email, setEmail] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const trimmed = email.trim();
  const formatValid = EMAIL_PATTERN.test(trimmed);
  const validationMessage = touched ? emailError(email) : null;
  const showValid = formatValid && !validationMessage && !isSubmitting;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    setTouched(true);
    if (emailError(email)) return;

    onSubmit(trimmed);
  }

  const describedBy = [
    validationMessage ? "email-error" : "email-help",
    errorMessage ? "email-auth-error" : null,
    infoMessage ? "email-auth-info" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full">
      <div className="space-y-2 text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {mode === "login" ? "Access your pension" : "Create your account"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mode === "login"
            ? "Sign in securely to view your pension account and activity."
            : "Enter your email and we’ll send a 6-digit code to continue."}
        </p>
      </div>

      {infoMessage ? (
        <div
          id="email-auth-info"
          role="status"
          className="mt-5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground"
        >
          {infoMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          id="email-auth-error"
          role="alert"
          className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                if (email.length > 0) setTouched(true);
              }}
              aria-invalid={validationMessage ? true : undefined}
              aria-describedby={describedBy}
              disabled={isSubmitting}
              className={cn(
                "h-11 pr-10 text-sm",
                showValid && "border-primary/50",
              )}
            />
            {showValid ? (
              <Check
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
              />
            ) : null}
          </div>
          {validationMessage ? (
            <p id="email-error" className="text-sm text-destructive">
              {validationMessage}
            </p>
          ) : (
            <p id="email-help" className="text-sm text-muted-foreground">
              {mode === "login"
                ? "We’ll email you a 6-digit code to confirm it’s you."
                : "Use the email address you want on this account."}
            </p>
          )}
        </div>

        <Button
          type="submit"
          aria-busy={isSubmitting}
          disabled={isSubmitting}
          className="h-11 w-full text-sm font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Sending code…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>

      <p className="mt-4 text-left text-sm leading-relaxed text-muted-foreground">
        {mode === "login" ? `New to ${brand.name}?` : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={
            mode === "login" && onCreateAccount ? onCreateAccount : onModeToggle
          }
          disabled={isSubmitting}
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import type { AuthMode } from "@/components/login/types";

interface OtpFormProps {
  email: string;
  mode: AuthMode;
  onVerify: (otp: string) => void;
  onBack: () => void;
  onResend: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  infoMessage?: string | null;
}

const OTP_LENGTH = 6;

export function OtpForm({
  email,
  mode,
  onVerify,
  onBack,
  onResend,
  isSubmitting,
  errorMessage,
  infoMessage,
}: OtpFormProps) {
  const [otp, setOtp] = React.useState("");
  const [attempted, setAttempted] = React.useState(false);

  const incomplete = otp.length < OTP_LENGTH;
  const incompleteMessage =
    attempted && incomplete && !errorMessage
      ? "Enter the 6-digit code from your email."
      : null;

  function handleComplete(value: string) {
    setOtp(value);
    setAttempted(false);
    if (value.length === OTP_LENGTH && !isSubmitting) {
      onVerify(value);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    if (otp.length < OTP_LENGTH) {
      setAttempted(true);
      return;
    }
    onVerify(otp);
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </button>

      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Enter your code
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-foreground">{email}</span>. Enter it
        to {mode === "login" ? "sign in" : "continue"}.
      </p>

      {infoMessage ? (
        <div
          role="status"
          className="mt-5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground"
        >
          {infoMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <InputOTP
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={(value) => {
              setOtp(value);
              if (value.length > 0) setAttempted(false);
            }}
            onComplete={handleComplete}
            disabled={isSubmitting}
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="6-digit code"
            aria-invalid={Boolean(errorMessage || incompleteMessage) || undefined}
            aria-describedby={incompleteMessage ? "otp-error" : undefined}
            containerClassName="justify-start"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-11 w-9 text-base sm:w-10" />
              <InputOTPSlot index={1} className="h-11 w-9 text-base sm:w-10" />
              <InputOTPSlot index={2} className="h-11 w-9 text-base sm:w-10" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} className="h-11 w-9 text-base sm:w-10" />
              <InputOTPSlot index={4} className="h-11 w-9 text-base sm:w-10" />
              <InputOTPSlot index={5} className="h-11 w-9 text-base sm:w-10" />
            </InputOTPGroup>
          </InputOTP>
          {incompleteMessage ? (
            <p id="otp-error" className="text-sm text-destructive">
              {incompleteMessage}
            </p>
          ) : null}
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
              Verifying…
            </>
          ) : (
            "Continue"
          )}
        </Button>

        <p className="text-sm text-muted-foreground">
          Didn&apos;t get the code?{" "}
          <button
            type="button"
            onClick={() => {
              setOtp("");
              setAttempted(false);
              onResend();
            }}
            disabled={isSubmitting}
            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Resend
          </button>
        </p>
      </form>
    </div>
  );
}

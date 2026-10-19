"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
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

  function handleComplete(value: string) {
    setOtp(value);
    // auto-submit when all digits filled
    if (value.length === OTP_LENGTH) {
      onVerify(value);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting || otp.length < OTP_LENGTH) return;
    onVerify(otp);
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-3xl font-semibold tracking-tight">
        {mode === "login" ? "Enter your login code" : "Check your email"}
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-foreground">{email}</span>. Enter it
        below to {mode === "login" ? "log in" : "continue"}.
      </p>

      {infoMessage ? (
        <p className="mt-3 text-sm text-emerald-600" role="status">
          {infoMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <InputOTP
          maxLength={OTP_LENGTH}
          value={otp}
          onChange={setOtp}
          onComplete={handleComplete}
          disabled={isSubmitting}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        <Button
          type="submit"
          disabled={isSubmitting || otp.length < OTP_LENGTH}
          className="h-11 w-full "
        >
          {isSubmitting
            ? "Verifying…"
            : mode === "login"
              ? "Verify & Log in"
              : "Verify & Continue"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Didn&apos;t get the code?{" "}
          <button
            type="button"
            onClick={() => {
              setOtp("");
              onResend();
            }}
            disabled={isSubmitting}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Resend
          </button>
        </p>
      </form>
    </div>
  );
}

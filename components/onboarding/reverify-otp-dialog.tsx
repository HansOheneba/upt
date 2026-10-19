"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { sanitizeAuthApiMessage } from "@/lib/auth-api-errors";
import { brand } from "@/lib/tenant";

const OTP_MESSAGE_TYPE = "OTPAuthMessage:HTML";
const REQUEST_OTP_ENDPOINT = "/api/otp-proxy/onboarding.generate-otp";
const VERIFY_OTP_ENDPOINT = "/api/otp-proxy/onboarding.verify-otp";
const OTP_SUBJECT = `Your ${brand.name} Verification Code`;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

interface ReverifyOtpDialogProps {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

type Status = "sending" | "ready" | "verifying" | "error";

export function ReverifyOtpDialog({
  open,
  email,
  onOpenChange,
  onVerified,
}: ReverifyOtpDialogProps) {
  const [otp, setOtp] = React.useState("");
  const [status, setStatus] = React.useState<Status>("sending");
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  const requestOtp = React.useCallback(async () => {
    setStatus("sending");
    setError(null);
    setInfo(null);
    try {
      const response = await fetch(REQUEST_OTP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          messageType: OTP_MESSAGE_TYPE,
          messageSubject: OTP_SUBJECT,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(
          sanitizeAuthApiMessage(
            payload?.message,
            "Unable to send verification code.",
          ),
        );
      }

      setStatus("ready");
      setInfo(`We sent a new 6-digit code to ${email}.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send verification code.",
      );
    }
  }, [email]);

  // Auto-request OTP whenever the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    setOtp("");
    setError(null);
    setInfo(null);
    setCooldown(0);
    void requestOtp();
  }, [open, requestOtp]);

  // Resend cooldown ticker.
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleVerify(code: string) {
    if (status === "verifying") return;
    setStatus("verifying");
    setError(null);

    try {
      const response = await fetch(VERIFY_OTP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        data?: { onboarding_token?: string };
      } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(
          sanitizeAuthApiMessage(
            payload?.message,
            "Invalid or expired code.",
          ),
        );
      }

      const onboardingToken = payload?.data?.onboarding_token;
      if (!onboardingToken) {
        throw new Error("Verification succeeded but no token was returned.");
      }

      // Refresh the HttpOnly onboarding token cookie so the next submit works.
      const setTokenRes = await fetch("/api/auth/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: onboardingToken }),
      });
      if (!setTokenRes.ok) {
        throw new Error("Could not refresh your session. Please try again.");
      }

      onVerified();
      onOpenChange(false);
    } catch (err) {
      setStatus("ready");
      setError(err instanceof Error ? err.message : "Unable to verify code.");
      setOtp("");
    }
  }

  function handleChange(value: string) {
    setOtp(value);
    if (error) setError(null);
    if (value.length === OTP_LENGTH && status !== "verifying") {
      void handleVerify(value);
    }
  }

  const verifying = status === "verifying";
  const sending = status === "sending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle>Verify it&apos;s still you</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            For your security, we sent a fresh 6-digit code to{" "}
            <span className="font-medium text-slate-700">{email}</span>. Enter
            it below to finish setting up your account. Your progress is saved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <InputOTP
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={handleChange}
            disabled={sending || verifying}
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

          {sending && (
            <p className="text-xs text-slate-500">Sending a new code...</p>
          )}
          {info && !error && !sending && (
            <p className="text-xs text-slate-500">{info}</p>
          )}
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => void requestOtp()}
            disabled={sending || verifying || cooldown > 0}
            className="text-xs font-medium text-indigo-700 hover:text-indigo-900 disabled:text-slate-400 disabled:cursor-not-allowed text-left cursor-pointer"
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Didn't get it? Resend code"}
          </button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={verifying}
              className="h-9 rounded-lg text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleVerify(otp)}
              disabled={otp.length < OTP_LENGTH || verifying || sending}
              className="h-9 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm"
            >
              {verifying ? "Verifying..." : "Verify & continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

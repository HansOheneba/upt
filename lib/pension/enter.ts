import {
  setAuth,
  setDefaultCurrency,
  setOnboarded,
  setSubscriptionData,
} from "@/lib/client-data";
import { DEMO_MEMBER, type JoinInput } from "@/lib/pension/demo-data";
import { setPensionDemoMode } from "@/lib/pension/session";
import { resetSession } from "@/lib/session-reset";
import { usePensionStore } from "@/store/pensionStore";

function markActivePensionSession(email: string): void {
  setAuth(email);
  setOnboarded();
  setSubscriptionData({
    subscription_status: "active",
    subscription_plan: "my-own-pension",
  });
  setDefaultCurrency("GHS");
  setPensionDemoMode("active");
}

/** Opens the fictional member. No OTP and no API. */
export function startPensionPreview(): void {
  resetSession();
  markActivePensionSession(DEMO_MEMBER.email);
  usePensionStore.getState().loadPreview();
}

/** Starts the four-step membership. Dashboard stays locked until it finishes. */
export function startPensionJoin(): void {
  resetSession();
  setAuth("new.member@myownpension.demo");
  setDefaultCurrency("GHS");
  setPensionDemoMode("joining");
}

export function finishPensionJoin(input: JoinInput): void {
  usePensionStore.getState().loadJoined(input);
  const member = usePensionStore.getState().member;
  markActivePensionSession(member?.email ?? "member@example.com");
}

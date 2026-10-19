"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { isTourCompleted, WELCOME_SESSION_KEY } from "@/lib/dashboard-tour";
import { useFinancialStore } from "@/store/financialStore";
import { getAuth } from "@/lib/client-data";

/** Set when the tour ends by opening the risk quiz - open the profile
 *  sheet once the quiz is closed (completed or dismissed). */
const PROFILE_AFTER_RISK_KEY = "celerey:profile-after-risk";

interface ProfilePanelContextValue {
  /** Side-sheet checklist panel */
  isOpen: boolean;
  open: () => void;
  dismiss: () => void;
  /** Welcome "complete your profile" dialog */
  welcomeOpen: boolean;
  openWelcome: () => void;
  dismissWelcome: () => void;
  /** Risk assessment quiz */
  riskQuizOpen: boolean;
  openRiskQuiz: () => void;
  closeRiskQuiz: () => void;
  /**
   * Open the profile setup sheet after the guided tour. If the tour hands
   * off to the risk quiz first, the sheet opens when that quiz closes.
   */
  openProfileAfterTour: (opts?: { deferForRiskQuiz?: boolean }) => void;
}

const ProfilePanelContext = createContext<ProfilePanelContextValue>({
  isOpen: false,
  open: () => {},
  dismiss: () => {},
  welcomeOpen: false,
  openWelcome: () => {},
  dismissWelcome: () => {},
  riskQuizOpen: false,
  openRiskQuiz: () => {},
  closeRiskQuiz: () => {},
  openProfileAfterTour: () => {},
});

export function ProfilePanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [riskQuizOpen, setRiskQuizOpen] = useState(false);
  const userId =
    useFinancialStore((s) => s.user?.user_id) ?? getAuth().email ?? null;

  useEffect(() => {
    if (!userId) return;

    const dismissedSession =
      typeof window !== "undefined" &&
      sessionStorage.getItem(WELCOME_SESSION_KEY) === "true";
    if (dismissedSession) return;

    if (isTourCompleted(userId)) {
      setWelcomeOpen(true);
    }
  }, [userId]);

  function dismissWelcome() {
    setWelcomeOpen(false);
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, "true");
    } catch {
      // noop
    }
  }

  function openProfileAfterTour(opts?: { deferForRiskQuiz?: boolean }) {
    if (opts?.deferForRiskQuiz) {
      try {
        sessionStorage.setItem(PROFILE_AFTER_RISK_KEY, "true");
      } catch {
        /* noop */
      }
      return;
    }
    setIsOpen(true);
  }

  function closeRiskQuiz() {
    setRiskQuizOpen(false);
    try {
      if (sessionStorage.getItem(PROFILE_AFTER_RISK_KEY) === "true") {
        sessionStorage.removeItem(PROFILE_AFTER_RISK_KEY);
        // Defer one tick so the quiz dialog unmounts before the sheet opens.
        window.setTimeout(() => setIsOpen(true), 0);
      }
    } catch {
      /* noop */
    }
  }

  return (
    <ProfilePanelContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        dismiss: () => setIsOpen(false),
        welcomeOpen,
        openWelcome: () => setWelcomeOpen(true),
        dismissWelcome,
        riskQuizOpen,
        openRiskQuiz: () => setRiskQuizOpen(true),
        closeRiskQuiz,
        openProfileAfterTour,
      }}
    >
      {children}
    </ProfilePanelContext.Provider>
  );
}

export function useProfilePanel() {
  return useContext(ProfilePanelContext);
}

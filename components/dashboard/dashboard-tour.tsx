"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

import { buttonVariants } from "@/components/ui/button";
import {
  getActiveTourSteps,
  type DashboardTourStep,
  TOUR_STORAGE,
  TOUR_RESTART_EVENT,
  isTourCompleted,
  isTourSessionActive,
  consumeTourPending,
  markTourCompleted,
  getTourProgress,
  setTourProgress,
} from "@/lib/dashboard-tour";
import { useFinancialStore } from "@/store/financialStore";
import { hasCompletedRiskAssessment } from "@/lib/profile-checklist";
import { getAuth } from "@/lib/client-data";
import { isDemoMode } from "@/lib/demo-mode";
import { useProfilePanel } from "@/components/dashboard/profile-panel-context";
import { useSidebar } from "@/components/ui/sidebar";

const START_DELAY_MS = 600;
const ELEMENT_WAIT_MS = 5000;
const ELEMENT_POLL_MS = 100;
const STEP_READY_DELAY_MS = 80;
/** Fallback under driver.js while a route change is in flight without an active popover. */
const BRIDGE_OVERLAY_Z = 999999999;

let activeDriver: Driver | null = null;

function destroyActiveDriver() {
  if (activeDriver?.isActive()) {
    activeDriver.destroy();
  }
  activeDriver = null;
}

function waitForElement(
  selector: string | undefined,
  timeoutMs = ELEMENT_WAIT_MS,
): Promise<Element | null> {
  if (!selector) return Promise.resolve(null);

  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, ELEMENT_POLL_MS);
    };
    tick();
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDescription(step: DashboardTourStep): string {
  return `<p class="celerey-tour-desc">${step.description}</p>`;
}

function buildLoadingDescription(nextTitle: string): string {
  return `
    <div class="celerey-tour-loading">
      <div class="celerey-tour-spinner" aria-hidden="true"></div>
      <p class="celerey-tour-loading-label">Taking you to</p>
      <p class="celerey-tour-loading-title">${escapeHtml(nextTitle)}</p>
      <div class="celerey-tour-skeleton" aria-hidden="true">
        <div class="celerey-tour-skeleton-line"></div>
        <div class="celerey-tour-skeleton-line celerey-tour-skeleton-line--short"></div>
        <div class="celerey-tour-skeleton-line celerey-tour-skeleton-line--medium"></div>
      </div>
    </div>
  `;
}

type TourFooterAction = {
  label: string;
  variant?: "default" | "outline";
  onClick: () => void;
};

/** Imperative buttons (no nested createRoot) so tour teardown can't race React. */
function mountTourFooterActions(
  container: HTMLElement,
  actions: TourFooterAction[],
) {
  container.replaceChildren();

  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.setAttribute("data-slot", "button");
    button.className = buttonVariants({
      variant: action.variant ?? "default",
      size: "sm",
    });
    button.addEventListener("click", action.onClick);
    container.appendChild(button);
  }
}

function ensureDriver(onClose: () => void): Driver {
  if (activeDriver?.isActive()) return activeDriver;

  const driverObj = driver({
    animate: true,
    overlayColor: "#000000",
    overlayOpacity: 0.68,
    stagePadding: 6,
    stageRadius: 8,
    allowClose: true,
    showButtons: ["close"],
    popoverClass: "celerey-driver-popover",
    popoverOffset: 10,
    onCloseClick: onClose,
    onDestroyed: () => {
      if (activeDriver === driverObj) activeDriver = null;
    },
  });

  activeDriver = driverObj;
  return driverObj;
}

type DashboardTourProps = {
  layoutReady: boolean;
};

export function DashboardTour({ layoutReady }: DashboardTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useFinancialStore((s) => s.user);
  const riskAssessment = useFinancialStore((s) => s.riskAssessment);
  const hasRiskProfile = hasCompletedRiskAssessment({ user, riskAssessment });
  const userId = user?.user_id ?? getAuth().email ?? null;
  const { openRiskQuiz, openProfileAfterTour } = useProfilePanel();
  const { isMobile, setOpenMobile } = useSidebar();

  const tourSteps = React.useMemo(
    () => getActiveTourSteps(hasRiskProfile),
    [hasRiskProfile],
  );

  const running = React.useRef(false);
  const advancing = React.useRef(false);
  const startedRef = React.useRef(false);
  const showStepRef = React.useRef<(index: number) => Promise<void>>(
    async () => {},
  );
  const [stepIndex, setStepIndex] = React.useState(0);
  const [tourActive, setTourActive] = React.useState(false);
  const [restartToken, setRestartToken] = React.useState(0);
  const [bridge, setBridge] = React.useState<{
    title: string;
    index: number;
  } | null>(null);

  const syncProgress = React.useCallback((index: number) => {
    setStepIndex(index);
    setTourProgress(index, "nav");
  }, []);

  const finishTour = React.useCallback(
    (opts?: { deferProfileForRiskQuiz?: boolean }) => {
      advancing.current = false;
      running.current = false;
      destroyActiveDriver();
      setBridge(null);
      if (isMobile) setOpenMobile(false);
      markTourCompleted(userId);
      setTourActive(false);
      try {
        sessionStorage.removeItem(TOUR_STORAGE.active);
      } catch {
        /* noop */
      }
      openProfileAfterTour({
        deferForRiskQuiz: opts?.deferProfileForRiskQuiz,
      });
    },
    [isMobile, openProfileAfterTour, setOpenMobile, userId],
  );

  const paintStep = React.useCallback(
    (index: number, el: Element | null) => {
      const step = tourSteps[index];
      if (!step) {
        finishTour();
        return;
      }

      const isLast = index >= tourSteps.length - 1;
      const isRiskStep = step.id === "risk-assessment";
      const driverObj = ensureDriver(() => {
        finishTour();
        running.current = false;
      });

      driverObj.highlight({
        element: el ?? undefined,
        popover: {
          title: step.title,
          description: buildDescription(step),
          side: el ? "right" : "over",
          align: "start",
          onPopoverRender: (popover) => {
            popover.closeButton.style.display = "block";
            popover.nextButton.style.display = "none";
            popover.previousButton.style.display = "none";
            popover.progress.style.display = "none";

            const footer = popover.footer;
            footer.className = "driver-popover-footer celerey-tour-footer";
            footer.style.display = "flex";
            footer.innerHTML = "";

            const progress = document.createElement("span");
            progress.className = "celerey-tour-progress";
            progress.textContent = `${index + 1} / ${tourSteps.length}`;

            const actions = document.createElement("div");
            actions.className = "celerey-tour-actions";

            const goNext = () => {
              void (async () => {
                if (isLast) {
                  finishTour();
                  return;
                }

                const nextIndex = index + 1;
                const next = tourSteps[nextIndex];
                if (!next) {
                  finishTour();
                  return;
                }

                advancing.current = true;
                running.current = true;
                setBridge({ title: next.title, index: nextIndex });

                // Morph the current popover into a centered loading card, then
                // animate the spotlight to the next nav target once it exists.
                driverObj.highlight({
                  popover: {
                    title: "Next up",
                    description: buildLoadingDescription(next.title),
                    side: "over",
                    align: "center",
                    onPopoverRender: (loadingPopover) => {
                      loadingPopover.closeButton.style.display = "block";
                      loadingPopover.nextButton.style.display = "none";
                      loadingPopover.previousButton.style.display = "none";
                      loadingPopover.progress.style.display = "none";

                      const loadingFooter = loadingPopover.footer;
                      loadingFooter.className =
                        "driver-popover-footer celerey-tour-footer";
                      loadingFooter.style.display = "flex";
                      loadingFooter.innerHTML = "";

                      const loadingProgress = document.createElement("span");
                      loadingProgress.className = "celerey-tour-progress";
                      loadingProgress.textContent = `${nextIndex + 1} / ${tourSteps.length}`;
                      loadingFooter.appendChild(loadingProgress);
                    },
                  },
                });

                syncProgress(nextIndex);

                if (isMobile) setOpenMobile(true);

                if (window.location.pathname !== next.href) {
                  router.push(next.href);
                }

                const nextEl = await waitForElement(next.navSelector);
                if (!advancing.current) return;

                paintStep(nextIndex, nextEl);
                setBridge(null);
                advancing.current = false;
                running.current = false;
              })();
            };

            if (isRiskStep) {
              mountTourFooterActions(actions, [
                {
                  label: "Finish tour",
                  variant: "outline",
                  onClick: () => {
                    finishTour();
                  },
                },
                {
                  label: "Take assessment now",
                  onClick: () => {
                    finishTour({ deferProfileForRiskQuiz: true });
                    openRiskQuiz();
                  },
                },
              ]);
            } else {
              mountTourFooterActions(actions, [
                {
                  label: isLast ? "Finish tour" : "Next",
                  onClick: goNext,
                },
              ]);
            }

            footer.appendChild(progress);
            footer.appendChild(actions);
          },
        },
      });
    },
    [finishTour, isMobile, openRiskQuiz, router, setOpenMobile, syncProgress, tourSteps],
  );

  const showStep = React.useCallback(
    async (index: number) => {
      if (advancing.current || running.current) return;
      if (!userId || isTourCompleted(userId)) return;

      running.current = true;

      const step = tourSteps[index];
      if (!step) {
        finishTour();
        running.current = false;
        return;
      }

      setBridge({ title: step.title, index });
      if (isMobile) setOpenMobile(true);
      const el = await waitForElement(step.navSelector);
      if (advancing.current) return;

      paintStep(index, el);
      setBridge(null);
      running.current = false;
    },
    [finishTour, isMobile, paintStep, setOpenMobile, tourSteps, userId],
  );

  showStepRef.current = showStep;

  React.useEffect(() => {
    function onRestart() {
      startedRef.current = false;
      advancing.current = false;
      running.current = false;
      setBridge(null);
      setRestartToken((t) => t + 1);
    }
    window.addEventListener(TOUR_RESTART_EVENT, onRestart);
    return () => window.removeEventListener(TOUR_RESTART_EVENT, onRestart);
  }, []);

  React.useEffect(() => {
    if (!layoutReady || !userId || startedRef.current) return;
    if (isDemoMode()) return;
    if (isTourCompleted(userId)) return;

    // Only auto-start for users arriving from onboarding (pending flag set),
    // or to resume a tour already mid-session. Direct logins skip the tour.
    const resumeActive = isTourSessionActive();
    const pendingForNewUser = consumeTourPending();
    if (!resumeActive && !pendingForNewUser) return;

    startedRef.current = true;

    const stored = resumeActive
      ? getTourProgress()
      : { stepIndex: 0, phase: "nav" as const };

    const clampedIndex = Math.min(
      stored.stepIndex,
      Math.max(0, tourSteps.length - 1),
    );

    syncProgress(clampedIndex);
    setTourActive(true);

    try {
      sessionStorage.setItem(TOUR_STORAGE.active, "true");
    } catch {
      /* noop */
    }

    const step = tourSteps[clampedIndex];
    const timer = window.setTimeout(() => {
      if (step && window.location.pathname !== step.href) {
        router.push(step.href);
      }
    }, START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [layoutReady, restartToken, router, syncProgress, tourSteps, userId]);

  React.useEffect(() => {
    if (!tourActive || !userId || isTourCompleted(userId)) return;
    // Next-step advances own the handoff; don't remount over the morph.
    if (advancing.current) return;

    const step = tourSteps[stepIndex];
    if (!step || pathname !== step.href) return;

    const timer = window.setTimeout(() => {
      void showStepRef.current(stepIndex);
    }, STEP_READY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [tourActive, pathname, stepIndex, tourSteps, userId]);

  React.useEffect(
    () => () => {
      destroyActiveDriver();
    },
    [],
  );

  if (!bridge || activeDriver?.isActive()) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 flex items-center justify-center bg-black/68 px-4"
      style={{ zIndex: BRIDGE_OVERLAY_Z }}
    >
      <div className="celerey-tour-bridge-card w-full max-w-sm rounded-[14px] border border-[color-mix(in_srgb,var(--brand-accent)_35%,transparent)] bg-white p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="celerey-tour-loading">
          <div className="celerey-tour-spinner" aria-hidden="true" />
          <p className="celerey-tour-loading-label">Taking you to</p>
          <p className="celerey-tour-loading-title">{bridge.title}</p>
          <div className="celerey-tour-skeleton" aria-hidden="true">
            <div className="celerey-tour-skeleton-line" />
            <div className="celerey-tour-skeleton-line celerey-tour-skeleton-line--short" />
            <div className="celerey-tour-skeleton-line celerey-tour-skeleton-line--medium" />
          </div>
          <p className="celerey-tour-progress mt-3">
            {bridge.index + 1} / {tourSteps.length}
          </p>
        </div>
      </div>
    </div>
  );
}

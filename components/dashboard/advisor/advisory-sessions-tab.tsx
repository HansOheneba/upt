"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { SessionOverviewHero } from "./session-overview-hero";
import { UpcomingSessionCard } from "./upcoming-session-card";
import { SessionHistoryCard } from "./session-history-card";
import { YourAdvisorCard } from "./your-advisor-card";
import { ClientAvailabilityCard } from "./client-availability-card";
import type { ProgressMetric } from "./progress-since-session-card";
import type { ClientAvailability } from "@/lib/book-api";
import type { AdvisorySession, UpcomingSession } from "./types";
import { appointmentsCardClass } from "./appointments-ui";

const PRIMARY = "var(--brand-primary)";
const ACCENT = "var(--brand-accent)";

const stagger = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: 0.35, staggerChildren: 0.08 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  },
};

function Section({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <p className={`${dashboardTheme.sectionLabel} mb-2`}>{label}</p>
      {children}
    </section>
  );
}

type Props = {
  isTrial: boolean;
  showUpgradePrompt: boolean;
  onBook: () => void;
  onUpgrade: () => void;
  upcoming: UpcomingSession | null;
  onViewDetails: () => void;
  onCancel: () => void;
  cancelling: boolean;
  rmName: string;
  messagesHref: string;
  historySessions: AdvisorySession[];
  latestSessionId?: string;
  latestProgress: ProgressMetric[];
  onToggleAction: (id: string) => void;
  availabilityDemo: ClientAvailability;
};

export function AdvisorySessionsTab({
  isTrial,
  showUpgradePrompt,
  onBook,
  onUpgrade,
  upcoming,
  onViewDetails,
  onCancel,
  cancelling,
  rmName,
  messagesHref,
  historySessions,
  latestSessionId,
  latestProgress,
  onToggleAction,
  availabilityDemo,
}: Props) {
  return (
    <div className="space-y-6">
      <SessionOverviewHero isTrial={isTrial} onBook={onBook} />

      {showUpgradePrompt && (
        <div
          className="flex items-start gap-3 rounded-xl border border-border/50 px-4 py-3"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--brand-primary) 4%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--brand-accent) 30%, transparent)",
          }}
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: PRIMARY }}>
              Upgrade to book a session
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Full platform access is required to book appointments with your
              RM. Upgrade to continue.
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 shrink-0 text-xs text-white"
            style={{ backgroundColor: PRIMARY }}
            onClick={onUpgrade}
          >
            Upgrade
          </Button>
        </div>
      )}

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div
          variants={itemVariant}
          className="grid gap-4 lg:grid-cols-3 lg:items-stretch"
        >
          <Section label="Next session" className="lg:col-span-2">
            {upcoming ? (
              <UpcomingSessionCard
                session={upcoming}
                onViewDetails={onViewDetails}
                onCancel={() => void onCancel()}
                cancelling={cancelling}
              />
            ) : (
              <DashCard className={appointmentsCardClass}>
                <CardContent className="py-5">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    No session scheduled
                  </p>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Request a session and your RM will confirm within 1 - 2
                    business days.
                  </p>
                  <Button
                    size="sm"
                    className="mt-4 h-8 gap-1.5 text-xs text-white"
                    style={{ backgroundColor: PRIMARY }}
                    onClick={onBook}
                  >
                    Book a session
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </DashCard>
            )}
          </Section>

          <Section label="Your RM" className="lg:col-span-1">
            <YourAdvisorCard rmName={rmName} messagesHref={messagesHref} />
          </Section>
        </motion.div>

        <motion.div variants={itemVariant}>
          <Section label="Session history">
            <SessionHistoryCard
              sessions={historySessions}
              latestSessionId={latestSessionId}
              latestProgress={latestProgress}
              onToggleAction={(id) => void onToggleAction(id)}
            />
          </Section>
        </motion.div>

        <motion.div variants={itemVariant}>
          <Section label="Availability">
            <ClientAvailabilityCard enabled demoValue={availabilityDemo} />
          </Section>
        </motion.div>
      </motion.div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { DashCard } from "@/components/dashboard/dash-card";
import { AdvisorMessageThread } from "./advisor-message-thread";
import { appointmentsCardClass } from "./appointments-ui";

const PRIMARY = "var(--brand-primary)";

const itemVariant = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  },
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  rmName: string;
  items: Parameters<typeof AdvisorMessageThread>[0]["items"];
  loading?: boolean;
  enabled?: boolean;
  sending?: boolean;
  body: string;
  onBodyChange: (value: string) => void;
  onSend: () => void;
};

export function AdvisoryMessagesTab({
  rmName,
  items,
  loading = false,
  enabled = true,
  sending = false,
  body,
  onBodyChange,
  onSend,
}: Props) {
  return (
    <motion.div
      variants={itemVariant}
      initial="hidden"
      animate="show"
      className="w-full space-y-6"
    >
      <DashCard
        className={`${appointmentsCardClass} flex w-full min-h-[min(32rem,calc(100dvh-14rem))] flex-col overflow-hidden`}
      >
        <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4 sm:px-6">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: PRIMARY }}
          >
            {initialsOf(rmName) || "RM"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {rmName}
            </p>
            <p className="text-xs text-muted-foreground">
              Relationship Manager · Usually replies within 1 - 2 business days
            </p>
          </div>
        </div>

        <AdvisorMessageThread
          embedded
          items={items}
          loading={loading}
          rmName={rmName}
          enabled={enabled}
          sending={sending}
          body={body}
          onBodyChange={onBodyChange}
          onSend={onSend}
          className="min-h-0 flex-1"
          minHeight="min-h-0"
        />
      </DashCard>
    </motion.div>
  );
}

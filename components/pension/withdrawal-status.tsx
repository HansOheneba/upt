"use client";

import { Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WITHDRAWAL_BADGE_LABEL,
  WITHDRAWAL_FLOW,
  WITHDRAWAL_STAGE_LABEL,
  isWithdrawalStatus,
  withdrawalStageState,
  withdrawalStageTimestamp,
  type WithdrawalStageState,
} from "@/lib/pension/withdrawals";

export function WithdrawalStatusBadge({ status }: { status: string }) {
  if (!isWithdrawalStatus(status)) {
    return <Badge variant="outline">Status unavailable</Badge>;
  }

  if (status === "paid") {
    return (
      <Badge className="border-transparent bg-emerald-800 text-white hover:bg-emerald-800">
        <Check aria-hidden />
        {WITHDRAWAL_BADGE_LABEL[status]}
      </Badge>
    );
  }

  if (status === "checking") {
    return (
      <Badge variant="secondary">
        <Clock aria-hidden />
        {WITHDRAWAL_BADGE_LABEL[status]}
      </Badge>
    );
  }

  if (status === "approved") {
    return <Badge variant="outline">{WITHDRAWAL_BADGE_LABEL[status]}</Badge>;
  }

  return <Badge variant="outline">{WITHDRAWAL_BADGE_LABEL[status]}</Badge>;
}

const STAGE_NOTE: Record<WithdrawalStageState, string> = {
  complete: "Completed",
  current: "Current",
  upcoming: "Not started",
};

export function WithdrawalTimeline({
  status,
  submittedAt,
  layout = "responsive",
}: {
  status: string;
  submittedAt?: string | null;
  layout?: "responsive" | "stacked";
}) {
  if (!isWithdrawalStatus(status)) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Progress is unavailable for this request.
      </p>
    );
  }

  const stacked = layout === "stacked";

  return (
    <ol
      aria-label="Withdrawal progress"
      className={cn("flex flex-col", !stacked && "sm:grid sm:grid-cols-4 sm:gap-x-0")}
    >
      {WITHDRAWAL_FLOW.map((step, index) => {
        const state = withdrawalStageState(status, step);
        const timestamp = withdrawalStageTimestamp(step, submittedAt);
        const last = index === WITHDRAWAL_FLOW.length - 1;
        const lineFilled = state === "complete";

        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className={cn("flex min-w-0 gap-3", !stacked && "sm:flex-col sm:gap-2")}
          >
            <div
              className={cn(
                "flex w-6 shrink-0 flex-col items-center",
                !stacked && "sm:w-full sm:flex-row sm:items-center",
              )}
            >
              <StageMarker state={state} />
              {last ? null : (
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 w-px min-h-3 flex-1",
                    !stacked && "sm:mt-0 sm:ml-1.5 sm:h-px sm:min-h-0 sm:w-auto sm:flex-1",
                    lineFilled ? "bg-[var(--brand-primary)]" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className={cn("min-w-0 pb-3", last && "pb-0", !stacked && "sm:pb-0 sm:pr-3")}>
              <p
                className={cn(
                  "text-xs leading-snug",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                  state === "current" && "font-medium",
                )}
              >
                {WITHDRAWAL_STAGE_LABEL[step]}
                {state === "current" ? null : (
                  <span className="sr-only">, {STAGE_NOTE[state]}</span>
                )}
              </p>
              {timestamp ? (
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  <time dateTime={submittedAt ?? undefined}>{timestamp}</time>
                </p>
              ) : null}
              {state === "current" ? (
                <p className="mt-0.5 text-[11px] font-medium leading-tight text-[var(--brand-primary)]">
                  Current
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StageMarker({ state }: { state: WithdrawalStageState }) {
  if (state === "complete") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white">
        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full border-2 border-[var(--brand-primary)] bg-card">
        <span className="size-2 rounded-full bg-[var(--brand-primary)]" />
      </span>
    );
  }

  return (
    <span className="flex size-6 items-center justify-center rounded-full border border-border bg-card">
      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
    </span>
  );
}

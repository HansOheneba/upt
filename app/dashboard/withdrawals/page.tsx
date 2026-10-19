"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeftRight, CircleCheck, Clock, ListChecks, Plus } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { KpiStrip, type KpiAccent } from "@/components/dashboard/kpi-strip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { WithdrawalDetailsSheet } from "@/components/pension/withdrawal-details";
import { WithdrawalForm } from "@/components/pension/withdrawal-form";
import {
  WithdrawalStatusBadge,
  WithdrawalTimeline,
} from "@/components/pension/withdrawal-status";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { formatGhs } from "@/lib/pension/metrics";
import type { Withdrawal } from "@/lib/pension/types";
import {
  summarizeWithdrawals,
  withdrawalExplanation,
  withdrawalSubmittedLabel,
} from "@/lib/pension/withdrawals";
import { usePensionStore } from "@/store/pensionStore";

export default function WithdrawalsPage() {
  const ready = usePensionReady();
  const member = usePensionStore((state) => state.member);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const loadError = usePensionStore((state) => state.loadError);
  const reload = usePensionStore((state) => state.reload);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("request");

  const selected = withdrawals.find((row) => row.id === selectedId) ?? null;
  const summary = summarizeWithdrawals(withdrawals);

  useEffect(() => {
    if (!open) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [open]);

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!ready || !requestedId) return;
    if (withdrawals.some((row) => row.id === requestedId)) {
      setSelectedId(requestedId);
    }
  }, [ready, requestedId, withdrawals]);

  return (
    <PensionPage>
      <PensionPageHeader
        title="Withdrawals"
        description="View your withdrawal requests and track their progress from submission to payment."
        action={
          member ? (
            <Button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? (
                "Close"
              ) : (
                <>
                  <Plus />
                  New withdrawal
                </>
              )}
            </Button>
          ) : null
        }
      />

      {open && member ? (
        <div ref={formRef}>
          <DashCard>
            <CardHeader>
              <CardTitle>New withdrawal</CardTitle>
              <CardDescription>
                Confirm the amount, why you need it, and where to send the payment. Sign
                before you submit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalForm member={member} onDone={() => setOpen(false)} />
            </CardContent>
          </DashCard>
        </div>
      ) : null}

      {!ready ? (
        <WithdrawalsLoading />
      ) : loadError ? (
        <DashboardEmptyState
          icon={<AlertCircle />}
          title="We could not load your withdrawals"
          description="Try loading your requests again."
          action={{ label: "Try again", onClick: reload }}
        />
      ) : withdrawals.length === 0 ? (
        <DashboardEmptyState
          icon={<ArrowLeftRight />}
          title="No withdrawal requests yet"
          description="When you submit a withdrawal request, you can track its progress here."
          action={
            member
              ? {
                  label: "New withdrawal",
                  icon: <Plus />,
                  onClick: () => setOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <>
          <WithdrawalSummary
            items={[
              { label: "Total requests", value: String(summary.total) },
              { label: "In progress", value: String(summary.inProgress) },
              { label: "Completed", value: String(summary.completed) },
            ]}
          />

          <section className="space-y-3" aria-labelledby="withdrawal-history-heading">
            <h2 id="withdrawal-history-heading" className={dashboardTheme.sectionLabel}>
              Withdrawal history
            </h2>
            <ul className="flex flex-col gap-3">
              {withdrawals.map((row) => (
                <li key={row.id}>
                  <WithdrawalCard row={row} onView={() => setSelectedId(row.id)} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <WithdrawalDetailsSheet
        withdrawal={selected}
        open={selected != null}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
      />
    </PensionPage>
  );
}

function WithdrawalCard({ row, onView }: { row: Withdrawal; onView: () => void }) {
  const submitted = withdrawalSubmittedLabel(row.submittedAt);
  const amount = Number.isFinite(row.amount) ? formatGhs(row.amount, 2) : "Amount unavailable";
  const reason = row.reason?.trim() || "Withdrawal";

  return (
    <DashCard className="py-4">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-medium capitalize tracking-tight">{reason}</h3>
            <p className="mt-1 text-xl font-medium tabular-nums tracking-tight">{amount}</p>
            {submitted ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted <time dateTime={row.submittedAt}>{submitted}</time>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Submission date unavailable</p>
            )}
          </div>
          <WithdrawalStatusBadge status={row.status} />
        </div>

        <WithdrawalTimeline status={row.status} submittedAt={row.submittedAt} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {withdrawalExplanation(row.status)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-start"
            aria-haspopup="dialog"
            aria-label={`View details for ${reason}`}
            onClick={onView}
          >
            View details
          </Button>
        </div>
      </CardContent>
    </DashCard>
  );
}

const withdrawalSummaryIcons = [ListChecks, Clock, CircleCheck];
const withdrawalSummaryAccents: KpiAccent[] = ["blue", "orange", "green"];

function WithdrawalSummary({
  items,
  loading = false,
}: {
  items: { label: string; value: string }[];
  loading?: boolean;
}) {
  return (
    <KpiStrip
      cols={3}
      loading={loading}
      items={items.map((item, index) => {
        const Icon = withdrawalSummaryIcons[index] ?? ListChecks;
        return {
          ...item,
          accent: withdrawalSummaryAccents[index] ?? "blue",
          icon: <Icon aria-hidden className="size-4" />,
        };
      })}
    />
  );
}

function WithdrawalsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading withdrawal requests</span>
      <WithdrawalSummary
        loading
        items={[
          { label: "Total requests", value: "" },
          { label: "In progress", value: "" },
          { label: "Completed", value: "" },
        ]}
      />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

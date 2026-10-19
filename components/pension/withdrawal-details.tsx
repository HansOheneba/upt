"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { formatGhs } from "@/lib/pension/metrics";
import type { Withdrawal } from "@/lib/pension/types";
import {
  maskPaymentIdentifier,
  paymentChannelLabel,
  withdrawalExplanation,
  withdrawalSubmittedLabel,
} from "@/lib/pension/withdrawals";
import { WithdrawalStatusBadge, WithdrawalTimeline } from "@/components/pension/withdrawal-status";

export function WithdrawalDetailsSheet({
  withdrawal,
  open,
  onOpenChange,
}: {
  withdrawal: Withdrawal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden sm:max-w-md">
        {withdrawal ? <WithdrawalDetailsBody withdrawal={withdrawal} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function WithdrawalDetailsBody({ withdrawal }: { withdrawal: Withdrawal }) {
  const submitted = withdrawalSubmittedLabel(withdrawal.submittedAt);
  const amount = Number.isFinite(withdrawal.amount) ? formatGhs(withdrawal.amount, 2) : null;
  const masked = maskPaymentIdentifier(withdrawal.destination);
  const submittedDetails = submittedDetailRows(withdrawal);

  return (
    <>
      <SheetHeader className="border-b border-border/70 px-6 py-5 pr-12">
        <p className={dashboardTheme.sectionLabel}>Withdrawal</p>
        <SheetTitle className="mt-2 text-xl font-medium tracking-tight">
          {withdrawal.reason || "Withdrawal"}
        </SheetTitle>
        <SheetDescription className="text-foreground">
          <span className="text-lg font-medium tabular-nums tracking-tight">
            {amount ?? "Amount unavailable"}
          </span>
        </SheetDescription>
        <div className="mt-2">
          <WithdrawalStatusBadge status={withdrawal.status} />
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <section>
          <h3 className={dashboardTheme.sectionLabel}>Latest update</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {withdrawalExplanation(withdrawal.status)}
          </p>
        </section>

        <section>
          <h3 className={dashboardTheme.sectionLabel}>Progress</h3>
          <div className="mt-3">
            <WithdrawalTimeline
              status={withdrawal.status}
              submittedAt={withdrawal.submittedAt}
              layout="stacked"
            />
          </div>
        </section>

        <section>
          <h3 className={dashboardTheme.sectionLabel}>Request</h3>
          <dl className="mt-2">
            <Fact label="Reference" value={withdrawal.id} mono />
            <Fact label="Submitted" value={submitted ?? "Date unavailable"} />
            <Fact label="Pay to" value={paymentChannelLabel(withdrawal.destinationType)} />
            <Fact label="Account" value={masked ?? "Not provided"} />
          </dl>
        </section>

        {withdrawal.signatureDataUrl ? (
          <section>
            <h3 className={dashboardTheme.sectionLabel}>Signature</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={withdrawal.signatureDataUrl}
              alt={`Signature submitted for ${withdrawal.reason || "this withdrawal"}`}
              className="mt-3 h-20 w-48 rounded-md border bg-white object-contain"
            />
          </section>
        ) : null}

        {submittedDetails.length > 0 ? (
          <section>
            <h3 className={dashboardTheme.sectionLabel}>Details submitted with this request</h3>
            <dl className="mt-2">
              {submittedDetails.map((row) => (
                <Fact key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </>
  );
}

function submittedDetailRows(withdrawal: Withdrawal): { label: string; value: string }[] {
  const rows = [
    ["Name", withdrawal.name],
    ["Mobile", withdrawal.mobile],
    ["Profession", withdrawal.profession],
    ["Location", withdrawal.location],
    ["Next of kin", withdrawal.nextOfKin],
    ["Next of kin contact", withdrawal.nextOfKinContact],
  ] as const;

  return rows
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([label, value]) => ({ label, value: value.trim() }));
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? "min-w-0 break-all text-right font-mono text-xs" : "text-right text-sm font-medium"}>
        {value}
      </dd>
    </div>
  );
}

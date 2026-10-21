"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeftRight, Plus, SearchX } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { WithdrawalDetailsSheet } from "@/components/pension/withdrawal-details";
import { WithdrawalForm } from "@/components/pension/withdrawal-form";
import {
  WithdrawalStatusBadge,
  WithdrawalTimeline,
} from "@/components/pension/withdrawal-status";
import { formatGhs } from "@/lib/pension/metrics";
import { withdrawalHoldReason, withdrawalPot } from "@/lib/pension/portfolio";
import type { Contribution, Membership, Withdrawal } from "@/lib/pension/types";
import {
  WITHDRAWAL_BADGE_LABEL,
  WITHDRAWAL_PAGE_SIZE,
  filterWithdrawals,
  withdrawalExplanation,
  withdrawalFollowUp,
  withdrawalStatusUpdatedAt,
  withdrawalSubmittedLabel,
} from "@/lib/pension/withdrawals";
import { usePensionStore } from "@/store/pensionStore";

export default function WithdrawalsPage() {
  const ready = usePensionReady();
  const member = usePensionStore((state) => state.member);
  const memberships = usePensionStore((state) => state.memberships);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const loadError = usePensionStore((state) => state.loadError);
  const reload = usePensionStore((state) => state.reload);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schemeFilter, setSchemeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(WITHDRAWAL_PAGE_SIZE);
  const formRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("request");
  const requestedMembership = searchParams.get("membership");
  const openedFromQuery = useRef(false);

  const eligible = useMemo(
    () =>
      memberships.filter(
        (membership) => withdrawalPot(membership, contributions, withdrawals) != null,
      ),
    [memberships, contributions, withdrawals],
  );
  const schemeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const membership of memberships) map.set(membership.id, membership.schemeName);
    return map;
  }, [memberships]);
  const membershipById = useMemo(() => {
    const map = new Map<string, Membership>();
    for (const membership of memberships) map.set(membership.id, membership);
    return map;
  }, [memberships]);
  const filtered = useMemo(
    () => filterWithdrawals(withdrawals, { membershipId: schemeFilter, status: statusFilter }),
    [withdrawals, schemeFilter, statusFilter],
  );
  const visible = filtered.slice(0, visibleCount);

  const selected = withdrawals.find((row) => row.id === selectedId) ?? null;

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

  useEffect(() => {
    setVisibleCount(WITHDRAWAL_PAGE_SIZE);
  }, [schemeFilter, statusFilter]);

  useEffect(() => {
    if (openedFromQuery.current || !ready || !requestedMembership) return;
    openedFromQuery.current = true;
    if (eligible.some((membership) => membership.id === requestedMembership)) {
      setOpen(true);
    }
  }, [ready, requestedMembership, eligible]);

  return (
    <PensionPage>
      <PensionPageHeader
        title="Withdrawals"
        description="Request a payout from one membership and follow it from submission to payment."
        action={
          eligible.length > 0 ? (
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

      {open && member && eligible.length > 0 ? (
        <div ref={formRef}>
          <DashCard>
            <CardHeader>
              <CardTitle>New withdrawal</CardTitle>
              <CardDescription>A submitted request is not a payment.</CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalForm
                member={member}
                memberships={memberships}
                initialMembershipId={requestedMembership}
                onDone={(withdrawal) => {
                  setOpen(false);
                  setSelectedId(withdrawal.id);
                }}
              />
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
      ) : (
        <>
          {eligible.length === 0 && memberships.length > 0 ? (
            <HeldMemberships memberships={memberships} contributions={contributions} withdrawals={withdrawals} />
          ) : null}
          {withdrawals.length === 0 ? (
            <DashboardEmptyState
              icon={<ArrowLeftRight />}
              title="No withdrawal requests yet"
              description={
                eligible.length > 0
                  ? "Requests show up here. A request is not a payment."
                  : "You can request one when a scheme has an amount available."
              }
              action={
                eligible.length > 0
                  ? {
                      label: "New withdrawal",
                      icon: <Plus />,
                      onClick: () => setOpen(true),
                    }
                  : {
                      label: "View schemes",
                      href: "/dashboard/schemes",
                    }
              }
            />
          ) : (
            <section className="space-y-3" aria-labelledby="withdrawal-history-heading">
              <h2 id="withdrawal-history-heading" className="sr-only">
                Withdrawal history
              </h2>
              <WithdrawalFilters
                memberships={memberships}
                schemeFilter={schemeFilter}
                statusFilter={statusFilter}
                onScheme={setSchemeFilter}
                onStatus={setStatusFilter}
              />
              <p className="sr-only" aria-live="polite">
                {filtered.length === 0
                  ? "No requests match these filters."
                  : `${visible.length} of ${filtered.length} requests shown.`}
              </p>
              {filtered.length === 0 ? (
                <DashboardEmptyState
                  icon={<SearchX />}
                  title="No matching requests"
                  description="Try another scheme or status."
                  action={{
                    label: "Clear filters",
                    onClick: () => {
                      setSchemeFilter("all");
                      setStatusFilter("all");
                    },
                  }}
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {visible.map((row) => {
                    const membership = membershipById.get(row.membershipId);
                    return (
                      <li key={row.id}>
                        <WithdrawalCard
                          row={row}
                          schemeName={schemeNames.get(row.membershipId) ?? "Scheme"}
                          membershipReference={membership?.memberNumber || row.membershipId}
                          onView={() => setSelectedId(row.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              {visible.length < filtered.length ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVisibleCount((count) => count + WITHDRAWAL_PAGE_SIZE)}
                >
                  Load more
                </Button>
              ) : null}
            </section>
          )}
        </>
      )}

      <WithdrawalDetailsSheet
        withdrawal={selected}
        schemeName={selected ? schemeNames.get(selected.membershipId) ?? "Scheme" : undefined}
        membershipReference={
          selected
            ? membershipById.get(selected.membershipId)?.memberNumber || selected.membershipId
            : undefined
        }
        open={selected != null}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
      />
    </PensionPage>
  );
}

function WithdrawalCard({
  row,
  schemeName,
  membershipReference,
  onView,
}: {
  row: Withdrawal;
  schemeName: string;
  membershipReference: string;
  onView: () => void;
}) {
  const submitted = withdrawalSubmittedLabel(row.submittedAt);
  const updatedAt = withdrawalStatusUpdatedAt(row);
  const updated = withdrawalSubmittedLabel(updatedAt);
  const amount = Number.isFinite(row.amount) ? formatGhs(row.amount, 2) : "Amount unavailable";
  const reason = row.reason?.trim() || "Withdrawal";
  const followUp = withdrawalFollowUp(row);

  return (
    <DashCard className="py-4">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-medium tracking-tight">{reason}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {schemeName}
              {membershipReference ? ` · ${membershipReference}` : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{row.id}</p>
            <p className="mt-1 text-xl font-medium tabular-nums tracking-tight">{amount}</p>
            {submitted ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted <time dateTime={row.submittedAt}>{submitted}</time>
              </p>
            ) : null}
            {updated && updatedAt !== row.submittedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Updated <time dateTime={updatedAt ?? undefined}>{updated}</time>
              </p>
            ) : null}
          </div>
          <WithdrawalStatusBadge status={row.status} />
        </div>

        <WithdrawalTimeline
          status={row.status}
          submittedAt={row.submittedAt}
          events={row.events}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl space-y-1">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {withdrawalExplanation(row.status)}
            </p>
            {followUp ? <p className="text-sm leading-relaxed text-foreground">{followUp}</p> : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-start"
            aria-haspopup="dialog"
            aria-label={`View details for ${reason}, reference ${row.id}`}
            onClick={onView}
          >
            View details
          </Button>
        </div>
      </CardContent>
    </DashCard>
  );
}

function WithdrawalFilters({
  memberships,
  schemeFilter,
  statusFilter,
  onScheme,
  onStatus,
}: {
  memberships: Membership[];
  schemeFilter: string;
  statusFilter: string;
  onScheme: (value: string) => void;
  onStatus: (value: string) => void;
}) {
  const statuses = ["received", "checking", "approved", "paid", "declined"] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="wd-filter-scheme">Scheme</Label>
        <Select value={schemeFilter} onValueChange={onScheme}>
          <SelectTrigger id="wd-filter-scheme" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All schemes</SelectItem>
            {memberships.map((membership) => (
              <SelectItem key={membership.id} value={membership.id}>
                {membership.schemeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wd-filter-status">Status</Label>
        <Select value={statusFilter} onValueChange={onStatus}>
          <SelectTrigger id="wd-filter-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {WITHDRAWAL_BADGE_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function HeldMemberships({
  memberships,
  contributions,
  withdrawals,
}: {
  memberships: Membership[];
  contributions: Contribution[];
  withdrawals: Withdrawal[];
}) {
  return (
    <DashCard>
      <CardHeader>
        <CardTitle>Nothing available to withdraw</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {memberships.map((membership) => (
            <li key={membership.id}>
              {membership.schemeName}:{" "}
              {withdrawalHoldReason(membership, contributions, withdrawals) ?? "Available"}
            </li>
          ))}
        </ul>
      </CardContent>
    </DashCard>
  );
}

function WithdrawalsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading withdrawal requests</span>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

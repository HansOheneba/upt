"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  finalizeAmountInput,
  formatAmountTyping,
  formatGhs,
  memberName,
  parseAmountInput,
} from "@/lib/pension/metrics";
import {
  figuresForMembership,
  membershipKindLabel,
  withdrawalHoldReason,
  withdrawalPot,
} from "@/lib/pension/portfolio";
import type { Membership, PensionMember, Withdrawal, WithdrawalDestination } from "@/lib/pension/types";
import {
  WITHDRAWAL_AUTHORIZATION_STATEMENT,
  WITHDRAWAL_REASONS,
  maskPaymentIdentifier,
  paymentChannelLabel,
  registeredBank,
  registeredDetailGaps,
  registeredMomoNumber,
} from "@/lib/pension/withdrawals";
import { usePensionStore } from "@/store/pensionStore";

type PayChoice = "registered-momo" | "bank";
type Step = "request" | "review" | "sent";

type WithdrawalFormProps = {
  member: PensionMember;
  memberships: Membership[];
  initialMembershipId?: string | null;
  onDone: (withdrawal: Withdrawal) => void;
};

export function WithdrawalForm({
  member,
  memberships,
  initialMembershipId,
  onDone,
}: WithdrawalFormProps) {
  const addWithdrawal = usePensionStore((state) => state.addWithdrawal);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const eligible = memberships.filter(
    (row) => withdrawalPot(row, contributions, withdrawals) != null,
  );
  const held = memberships.filter((row) => !eligible.some((item) => item.id === row.id));
  const registeredMobile = registeredMomoNumber(member);
  const bank = registeredBank(member);
  const initial =
    eligible.find((row) => row.id === initialMembershipId)?.id ?? eligible[0]?.id ?? "";
  const [step, setStep] = useState<Step>("request");
  const [membershipId, setMembershipId] = useState(initial);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<(typeof WITHDRAWAL_REASONS)[number]>(WITHDRAWAL_REASONS[0]);
  const [reasonDetail, setReasonDetail] = useState("");
  const [payChoice, setPayChoice] = useState<PayChoice>(registeredMobile ? "registered-momo" : "bank");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Withdrawal | null>(null);
  const idempotencyKey = useRef("");
  const lock = useRef(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLTextAreaElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorId = useId();

  const selected = eligible.find((row) => row.id === membershipId) ?? null;
  const figures = selected ? figuresForMembership(selected, contributions, withdrawals) : null;
  const available = selected ? withdrawalPot(selected, contributions, withdrawals) : null;
  const parsed = parseAmountInput(amount);
  const amountReady =
    available != null &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    Math.round(parsed * 100) <= Math.round(available * 100);
  const gaps = registeredDetailGaps(member);
  const destinationType: WithdrawalDestination = payChoice === "bank" ? "bank" : "momo";
  const destination = payChoice === "bank" ? (bank?.account ?? "") : (registeredMobile ?? "");
  const reserved =
    figures?.value != null && available != null
      ? Math.round((figures.value - available) * 100) / 100
      : null;

  useEffect(() => {
    if (step === "review") reviewHeadingRef.current?.focus();
    if (step === "sent") sentHeadingRef.current?.focus();
  }, [step]);

  function validateRequest(): { message: string; focus: "amount" | "detail" | null } | null {
    if (!selected || available == null) {
      return { message: "Choose a scheme with an amount available.", focus: null };
    }
    if (gaps.length > 0) {
      return {
        message: `Update ${gaps.join(", ")} before you can send this request.`,
        focus: null,
      };
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { message: "Enter an amount greater than zero.", focus: "amount" };
    }
    if (Math.round(parsed * 100) > Math.round(available * 100)) {
      return {
        message: `You can request up to ${formatGhs(available, 2)}.`,
        focus: "amount",
      };
    }
    if (reason === "Other" && !reasonDetail.trim()) {
      return { message: "Add an explanation.", focus: "detail" };
    }
    if (reasonDetail.trim().length > 500) {
      return { message: "Use 500 characters or fewer.", focus: "detail" };
    }
    if (payChoice === "registered-momo" && !registeredMobile) {
      return {
        message: "Add a registered mobile number before using Mobile Money.",
        focus: null,
      };
    }
    if (payChoice === "bank" && !bank) {
      return { message: "Add a registered bank before paying to a bank.", focus: null };
    }
    return null;
  }

  function focusProblem(focus: "amount" | "detail" | null) {
    if (focus === "amount") amountRef.current?.focus();
    if (focus === "detail") detailRef.current?.focus();
  }

  function review(event: React.FormEvent) {
    event.preventDefault();
    const problem = validateRequest();
    setError(problem?.message ?? null);
    if (problem) {
      focusProblem(problem.focus);
      return;
    }
    if (!idempotencyKey.current) idempotencyKey.current = `wd-${crypto.randomUUID()}`;
    setStep("review");
  }

  function backToEdit() {
    if (lock.current) return;
    idempotencyKey.current = "";
    setAuthorized(false);
    setError(null);
    setStep("request");
  }

  function submit() {
    if (lock.current || !selected || available == null) return;
    const problem = validateRequest();
    if (problem) {
      setError(problem.message);
      setStep("request");
      focusProblem(problem.focus);
      return;
    }
    if (!authorized) {
      setError("Confirm the statement before you send this request.");
      return;
    }
    lock.current = true;
    setSubmitting(true);
    setError(null);
    const result = addWithdrawal({
      membershipId: selected.id,
      amount: parsed,
      reason,
      reasonDetail,
      destinationType,
      destination,
      authorized: true,
      idempotencyKey: idempotencyKey.current,
    });
    if (!result.ok) {
      lock.current = false;
      setSubmitting(false);
      setError(result.error);
      return;
    }
    setCreated(result.withdrawal);
    setStep("sent");
  }

  if (step === "sent" && created && selected) {
    return (
      <div className="space-y-4" role="status">
        <div>
          <h3 ref={sentHeadingRef} tabIndex={-1} className="text-base font-medium outline-none">
            Request received
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {formatGhs(created.amount, 2)} from {selected.schemeName} is in for review. Reference{" "}
            {created.id}.
          </p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Readout label="Status" value="Received" />
          <Readout label="Scheme" value={selected.schemeName} />
          <Readout label="Amount" value={formatGhs(created.amount, 2)} />
          <Readout label="Membership" value={selected.memberNumber || selected.id} />
        </dl>
        <Button type="button" onClick={() => onDone(created)}>
          View request
        </Button>
      </div>
    );
  }

  if (step === "review" && selected && available != null) {
    const masked = maskPaymentIdentifier(destination);
    return (
      <div className="space-y-5">
        <div>
          <h3 ref={reviewHeadingRef} tabIndex={-1} className="text-base font-medium outline-none">
            Review this request
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Submitting starts a review. It is not a payment.
          </p>
        </div>
        <AmountSummary
          requested={parsed}
          available={available}
          reserved={reserved}
          valid
        />
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Readout label="Scheme" value={selected.schemeName} />
          <Readout label="Membership" value={selected.memberNumber || selected.id} />
          <Readout label="Reason" value={reason} />
          {reason === "Other" ? (
            <Readout label="Explanation" value={reasonDetail.trim()} />
          ) : null}
          <Readout
            label="Payment"
            value={
              payChoice === "bank" && bank
                ? `${bank.name} · ${masked ?? "Unavailable"}`
                : `${paymentChannelLabel(destinationType)} · ${masked ?? "Unavailable"}`
            }
          />
        </dl>
        <div className="flex items-start gap-3">
          <Checkbox
            id="wd-authorize"
            checked={authorized}
            disabled={submitting}
            onCheckedChange={(value) => {
              setAuthorized(value === true);
              setError(null);
            }}
          />
          <Label htmlFor="wd-authorize" className="text-sm font-normal leading-relaxed">
            {WITHDRAWAL_AUTHORIZATION_STATEMENT}
          </Label>
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={backToEdit}>
            Back to edit
          </Button>
          <Button type="button" disabled={submitting} onClick={submit}>
            {submitting ? "Sending request" : "Confirm request"}
          </Button>
        </div>
      </div>
    );
  }

  const amountInvalid = amount.trim().length > 0 && available != null && !amountReady;
  const detailInvalid = reason === "Other" && error === "Add an explanation.";

  return (
    <form onSubmit={review} className="grid gap-6" noValidate>
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Scheme</h3>
        {eligible.length > 1 ? (
          <div className="space-y-2">
            <Label htmlFor="wd-scheme" className="sr-only">
              Membership
            </Label>
            <Select
              value={membershipId}
              onValueChange={(value) => {
                setMembershipId(value);
                setAmount("");
                setError(null);
              }}
            >
              <SelectTrigger id="wd-scheme" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.schemeName}
                    {row.memberNumber ? ` · ${row.memberNumber}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm font-medium">
            {selected?.schemeName ?? "No scheme available"}
            {selected?.memberNumber ? ` · ${selected.memberNumber}` : ""}
          </p>
        )}
        {selected && figures ? (
          <dl className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
            <Readout label="Scheme" value={selected.schemeName} />
            <Readout label="Membership reference" value={selected.memberNumber || selected.id} />
            <Readout label="Type" value={membershipKindLabel(selected)} />
            <Readout label="Status" value={selected.status === "closed" ? "Closed" : "Active"} />
            <Readout
              label="Current value"
              value={figures.value != null ? formatGhs(figures.value, 2) : "Unavailable"}
            />
            <Readout
              label="Available to request"
              value={available != null ? formatGhs(available, 2) : "Unavailable"}
            />
          </dl>
        ) : null}
        {selected && reserved != null && reserved > 0 ? (
          <p className="text-sm text-muted-foreground">
            {formatGhs(reserved, 2)} is already in open requests.
          </p>
        ) : null}
        {held.length > 0 ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {held.map((row) => (
              <li key={row.id}>
                {row.schemeName}: {withdrawalHoldReason(row, contributions, withdrawals)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-medium">Your registered details</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              From your account. Not edited here.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/requests">Update profile</Link>
          </Button>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Readout label="Full name" value={displayValue(memberName(member))} />
          <Readout
            label="Membership reference"
            value={displayValue(selected?.memberNumber || selected?.id || "")}
          />
          <Readout label="Registered contact number" value={displayValue(member.mobile)} />
          <Readout label="Profession" value={displayValue(member.profession)} />
          <Readout label="Location" value={displayValue(member.location)} />
          <Readout label="Next of kin" value={displayValue(member.nextOfKin)} />
          <Readout label="Next of kin contact" value={displayValue(member.nextOfKinContact)} />
        </dl>
        {gaps.length > 0 ? (
          <p role="alert" className="text-sm text-destructive">
            Update {gaps.join(", ")} before you can send this request.
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium">This request</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wd-amount">Amount (GHS)</Label>
            <Input
              ref={amountRef}
              id="wd-amount"
              inputMode="decimal"
              aria-invalid={amountInvalid || undefined}
              aria-describedby={amountInvalid ? errorId : "wd-amount-hint"}
              value={formatAmountTyping(amount)}
              onChange={(event) => {
                setAmount(formatAmountTyping(event.target.value));
                setError(null);
              }}
              onBlur={(event) => setAmount(finalizeAmountInput(event.currentTarget.value))}
            />
            {available != null ? (
              <p id="wd-amount-hint" className="text-xs text-muted-foreground">
                Up to {formatGhs(available, 2)}.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="wd-reason">Reason</Label>
            <Select
              value={reason}
              onValueChange={(value) => {
                if (isReason(value)) setReason(value);
                setError(null);
              }}
            >
              <SelectTrigger id="wd-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WITHDRAWAL_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {reason === "Other" ? (
          <div className="space-y-2">
            <Label htmlFor="wd-reason-detail">Explanation</Label>
            <Textarea
              ref={detailRef}
              id="wd-reason-detail"
              value={reasonDetail}
              maxLength={500}
              aria-invalid={detailInvalid || undefined}
              aria-describedby={detailInvalid ? errorId : undefined}
              onChange={(event) => {
                setReasonDetail(event.target.value);
                setError(null);
              }}
            />
          </div>
        ) : null}
        {amount.trim() && available != null && selected && !amountReady ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {!Number.isFinite(parsed) || parsed <= 0
              ? "Enter an amount greater than zero."
              : `You can request up to ${formatGhs(available, 2)}.`}
          </p>
        ) : null}
        {amountReady && available != null ? (
          <AmountSummary requested={parsed} available={available} reserved={null} valid />
        ) : null}
        <div className="space-y-2">
          <Label id="wd-pay-label">Pay to</Label>
          <div role="radiogroup" aria-labelledby="wd-pay-label" className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              role="radio"
              aria-checked={payChoice === "registered-momo"}
              variant={payChoice === "registered-momo" ? "default" : "outline"}
              className="w-full"
              disabled={!registeredMobile}
              onClick={() => {
                setPayChoice("registered-momo");
                setError(null);
              }}
            >
              Mobile Money
            </Button>
            <Button
              type="button"
              role="radio"
              aria-checked={payChoice === "bank"}
              variant={payChoice === "bank" ? "default" : "outline"}
              className="w-full"
              disabled={!bank}
              onClick={() => {
                setPayChoice("bank");
                setError(null);
              }}
            >
              Bank
            </Button>
          </div>
        </div>
        {payChoice === "registered-momo" && registeredMobile ? (
          <dl className="rounded-xl border border-border bg-card p-4 text-sm">
            <Readout label="Registered Mobile Money" value={registeredMobile} />
          </dl>
        ) : null}
        {payChoice === "bank" && bank ? (
          <dl className="rounded-xl border border-border bg-card p-4 text-sm">
            <Readout label="Bank" value={bank.name} />
            <Readout label="Account" value={bank.account} />
          </dl>
        ) : null}
        {payChoice === "bank" ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/requests" className="underline underline-offset-4">
              Update your registered bank
            </Link>{" "}
            to use a different account.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/requests" className="underline underline-offset-4">
              Update your registered mobile
            </Link>{" "}
            to use a different Mobile Money number.
          </p>
        )}
      </section>

      {error && !amountInvalid ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={gaps.length > 0 || !amountReady}>
          Review request
        </Button>
      </div>
    </form>
  );
}

function isReason(value: string): value is (typeof WITHDRAWAL_REASONS)[number] {
  return (WITHDRAWAL_REASONS as readonly string[]).includes(value);
}

function displayValue(value: string): string {
  return value.trim() ? value.trim() : "Not on your account";
}

function Readout({ label, value }: { label: string; value: string }) {
  const missing = value === "Not on your account" || value === "Unavailable";
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={missing ? "mt-1 text-sm text-muted-foreground" : "mt-1 text-sm font-medium"}>
        {value}
      </dd>
    </div>
  );
}

function AmountSummary({
  requested,
  available,
  reserved,
  valid,
}: {
  requested: number;
  available: number;
  reserved: number | null;
  valid: boolean;
}) {
  const remaining = valid ? Math.round((available - requested) * 100) / 100 : null;
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Readout label="Requested" value={formatGhs(requested, 2)} />
        <Readout label="Available to request" value={formatGhs(available, 2)} />
        {remaining != null ? (
          <Readout label="Estimated remaining" value={formatGhs(remaining, 2)} />
        ) : null}
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        {reserved != null && reserved > 0 ? `${formatGhs(reserved, 2)} is already in open requests. ` : null}
        Estimate only. Your balance does not change until this is paid.
      </p>
    </div>
  );
}

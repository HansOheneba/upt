import Link from "next/link";
import { ArrowRight, Building2, UserRound } from "lucide-react";
import { formatGhs, formatPensionDate, formatUnits } from "@/lib/pension/metrics";
import {
  hasAgreedMonthly,
  hasUnitPrice,
  membershipKindLabel,
  type MembershipFigures,
} from "@/lib/pension/portfolio";
import type { Membership } from "@/lib/pension/types";

export function schemeHref(membership: Membership): string {
  return `/dashboard/schemes/${encodeURIComponent(membership.id)}`;
}

function cardAccent(membership: Membership): string {
  if (membership.status === "closed") return "#8A93A3";
  return membership.kind === "employer" ? "#2FA58A" : "#4C7DFF";
}

export function SchemeCard({ figures }: { figures: MembershipFigures }) {
  const { membership, units, value } = figures;
  const priced = hasUnitPrice(membership);
  const monthly = hasAgreedMonthly(membership) ? membership.monthlyContribution : null;
  const closed = membership.status === "closed";
  const accent = cardAccent(membership);
  const Icon = membership.kind === "employer" ? Building2 : UserRound;
  const hint = [
    membershipKindLabel(membership),
    membership.kind === "employer" && membership.employerName ? membership.employerName : null,
    closed ? "Closed" : "Active",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={schemeHref(membership)}
      className="flex h-full flex-col rounded-xl border border-border p-4 transition-[border-color] duration-150 hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 14%, white) 0%, #ffffff 58%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">{membership.schemeName}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {value != null ? formatGhs(value, 2) : "Value unavailable"}
          </p>
        </div>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-md"
          style={{
            background: `color-mix(in srgb, ${accent} 16%, white)`,
            color: accent,
          }}
        >
          <Icon aria-hidden className="size-4" />
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Current value of units held in this membership.
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Units held</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">
            {units != null ? formatUnits(units) : "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Unit price</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">
            {priced ? formatGhs(membership.unitPrice, 4) : "Unavailable"}
          </dd>
          {priced && membership.unitPriceDate ? (
            <dd className="text-muted-foreground">{formatPensionDate(membership.unitPriceDate)}</dd>
          ) : null}
        </div>
        {monthly != null ? (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Agreed monthly contribution</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">{formatGhs(monthly, 2)}</dd>
          </div>
        ) : null}
      </dl>

      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-[var(--brand-primary)]">
        View scheme
        <ArrowRight aria-hidden className="size-3.5" />
      </span>
    </Link>
  );
}

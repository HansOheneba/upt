import Link from "next/link";
import { formatGhs } from "@/lib/pension/metrics";
import { formatShare, type AllocationSlice } from "@/lib/pension/portfolio";
import { schemeHref } from "@/components/pension/scheme-card";
import { cn } from "@/lib/utils";

const SWATCHES = [
  { color: "#1E3059", stripe: false },
  { color: "#3E5278", stripe: true },
  { color: "#6E7C90", stripe: false },
  { color: "#A8B0BC", stripe: true },
] as const;

function swatchStyle(index: number): { backgroundColor: string; backgroundImage?: string } {
  const swatch = SWATCHES[index % SWATCHES.length];
  return {
    backgroundColor: swatch.color,
    backgroundImage: swatch.stripe
      ? "repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,0.45) 3px, rgba(255,255,255,0.45) 5px)"
      : undefined,
  };
}

export function PortfolioAllocation({
  slices,
  className,
}: {
  slices: AllocationSlice[];
  className?: string;
}) {
  if (slices.length === 0) return null;
  const painted = slices
    .map((slice, index) => ({ slice, index }))
    .filter(({ slice }) => slice.value > 0 && slice.percent > 0);

  return (
    <div className={cn("mt-5", className)}>
      <h3 className="text-sm font-medium">Allocation by scheme</h3>
      {painted.length > 1 ? (
        <div
          className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted"
          aria-hidden="true"
        >
          {painted.map(({ slice, index }) => (
            <Link
              key={slice.membership.id}
              href={schemeHref(slice.membership)}
              tabIndex={-1}
              style={{ ...swatchStyle(index), width: `${slice.percent}%` }}
              className="h-full min-w-1 focus-visible:outline-none"
            />
          ))}
        </div>
      ) : null}
      <ul className="mt-3 flex flex-col gap-2">
        {slices.map((slice, index) => (
          <li key={slice.membership.id}>
            <Link
              href={schemeHref(slice.membership)}
              className="flex items-center gap-3 rounded-md py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-sm ring-1 ring-foreground/15"
                style={swatchStyle(index)}
              />
              <span className="min-w-0 flex-1 truncate">{slice.membership.schemeName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatGhs(slice.value, 2)} · {formatShare(slice.percent)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

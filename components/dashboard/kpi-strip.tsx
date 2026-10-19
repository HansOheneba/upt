import * as React from "react";
import { Banknote, Info, Layers, Tag, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUiLabel } from "@/lib/format-ui-label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type KpiAccent =
  | "blue"
  | "indigo"
  | "green"
  | "orange"
  | "purple"
  | "teal";

export type KpiItem = {
  label: string;
  value: string;
  subline?: string;
  tone?: "good" | "warning" | "danger" | "neutral";
  /** Tints the icon. Omitted cards cycle through the four summary colours. */
  accent?: KpiAccent;
  icon?: React.ReactNode;
  onClick?: () => void;
  tooltip?: React.ReactNode;
};

type CardTone = "blue" | "green" | "gold" | "violet";

const cardTones: Record<CardTone, { tint: string; icon: string; fallback: LucideIcon }> = {
  blue: {
    tint: "bg-[color-mix(in_srgb,var(--brand-primary)_8%,white)]",
    icon: "text-[var(--brand-primary)]",
    fallback: Wallet,
  },
  green: { tint: "bg-[#E7F2EB]", icon: "text-[#3E6B52]", fallback: Layers },
  gold: { tint: "bg-[#F6F1E4]", icon: "text-[#8C7344]", fallback: Banknote },
  violet: { tint: "bg-[#F1EEF6]", icon: "text-[#5E5678]", fallback: Tag },
};

const toneCycle: CardTone[] = ["blue", "green", "gold", "violet"];

function toneFor(accent: KpiAccent | undefined, index: number): CardTone {
  switch (accent) {
    case "blue":
      return "blue";
    case "indigo":
    case "purple":
      return "violet";
    case "green":
    case "teal":
      return "green";
    case "orange":
      return "gold";
    default:
      return toneCycle[index % toneCycle.length];
  }
}

function KpiInfoTip({ content }: { content: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 cursor-help rounded-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
          aria-label="About this metric"
          onClick={(event) => event.stopPropagation()}
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 p-3 text-xs leading-relaxed"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

interface KpiStripProps {
  items: KpiItem[];
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  loading?: boolean;
}

const colsClass: Record<NonNullable<KpiStripProps["cols"]>, string> = {
  2: "grid-cols-1 @xl/dash:grid-cols-2",
  3: "grid-cols-1 @xl/dash:grid-cols-3",
  4: "grid-cols-1 @xl/dash:grid-cols-2 @4xl/dash:grid-cols-4",
  5: "grid-cols-1 @xl/dash:grid-cols-2 @3xl/dash:grid-cols-3 @5xl/dash:grid-cols-5",
  6: "grid-cols-1 @xl/dash:grid-cols-2 @3xl/dash:grid-cols-3 @5xl/dash:grid-cols-6",
};

export function KpiStrip({
  items,
  cols = 6,
  className,
  loading,
}: KpiStripProps) {
  return (
    <div className={cn("grid gap-3", colsClass[cols], className)}>
      {items.map((item, index) => (
        <KpiCard key={item.label} item={item} index={index} loading={loading} />
      ))}
    </div>
  );
}

function KpiCard({
  item,
  index,
  loading,
}: {
  item: KpiItem;
  index: number;
  loading?: boolean;
}) {
  const tone = cardTones[toneFor(item.accent, index)];
  const Fallback = tone.fallback;
  const valueClass =
    item.tone === "danger"
      ? "text-destructive"
      : item.tone === "warning"
        ? "text-amber-700"
        : "text-foreground";

  function activate() {
    item.onClick?.();
  }

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10",
        item.onClick && "cursor-pointer transition-colors duration-150 ease-out hover:bg-muted/40",
      )}
      role={item.onClick ? "button" : undefined}
      tabIndex={item.onClick ? 0 : undefined}
      onClick={item.onClick ? activate : undefined}
      onKeyDown={
        item.onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-h-10 min-w-0 items-start gap-1">
          <p className="text-xs font-medium leading-5 text-muted-foreground">
            {formatUiLabel(item.label)}
          </p>
          {item.tooltip ? <KpiInfoTip content={item.tooltip} /> : null}
        </div>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
            tone.tint,
            tone.icon,
          )}
        >
          {item.icon ?? <Fallback aria-hidden className="size-4" />}
        </span>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-32" />
        </>
      ) : (
        <>
          <p className={cn("mt-3 text-xl font-semibold tabular-nums tracking-tight", valueClass)}>
            {item.value}
          </p>
          <p className="mt-1.5 min-h-5 text-xs leading-5 text-muted-foreground">
            {item.subline ?? ""}
          </p>
        </>
      )}
    </article>
  );
}

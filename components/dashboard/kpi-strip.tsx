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
  /** 0 to 100. Draws a thin bar in the card colour. */
  progress?: number;
  tone?: "good" | "warning" | "danger" | "neutral";
  /** Tints the icon. Omitted cards cycle through the four summary colours. */
  accent?: KpiAccent;
  icon?: React.ReactNode;
  /** Extra control, such as an edit action. Kept out of the card click target. */
  action?: React.ReactNode;
  onClick?: () => void;
  tooltip?: React.ReactNode;
};

type CardTone = "blue" | "green" | "gold" | "violet";

const cardTones: Record<CardTone, { color: string; fallback: LucideIcon }> = {
  blue: { color: "#4C7DFF", fallback: Wallet },
  green: { color: "#2FA58A", fallback: Layers },
  gold: { color: "#E0A23A", fallback: Banknote },
  violet: { color: "#8B7CF8", fallback: Tag },
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
  const wash = `linear-gradient(165deg, color-mix(in srgb, ${tone.color} 14%, white) 0%, #ffffff 58%)`;

  function activate() {
    item.onClick?.();
  }

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border border-border p-4 text-left",
        item.onClick &&
          "cursor-pointer transition-[border-color] duration-150 ease-out hover:border-transparent",
      )}
      style={{ background: wash }}
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
        <div className="min-w-0 space-y-1">
          <div className="flex items-start gap-1">
            <p className="text-xs leading-5 text-muted-foreground">
              {formatUiLabel(item.label)}
            </p>
            {item.tooltip ? <KpiInfoTip content={item.tooltip} /> : null}
          </div>
          {loading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className={cn("text-2xl font-semibold tabular-nums tracking-tight", valueClass)}>
              {item.value}
            </p>
          )}
        </div>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-4"
          style={{
            background: `color-mix(in srgb, ${tone.color} 16%, white)`,
            color: tone.color,
          }}
        >
          {item.icon ?? <Fallback aria-hidden className="size-4" />}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-4 w-32" />
      ) : (
        <>
          {item.progress != null ? (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5"
              role="progressbar"
              aria-valuenow={Math.round(item.progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={item.label}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, item.progress))}%`,
                  background: tone.color,
                }}
              />
            </div>
          ) : null}
          <div className={cn("flex items-start justify-between gap-3", item.progress != null ? "mt-1.5" : "mt-3")}>
            <p className="min-h-5 text-xs leading-5 text-muted-foreground">
              {item.subline ?? ""}
            </p>
            {item.action}
          </div>
        </>
      )}
    </article>
  );
}

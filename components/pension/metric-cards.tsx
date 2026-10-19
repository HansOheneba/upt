import type { LucideIcon } from "lucide-react";
import { KpiStrip, type KpiAccent } from "@/components/dashboard/kpi-strip";

export type MetricTone = "blue" | "green" | "gold" | "violet";

const accentForTone: Record<MetricTone, KpiAccent> = {
  blue: "blue",
  green: "green",
  gold: "orange",
  violet: "purple",
};

export type MetricCardItem = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: MetricTone;
};

/** Pension summary cards. Same graphic treatment as every other KPI strip. */
export function MetricCards({
  label,
  items,
}: {
  label: string;
  items: MetricCardItem[];
}) {
  return (
    <section aria-label={label}>
      <KpiStrip
        cols={items.length <= 3 ? 3 : 4}
        items={items.map((item) => {
          const Icon = item.icon;
          return {
            label: item.label,
            value: item.value,
            subline: item.detail,
            accent: accentForTone[item.tone],
            icon: <Icon aria-hidden className="size-4" />,
          };
        })}
      />
    </section>
  );
}

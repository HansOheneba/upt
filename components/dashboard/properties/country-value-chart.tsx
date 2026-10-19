"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";

import { type Property } from "@/lib/client-data";
import { useWealthFormatting } from "@/hooks/useUserCurrency";

// ─── Brand palette - navy shades for slices ───────────────────────────────────

const SLICE_COLORS = [
  "var(--brand-primary)",
  "#1e3a5f",
  "#2d5282",
  "#3b6cb5",
  "#7eb8e8",
  "#a8d4f5",
  "#c3e2fa",
  "#daeffe",
  "#1a2a4a",
  "#243d6b",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PropertySlice = {
  key: string;
  name: string;
  marketValue: number;
  fill: string;
};

function getTopProperties(properties: Property[], limit = 10): PropertySlice[] {
  return [...properties]
    .filter((p) => p.is_active && p.market_value > 0)
    .sort((a, b) => b.market_value - a.market_value)
    .slice(0, limit)
    .map((p, i) => ({
      key: p.property_id,
      name: p.name,
      marketValue: p.market_value,
      fill: SLICE_COLORS[i % SLICE_COLORS.length],
    }));
}

function donutTooltipFormatter(
  value: unknown,
  name: unknown,
  fmtWealth: (amount: number) => string,
): [string, string] {
  const v = typeof value === "number" ? value : Number(value) || 0;
  return [fmtWealth(v), String(name ?? "")];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CountryDonutChart({ properties }: { properties: Property[] }) {
  const { fmtWealth } = useWealthFormatting();
  const activeProps = properties.filter((p) => p.is_active);
  const limit = Math.min(activeProps.length, 10);
  const slices = getTopProperties(activeProps, limit);
  const totalValue = slices.reduce((s, p) => s + p.marketValue, 0);
  const hiddenCount = activeProps.length - slices.length;

  return (
    <DashCard className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Property Value Distribution</CardTitle>
        <CardDescription>
          Top {slices.length} properties by market value
          {hiddenCount > 0 && ` · ${hiddenCount} more not shown`}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pb-5">
        {slices.length === 0 ? (
          <div className="flex min-h-50 flex-1 items-center justify-center text-xs text-muted-foreground px-6 text-center">
            Add properties with market values to see how your portfolio is
            distributed.
          </div>
        ) : (
          <>
            <div className="relative mx-auto h-50 w-full max-w-55 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value, name) =>
                      donutTooltipFormatter(value, name, fmtWealth)
                    }
                  />
                  <Pie
                    data={slices}
                    dataKey="marketValue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {slices.map((s) => (
                      <Cell key={s.key} fill={s.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="max-w-22 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Total
                  </p>
                  <p className="text-sm font-bold tabular-nums leading-tight">
                    {fmtWealth(totalValue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {slices.length}{" "}
                    {slices.length === 1 ? "property" : "properties"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-1.5 border-t pt-3">
              {slices.map((s) => {
                const pct =
                  totalValue > 0 ? (s.marketValue / totalValue) * 100 : 0;
                return (
                  <div
                    key={s.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.fill }}
                      />
                      <span
                        className="text-muted-foreground truncate"
                        title={s.name}
                      >
                        {s.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="text-muted-foreground w-10 text-right">
                        {pct.toFixed(1)}%
                      </span>
                      <span className="font-medium w-18 text-right">
                        {fmtWealth(s.marketValue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </DashCard>
  );
}

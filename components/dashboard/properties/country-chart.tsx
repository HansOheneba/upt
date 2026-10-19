"use client";

import * as React from "react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { type Property } from "@/lib/client-data";
import { useWealthFormatting } from "@/hooks/useUserCurrency";
import {
  WORLD_COUNTRY_PATHS,
  WORLD_MAP_WIDTH,
  WORLD_MAP_HEIGHT,
  countryDisplayName,
  countryFlag,
  getCountryPathMarkerPosition,
  microStatePosition,
  toIso2,
} from "@/lib/country-geo";

// ─── Types ────────────────────────────────────────────────────────────────────

type CountryStat = {
  code: string;
  name: string;
  flag: string;
  totalValue: number;
  propertyCount: number;
  cities: string[];
};

function buildCountryStats(properties: Property[]): CountryStat[] {
  const map = new Map<string, CountryStat>();

  for (const p of properties) {
    if (!p.is_active) continue;
    const code = toIso2(p.country);
    if (!code) continue;

    const existing = map.get(code);
    if (existing) {
      existing.totalValue += p.market_value;
      existing.propertyCount += 1;
      if (p.city && !existing.cities.includes(p.city)) {
        existing.cities.push(p.city);
      }
    } else {
      map.set(code, {
        code,
        name: countryDisplayName(p.country),
        flag: countryFlag(p.country),
        totalValue: p.market_value,
        propertyCount: 1,
        cities: p.city ? [p.city] : [],
      });
    }
  }

  return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Fill for an owned country. Strongest tint goes to the largest holding so the
 * heat reads even when every country is small on a world projection.
 */
function countryFill(share: number): string {
  const strength = Math.round(45 + Math.min(1, share) * 55);
  return `color-mix(in srgb, var(--brand-primary) ${strength}%, #dbe4f0)`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssetMap({ properties }: { properties: Property[] }) {
  const { fmtWealth } = useWealthFormatting();
  const stats = React.useMemo(
    () => buildCountryStats(properties),
    [properties],
  );

  const [hovered, setHovered] = React.useState<string | null>(null);
  const [centroids, setCentroids] = React.useState<
    Record<string, { x: number; y: number }>
  >({});
  const pathRefs = React.useRef<Record<string, SVGPathElement | null>>({});

  const owned = React.useMemo(
    () => new Map(stats.map((s) => [s.code, s])),
    [stats],
  );
  const totalValue = stats.reduce((s, c) => s + c.totalValue, 0);
  const maxValue = stats.reduce((m, c) => Math.max(m, c.totalValue), 0);
  const propertyCount = stats.reduce((s, c) => s + c.propertyCount, 0);

  // Bubble anchors come from the largest landmass subpath so multi-region
  // countries (US, CA, AU) do not drop their dot in the ocean.
  React.useLayoutEffect(() => {
    const next: Record<string, { x: number; y: number }> = {};
    for (const stat of stats) {
      const el = pathRefs.current[stat.code];
      if (el) {
        const pos = getCountryPathMarkerPosition(el);
        if (pos) {
          next[stat.code] = pos;
          continue;
        }
      }
      const micro = microStatePosition(stat.code);
      if (micro) next[stat.code] = micro;
    }
    setCentroids(next);
  }, [stats]);

  const hoveredStat = hovered ? owned.get(hovered) : undefined;

  if (stats.length === 0) {
    return (
      <DashCard className="flex h-full flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Geographic Spread</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-50 items-center justify-center px-6 text-center text-xs text-muted-foreground">
            Add properties with a country to see where your real estate sits.
          </div>
        </CardContent>
      </DashCard>
    );
  }

  return (
    <DashCard className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Geographic Spread</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmtWealth(totalValue)} across {propertyCount}{" "}
              {propertyCount === 1 ? "property" : "properties"}
            </p>
          </div>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {stats.length} {stats.length === 1 ? "country" : "countries"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Map */}
        <div
          className="relative"
          onMouseLeave={() => setHovered(null)}
          role="img"
          aria-label={`Property locations: ${stats
            .map((s) => `${s.name} ${fmtWealth(s.totalValue)}`)
            .join(", ")}`}
        >
          <svg
            viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`}
            className="w-full overflow-visible"
          >
            {/* Base layer - every country */}
            <g>
              {WORLD_COUNTRY_PATHS.map(({ code, d }) => {
                const stat = owned.get(code);
                const share = maxValue > 0 && stat ? stat.totalValue / maxValue : 0;
                const isHovered = hovered === code;
                return (
                  <path
                    key={code}
                    ref={(el) => {
                      if (stat) pathRefs.current[code] = el;
                    }}
                    d={d}
                    strokeWidth={stat ? 0.6 : 0.4}
                    className={
                      stat
                        ? "cursor-pointer transition-opacity duration-150"
                        : undefined
                    }
                    opacity={stat && hovered && !isHovered ? 0.55 : 1}
                    // CSS variables and color-mix() only resolve through the
                    // style property, not SVG presentation attributes.
                    style={{
                      fill: stat ? countryFill(share) : "#eef1f5",
                      stroke: stat ? "var(--brand-primary)" : "#e2e6ec",
                    }}
                    onMouseEnter={stat ? () => setHovered(code) : undefined}
                  />
                );
              })}
            </g>

            {/* Value bubbles - keep small countries legible */}
            <g>
              {stats.map((stat) => {
                const pos = centroids[stat.code];
                if (!pos) return null;
                const share = maxValue > 0 ? stat.totalValue / maxValue : 0;
                const r = 5 + Math.sqrt(share) * 9;
                const isHovered = hovered === stat.code;
                return (
                  <g key={stat.code}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r + 3}
                      opacity={isHovered ? 0.22 : 0.12}
                      style={{ fill: "var(--brand-primary)" }}
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      strokeWidth={1.5}
                      className="cursor-pointer"
                      style={{ fill: "var(--brand-primary)", stroke: "#fff" }}
                      onMouseEnter={() => setHovered(stat.code)}
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Tooltip anchored to the hovered country */}
          {hoveredStat && centroids[hoveredStat.code] && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full pb-2"
              style={{
                left: `${(centroids[hoveredStat.code].x / WORLD_MAP_WIDTH) * 100}%`,
                top: `${(centroids[hoveredStat.code].y / WORLD_MAP_HEIGHT) * 100}%`,
              }}
            >
              <div className="min-w-35 rounded-lg border bg-background px-2.5 py-2 shadow-md">
                <p className="text-xs font-semibold leading-tight">
                  {hoveredStat.flag} {hoveredStat.name}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {hoveredStat.propertyCount}{" "}
                  {hoveredStat.propertyCount === 1 ? "property" : "properties"}
                  {hoveredStat.cities.length > 0 &&
                    ` · ${hoveredStat.cities.join(", ")}`}
                </p>
                <p
                  className="text-xs font-bold tabular-nums"
                  style={{ color: "var(--brand-primary)" }}
                >
                  {fmtWealth(hoveredStat.totalValue)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Country breakdown */}
        <div className="mt-auto space-y-2 border-t pt-3">
          {stats.map((stat) => {
            const pct = totalValue > 0 ? (stat.totalValue / totalValue) * 100 : 0;
            const isHovered = hovered === stat.code;
            return (
              <div
                key={stat.code}
                onMouseEnter={() => setHovered(stat.code)}
                onMouseLeave={() => setHovered(null)}
                className={`space-y-1 rounded-md px-1.5 py-1 transition-colors ${
                  isHovered ? "bg-muted/60" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden>{stat.flag}</span>
                    <span className="truncate font-medium" title={stat.name}>
                      {stat.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      ({stat.propertyCount})
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    <span className="w-9 text-right text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                    <span className="w-18 text-right font-medium">
                      {fmtWealth(stat.totalValue)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-300 ease-out"
                    style={{
                      width: `${Math.max(pct, 1.5)}%`,
                      backgroundColor: "var(--brand-primary)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </DashCard>
  );
}

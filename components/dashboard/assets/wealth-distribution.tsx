"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MapPin, ChevronDown } from "lucide-react";

import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatCurrency } from "@/lib/client-data";

// LocationKey is a plain string derived at runtime from country + city.
export type LocationKey = string;

export type LocationOption = {
  key: LocationKey;
  label: string;
};

/**
 * Shape mirrors the property form / backend property record so no
 * transformation is needed when real data arrives.
 * country      → Property.country
 * city         → Property.city
 * value        → Property.market_value (or aggregated asset value)
 * propertyType → Property.property_type
 * propertyName → Property.name
 */
export type LocationDistributionItem = {
  country: string;
  city: string;
  value: number;
  propertyType: string;
  propertyName: string;
};

/** Stable key derived from country + city - used only for filtering. */
export function toLocationKey(country: string, city: string): LocationKey {
  return `${country}_${city}`.toLowerCase().replace(/\s+/g, "_");
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function donutTooltipFormatter(value: unknown): string {
  const v = typeof value === "number" ? value : 0;
  return formatCurrency(v);
}

export function WealthDistribution({
  locations,
  distribution,
  selectedLocation,
  onLocationChange,
}: {
  locations: LocationOption[];
  distribution: LocationDistributionItem[];
  selectedLocation: LocationKey;
  onLocationChange: (location: LocationKey) => void;
}) {
  const filteredDistribution = React.useMemo(() => {
    if (selectedLocation === "all") return distribution;
    return distribution.filter(
      (x) => toLocationKey(x.country, x.city) === selectedLocation,
    );
  }, [distribution, selectedLocation]);

  const locationDonutData = React.useMemo(
    () =>
      filteredDistribution.map((d) => ({
        label: `${d.city}, ${d.country}`,
        value: d.value,
      })),
    [filteredDistribution],
  );

  const locationDistributionTotal = React.useMemo(
    () => sum(locationDonutData.map((d) => d.value)),
    [locationDonutData],
  );

  return (
    <DashCard>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            Wealth Distribution by Location
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            View how assets are distributed across the selected location.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Location</span>
          </div>

          <Select
            value={selectedLocation}
            onValueChange={(v) => onLocationChange(v)}
          >
            <SelectTrigger className="w-full md:w-[260px]">
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.key} value={l.key}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={donutTooltipFormatter} />
              <Pie
                data={locationDonutData}
                dataKey="value"
                nameKey="label"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={0}
              >
                {locationDonutData.map((_, idx) => (
                  <Cell key={idx} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none -mt-56 flex h-56 items-center justify-center">
            <div className="rounded-full bg-background/70 px-4 py-2 text-center backdrop-blur">
              <div className="text-xs text-muted-foreground">Total in view</div>
              <div className="text-sm font-semibold tabular-nums">
                {formatCurrency(locationDistributionTotal)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {locationDonutData.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No assets recorded for this location.
            </div>
          ) : (
            locationDonutData.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between gap-4"
              >
                <div className="text-sm text-muted-foreground">{d.label}</div>
                <div className="flex items-center gap-6">
                  <div className="text-sm font-medium tabular-nums">
                    {formatCurrency(d.value)}
                  </div>
                  <div className="w-12 text-right text-sm text-muted-foreground tabular-nums">
                    {Math.round(pct(d.value, locationDistributionTotal))}%
                  </div>
                </div>
              </div>
            ))
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Notes</div>
            <Badge variant="secondary" className="gap-1">
              <ChevronDown className="h-3.5 w-3.5" />
              Filtered
            </Badge>
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}

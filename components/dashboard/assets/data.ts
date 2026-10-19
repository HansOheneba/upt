import type { Insight } from "@/components/dashboard/assets/celerey-insights";
import type {
  LocationKey,
  LocationOption,
  LocationDistributionItem,
} from "@/components/dashboard/assets/wealth-distribution";
import { toLocationKey } from "@/components/dashboard/assets/wealth-distribution";

// ── Shared types ────────────────────────────────────────────────
export type AllocationItem = {
  key: "equities" | "fixed_income" | "alternatives" | "cash" | "crypto";
  label: string;
  value: number;
};

export type AssetsTab = "portfolio" | "properties";

// ── Helpers ─────────────────────────────────────────────────────
export function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

// ── Static data ─────────────────────────────────────────────────
export const LOCATIONS: LocationOption[] = [
  { key: "all", label: "All locations" },
];

export const DEFAULT_ALLOCATIONS: AllocationItem[] = [
  { key: "equities", label: "Equities", value: 0 },
  { key: "fixed_income", label: "Fixed Income", value: 0 },
  { key: "alternatives", label: "Alternatives", value: 0 },
  { key: "cash", label: "Cash", value: 0 },
  { key: "crypto", label: "Crypto", value: 0 },
];

export const DEFAULT_INSIGHTS: Insight[] = [];

// Properties now live in lib/property-data.ts

// DEFAULT_LOCATION_DISTRIBUTION is populated from real API data once loaded.
export const DEFAULT_LOCATION_DISTRIBUTION: LocationDistributionItem[] = [];

// Re-export types that tabs need from child components
export type { Insight, LocationKey, LocationOption, LocationDistributionItem };

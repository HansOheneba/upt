"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, AlertTriangle } from "lucide-react";

import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AssetType,
  type AssetHolding,
  ASSET_TYPE_OPTIONS,
  EQUITY_COMP_KIND_OPTIONS,
  supportsMarket,
  symbolsForType,
  isSymbolHeld,
  formatCurrency,
  type EquityCompKind,
} from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { createAsset, updateAsset } from "@/lib/dashboard-api";
import { blockRecordCreate } from "@/lib/record-limits";

// ── Form state ──────────────────────────────────────────────────
export type HoldingFormValues = {
  name: string;
  assetType: AssetType;
  symbol: string; // stock, etf, crypto
  quantity: string; // stock, etf, crypto
  amountInvested: string; // what the user paid/invested total (cost basis)
  currentValue: string; // manually entered current value (non-live assets)
  faceValue: string; // bond par/face value → stored as initial_value
  couponRate: string; // annual interest % - bonds, cash (interest-bearing)
  maturityDate: string; // ISO date - bonds
  purchaseDate: string; // when acquired / as-of date
};

export type HoldingFormProps = {
  /** When set, the form is in edit mode */
  editingHolding?: AssetHolding;
  /** Page title override */
  title?: string;
  /** Subtitle override */
  subtitle?: string;
};

// ── Helpers ─────────────────────────────────────────────────────
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumberWithCommas(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function toNumber(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ── Component ───────────────────────────────────────────────────
export function HoldingForm({
  editingHolding,
  title,
  subtitle,
}: HoldingFormProps) {
  const router = useRouter();
  const isEditing = !!editingHolding;
  const storeHoldings = useFinancialStore((s) => s.holdings);
  const setHoldings = useFinancialStore((s) => s.setHoldings);
  const userCurrency = useFinancialStore((s) => s.user?.currency ?? "USD");

  // ── Initialise form ─────────────────────────────────────────
  const [form, setForm] = React.useState<HoldingFormValues>(() => {
    if (editingHolding) {
      return {
        name: editingHolding.name,
        assetType: editingHolding.asset_type,
        symbol: editingHolding.symbol ?? "",
        quantity: editingHolding.quantity?.toString() ?? "",
        amountInvested: editingHolding.amount_invested
          ? formatNumberWithCommas(editingHolding.amount_invested.toString())
          : "",
        currentValue: editingHolding.current_value
          ? formatNumberWithCommas(editingHolding.current_value.toString())
          : "",
        faceValue:
          editingHolding.asset_type === "bond"
            ? formatNumberWithCommas(
                (
                  editingHolding.initial_value ?? editingHolding.cost_basis
                ).toString(),
              )
            : "",
        couponRate: editingHolding.coupon_rate?.toString() ?? "",
        maturityDate: editingHolding.maturity_date ?? "",
        purchaseDate: editingHolding.initial_value_date,
      };
    }
    return {
      name: "",
      assetType: "stock",
      symbol: "",
      quantity: "",
      amountInvested: "",
      currentValue: "",
      faceValue: "",
      couponRate: "",
      maturityDate: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
    };
  });

  const [symbolSearch, setSymbolSearch] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [equityCompKind, setEquityCompKind] =
    React.useState<EquityCompKind>("rsu");

  // ── Type flags ──────────────────────────────────────────────
  const isMarket = supportsMarket(form.assetType); // stock, etf, crypto, commodity
  const isBond = form.assetType === "bond";
  const isCash = form.assetType === "cash";
  const isMutual = form.assetType === "mutual_fund";
  const isEquityComp = form.assetType === "equity_compensation";
  const showOptionFields =
    isEquityComp && (equityCompKind === "iso" || equityCompKind === "nso");
  const isManual =
    form.assetType === "alternative" || form.assetType === "other";

  // ── Symbol picker helpers ────────────────────────────────────
  const availableSymbols = React.useMemo(() => {
    const syms = symbolsForType(form.assetType);
    if (!symbolSearch.trim()) return syms;
    const q = symbolSearch.trim().toLowerCase();
    return syms.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [form.assetType, symbolSearch]);

  // Duplicate detection
  const isDuplicate = React.useMemo(() => {
    if (!form.symbol) return false;
    return isSymbolHeld(form.symbol, storeHoldings, editingHolding?.holding_id);
  }, [form.symbol, editingHolding?.holding_id, storeHoldings]);

  // ── Updater ─────────────────────────────────────────────────
  function update<K extends keyof HoldingFormValues>(
    key: K,
    value: HoldingFormValues[K],
  ): void {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "assetType") {
        const at = value as AssetType;
        // Reset market fields when switching to manual type
        if (!supportsMarket(at)) {
          next.symbol = "";
          next.quantity = "";
        } else {
          // Switching to a market type - clear previous symbol if it doesn&apos;t match
          const validForType = symbolsForType(at).some(
            (s) => s.symbol === next.symbol,
          );
          if (!validForType) {
            next.symbol = "";
            next.name = "";
          }
        }
        setSymbolSearch("");
      }
      return next;
    });
  }

  function selectSymbol(sym: string): void {
    const info = symbolsForType(form.assetType).find((s) => s.symbol === sym);
    setForm((prev) => ({
      ...prev,
      symbol: sym,
      name: info?.name ?? prev.name,
    }));
    setSymbolSearch("");
  }

  function handleMoneyInput(
    key: "amountInvested" | "currentValue" | "faceValue",
    value: string,
  ): void {
    update(key, formatNumberWithCommas(value));
  }

  // ── Numeric values ─────────────────────────────────────────
  const amountInvestedNum = toNumber(form.amountInvested);
  const currentValueNum = toNumber(form.currentValue);
  const faceValueNum = toNumber(form.faceValue);
  const quantityNum = toNumber(form.quantity);
  const couponRateNum = toNumber(form.couponRate);

  /** Projected bond value at maturity: face + accumulated coupon income. */
  const projectedBondValue = React.useMemo(() => {
    if (!isBond || !faceValueNum || !couponRateNum || !form.maturityDate)
      return 0;
    const years =
      (new Date(form.maturityDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24 * 365.25);
    if (years <= 0) return faceValueNum;
    return faceValueNum + faceValueNum * (couponRateNum / 100) * years;
  }, [isBond, faceValueNum, couponRateNum, form.maturityDate]);

  /** Primary reference value for insight sizing. */
  const insightRefValue = isBond
    ? faceValueNum || amountInvestedNum
    : isCash
      ? currentValueNum
      : amountInvestedNum || currentValueNum;

  // ── Contextual insight ──────────────────────────────────────
  type Insight = { tone: "info" | "good" | "warn"; message: string };

  const insight: Insight = React.useMemo(() => {
    if (isDuplicate) {
      return {
        tone: "warn",
        message: `You already own ${form.symbol}. Edit the existing holding instead of adding a duplicate.`,
      };
    }
    if (isMarket && !form.symbol) {
      return {
        tone: "info",
        message:
          "Pick a symbol so we can automatically track pricing for this holding.",
      };
    }
    if (!form.name.trim() && !isMarket) {
      return {
        tone: "info",
        message:
          "Fill in the details to see how this holding fits your portfolio.",
      };
    }
    if (insightRefValue <= 0) {
      return {
        tone: "info",
        message: "Enter the value or amount invested to preview this holding.",
      };
    }
    if (insightRefValue > 500_000) {
      return {
        tone: "warn",
        message: `At ${formatCurrency(insightRefValue, userCurrency)}, this one position is large. Watch concentration if it grows.`,
      };
    }
    if (isBond && faceValueNum > 0 && couponRateNum > 0 && form.maturityDate) {
      return {
        tone: "good",
        message: `Bond with a ${couponRateNum}% coupon rate. Projected value at maturity: ~${formatCurrency(projectedBondValue, userCurrency)}.`,
      };
    }
    return {
      tone: "good",
      message: isMarket
        ? `We\u2019ll automatically update the valuation for ${form.symbol} using market prices.`
        : `This holding will be tracked manually starting from ${formatCurrency(insightRefValue, userCurrency)}.`,
    };
  }, [
    isDuplicate,
    form.symbol,
    form.name,
    form.maturityDate,
    insightRefValue,
    isMarket,
    isBond,
    faceValueNum,
    couponRateNum,
    projectedBondValue,
  ]);

  const insightClasses = React.useMemo(() => {
    switch (insight.tone) {
      case "good":
        return "border-sky-500/20 bg-sky-500/5 text-sky-800 dark:text-sky-300";
      case "warn":
        return "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300";
      default:
        return "border-muted bg-muted/20 text-muted-foreground";
    }
  }, [insight.tone]);

  // ── Validation ──────────────────────────────────────────────
  const isValid = React.useMemo(() => {
    if (isDuplicate) return false;
    if (!form.name.trim()) return false;
    if (isMarket) {
      return (
        form.symbol.trim().length > 0 &&
        quantityNum > 0 &&
        amountInvestedNum > 0 &&
        form.purchaseDate.length > 0
      );
    }
    if (isBond) return faceValueNum > 0;
    if (isCash) return currentValueNum > 0;
    if (isMutual || isManual) {
      return (
        (amountInvestedNum > 0 || currentValueNum > 0) &&
        form.purchaseDate.length > 0
      );
    }
    if (isEquityComp) {
      return (
        form.name.trim().length > 0 &&
        currentValueNum > 0 &&
        form.purchaseDate.length > 0
      );
    }
    return true;
  }, [
    isDuplicate,
    form.name,
    form.symbol,
    form.purchaseDate,
    isMarket,
    isBond,
    isCash,
    isMutual,
    isManual,
    isEquityComp,
    quantityNum,
    amountInvestedNum,
    currentValueNum,
    faceValueNum,
  ]);

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    if (!isEditing && blockRecordCreate("assets")) return;
    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const holdingId = editingHolding?.holding_id ?? `h-${Date.now()}`;

      // Derive initial_value (legacy fallback):
      // bonds → face value | cash → current balance | others → amount invested
      const legacyInitialValue = isBond
        ? faceValueNum
        : isCash
          ? currentValueNum
          : amountInvestedNum || currentValueNum;

      let holding: AssetHolding = {
        holding_id: holdingId,
        user_id: editingHolding?.user_id ?? "u-1",
        name: form.name.trim(),
        asset_type: form.assetType,
        valuation_method: isMarket ? "market" : "manual",
        cost_basis: legacyInitialValue,
        initial_value: legacyInitialValue,
        initial_value_date: form.purchaseDate || now.slice(0, 10),
        symbol: form.symbol.trim() || undefined,
        quantity:
          isMarket || isEquityComp ? quantityNum || undefined : undefined,
        amount_invested: amountInvestedNum || undefined,
        current_value:
          isCash || isMutual || isManual || isEquityComp
            ? currentValueNum || undefined
            : undefined,
        coupon_rate: couponRateNum || undefined,
        maturity_date: form.maturityDate || undefined,
        is_active: true,
        created_at: editingHolding?.created_at ?? now,
        updated_at: now,
      };

      const updatedHoldings = isEditing
        ? storeHoldings.map((h) =>
            h.holding_id === holding.holding_id ? holding : h,
          )
        : [...storeHoldings, holding];

      if (isEditing) {
        await updateAsset({ ...holding });
      } else {
        const created = await createAsset(holding);
        // Use the backend-assigned holding_id if present
        if (created?.holding_id && created.holding_id !== holding.holding_id) {
          holding = { ...holding, holding_id: created.holding_id };
        }
      }

      setHoldings(
        isEditing
          ? storeHoldings.map((h) =>
              h.holding_id === holding.holding_id ? holding : h,
            )
          : [...storeHoldings, holding],
      );
      router.push("/dashboard/assets");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────
  const formTitle = title ?? (isEditing ? "Edit holding" : "Add a holding");
  const formSubtitle =
    subtitle ??
    (isEditing
      ? `Update the details for ${editingHolding!.name}.`
      : "Track a new investment or asset position.");

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {formTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{formSubtitle}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: main form ───────────────────────────────── */}
          <DashCard className="backdrop-blur lg:col-span-2">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Holding Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tell us what you own; we&apos;ll handle the tracking.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Asset type */}
              <div className="space-y-2">
                <Label htmlFor="asset-type">Asset type</Label>
                <Select
                  value={form.assetType}
                  onValueChange={(v) => update("assetType", v as AssetType)}
                >
                  <SelectTrigger id="asset-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isMarket
                    ? "We\u2019ll automatically pull market prices for this type."
                    : "You\u2019ll update the valuation manually for this type."}
                </p>
              </div>

              <Separator />

              {/* ── Market-priced asset: symbol picker ─────── */}
              {isMarket && (
                <>
                  <div className="space-y-3">
                    <Label>Symbol</Label>

                    {/* Search filter */}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or ticker…"
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Symbol grid */}
                    <div className="max-h-48 overflow-y-auto rounded-xl border bg-muted/10 p-2">
                      {availableSymbols.length === 0 ? (
                        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                          No matching symbols. Try a different search.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {availableSymbols.map((s) => {
                            const selected = form.symbol === s.symbol;
                            const alreadyOwned = isSymbolHeld(
                              s.symbol,
                              storeHoldings,
                              editingHolding?.holding_id,
                            );
                            return (
                              <button
                                key={s.symbol}
                                type="button"
                                disabled={alreadyOwned}
                                onClick={() => selectSymbol(s.symbol)}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                  selected &&
                                    "bg-primary/10 ring-1 ring-primary/40",
                                  !selected &&
                                    !alreadyOwned &&
                                    "hover:bg-muted/40",
                                  alreadyOwned &&
                                    "cursor-not-allowed opacity-40",
                                )}
                              >
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 text-xs font-mono"
                                >
                                  {s.symbol}
                                </Badge>
                                <span className="truncate text-xs">
                                  {s.name}
                                </span>
                                {alreadyOwned && (
                                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                                    owned
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Duplicate warning */}
                    {isDuplicate && (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        You already hold {form.symbol}. Edit the existing
                        position instead.
                      </div>
                    )}
                  </div>

                  <Separator />
                </>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {isMarket ? "Display name" : "Holding name"}
                </Label>
                <Input
                  id="name"
                  placeholder={
                    isMarket
                      ? "Auto-filled from symbol"
                      : isBond
                        ? "e.g. US Treasury 10yr, Corporate Bond"
                        : isCash
                          ? "e.g. High-Yield Savings, Fixed Deposit"
                          : isEquityComp
                            ? "e.g. Acme Corp RSU grant 2024"
                            : "e.g. Private Equity Fund, Real Estate"
                  }
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
                {isMarket && (
                  <p className="text-xs text-muted-foreground">
                    Filled automatically when you pick a symbol. You can
                    customise it.
                  </p>
                )}
              </div>

              <Separator />

              {/* ── Stock / ETF / Crypto: quantity + amount invested ── */}
              {isMarket && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">
                        How many units / shares do you hold?
                      </Label>
                      <Input
                        id="quantity"
                        type="text"
                        inputMode="decimal"
                        placeholder="200"
                        value={form.quantity}
                        onChange={(e) => update("quantity", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        The number of shares, coins, or units in your account.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount-invested">
                        How much did you invest?
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="amount-invested"
                          type="text"
                          inputMode="numeric"
                          placeholder="30,000"
                          value={form.amountInvested}
                          onChange={(e) =>
                            handleMoneyInput("amountInvested", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The total you paid for all your units - this is your
                        cost basis.
                      </p>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* ── Mutual fund: amount invested + current value ── */}
              {isMutual && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount-invested-mf">
                        How much did you invest?
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="amount-invested-mf"
                          type="text"
                          inputMode="numeric"
                          placeholder="50,000"
                          value={form.amountInvested}
                          onChange={(e) =>
                            handleMoneyInput("amountInvested", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The total you put into this fund.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current-value-mf">
                        What is it worth today?
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="current-value-mf"
                          type="text"
                          inputMode="numeric"
                          placeholder="55,000"
                          value={form.currentValue}
                          onChange={(e) =>
                            handleMoneyInput("currentValue", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The current NAV from your fund statement.
                      </p>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* ── Bond: face value + coupon + maturity + amount invested ── */}
              {isBond && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="face-value">Face / par value</Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="face-value"
                          type="text"
                          inputMode="numeric"
                          placeholder="100,000"
                          value={form.faceValue}
                          onChange={(e) =>
                            handleMoneyInput("faceValue", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The principal amount paid back at maturity.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coupon-rate">
                        Annual interest rate (%)
                      </Label>
                      <Input
                        id="coupon-rate"
                        type="text"
                        inputMode="decimal"
                        placeholder="4.5"
                        value={form.couponRate}
                        onChange={(e) => update("couponRate", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        The yearly interest rate printed on the bond.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maturity-date">Maturity date</Label>
                      <Input
                        id="maturity-date"
                        type="date"
                        value={form.maturityDate}
                        onChange={(e) => update("maturityDate", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        When the bond pays back the face value.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount-invested-bond">
                        How much did you invest?
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="amount-invested-bond"
                          type="text"
                          inputMode="numeric"
                          placeholder="95,000"
                          value={form.amountInvested}
                          onChange={(e) =>
                            handleMoneyInput("amountInvested", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        What you actually paid - bonds can trade above or below
                        face value.
                      </p>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* ── Cash: account balance + optional interest rate ── */}
              {isCash && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="current-value-cash">
                        What is it worth today?
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="current-value-cash"
                          type="text"
                          inputMode="numeric"
                          placeholder="25,000"
                          value={form.currentValue}
                          onChange={(e) =>
                            handleMoneyInput("currentValue", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your current account balance.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coupon-rate-cash">
                        Interest rate (%){" "}
                        <span className="font-normal text-muted-foreground">
                          - optional
                        </span>
                      </Label>
                      <Input
                        id="coupon-rate-cash"
                        type="text"
                        inputMode="decimal"
                        placeholder="4.2"
                        value={form.couponRate}
                        onChange={(e) => update("couponRate", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Annual interest for savings or fixed-deposit accounts.
                      </p>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* ── Employer equity (RSU, options, ESPP) ── */}
              {isEquityComp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="equity-comp-kind">Compensation type</Label>
                    <Select
                      value={equityCompKind}
                      onValueChange={(v) =>
                        setEquityCompKind(v as EquityCompKind)
                      }
                    >
                      <SelectTrigger id="equity-comp-kind" className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUITY_COMP_KIND_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {
                        EQUITY_COMP_KIND_OPTIONS.find(
                          (o) => o.value === equityCompKind,
                        )?.description
                      }
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="employer-ticker">
                        Employer ticker{" "}
                        <span className="font-normal text-muted-foreground">
                          - optional
                        </span>
                      </Label>
                      <Input
                        id="employer-ticker"
                        placeholder="e.g. AAPL"
                        value={form.symbol}
                        onChange={(e) =>
                          update("symbol", e.target.value.toUpperCase())
                        }
                        className="font-mono uppercase"
                      />
                      <p className="text-xs text-muted-foreground">
                        For reference only. We do not auto-price employer equity.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="equity-quantity">
                        Vested shares / options{" "}
                        <span className="font-normal text-muted-foreground">
                          - optional
                        </span>
                      </Label>
                      <Input
                        id="equity-quantity"
                        type="text"
                        inputMode="decimal"
                        placeholder={
                          showOptionFields ? "500 options" : "1,200 shares"
                        }
                        value={form.quantity}
                        onChange={(e) => update("quantity", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {showOptionFields
                          ? "Number of vested options (1 contract = 100 shares at exercise)."
                          : "Vested RSU or ESPP share count from your grant letter or broker."}
                      </p>
                    </div>
                  </div>

                  {showOptionFields && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="strike-price">
                          Strike price per share
                        </Label>
                        <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                          <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                            {userCurrency}
                          </span>
                          <input
                            id="strike-price"
                            type="text"
                            inputMode="decimal"
                            placeholder="12.50"
                            value={form.couponRate}
                            onChange={(e) =>
                              update("couponRate", e.target.value)
                            }
                            className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="option-expiry">Expiration date</Label>
                        <Input
                          id="option-expiry"
                          type="date"
                          value={form.maturityDate}
                          onChange={(e) =>
                            update("maturityDate", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount-invested-equity">
                        Cost / amount paid{" "}
                        <span className="font-normal text-muted-foreground">
                          - optional
                        </span>
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="amount-invested-equity"
                          type="text"
                          inputMode="numeric"
                          placeholder="0 for RSU"
                          value={form.amountInvested}
                          onChange={(e) =>
                            handleMoneyInput("amountInvested", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Exercise cost for options or ESPP purchase price. RSUs
                        are often $0.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current-value-equity">
                        Estimated value today
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="current-value-equity"
                          type="text"
                          inputMode="numeric"
                          placeholder="From Carta, E*TRADE, etc."
                          value={form.currentValue}
                          onChange={(e) =>
                            handleMoneyInput("currentValue", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use the total from your equity portal or broker statement.
                      </p>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* ── Alternative / Other: amount invested + current value ── */}
              {isManual && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount-invested-alt">
                        How much did you invest?
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="amount-invested-alt"
                          type="text"
                          inputMode="numeric"
                          placeholder="50,000"
                          value={form.amountInvested}
                          onChange={(e) =>
                            handleMoneyInput("amountInvested", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The total you put in - this is your cost basis.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current-value-alt">
                        What is it worth today?
                      </Label>
                      <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                          {userCurrency}
                        </span>
                        <input
                          id="current-value-alt"
                          type="text"
                          inputMode="numeric"
                          placeholder="62,500"
                          value={form.currentValue}
                          onChange={(e) =>
                            handleMoneyInput("currentValue", e.target.value)
                          }
                          className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The current estimated value from your latest statement.
                      </p>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* Date (purchase / acquisition - bonds use maturityDate above) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchase-date">
                    {isCash ? "As-of date" : "When did you buy this?"}
                  </Label>
                  <Input
                    id="purchase-date"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => update("purchaseDate", e.target.value)}
                    required={!isCash}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isCash
                      ? "When was this balance recorded?"
                      : "When you first acquired this holding."}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/dashboard/assets")}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="sm:w-auto"
                >
                  {isSubmitting
                    ? "Saving…"
                    : isEditing
                      ? "Save changes"
                      : "Add holding"}
                </Button>
              </div>
            </CardContent>
          </DashCard>

          {/* ── Right: summary sidebar ────────────────────── */}
          <div className="space-y-6">
            <DashCard className="backdrop-blur">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <SummaryRow
                    label="Name"
                    value={form.name.trim() || "-"}
                    truncate
                  />
                  <SummaryRow
                    label="Type"
                    value={
                      ASSET_TYPE_OPTIONS.find((o) => o.value === form.assetType)
                        ?.label ?? "-"
                    }
                  />
                  <SummaryRow
                    label="Pricing"
                    value={isMarket ? "Automatic (live)" : "Manual"}
                  />

                  <Separator />

                  {/* Market assets: symbol, qty, amount invested, current value live */}
                  {isMarket && form.symbol && (
                    <SummaryRow label="Symbol" value={form.symbol} />
                  )}
                  {isMarket && quantityNum > 0 && (
                    <SummaryRow
                      label="Shares / units"
                      value={quantityNum.toLocaleString()}
                    />
                  )}
                  {isMarket && amountInvestedNum > 0 && (
                    <SummaryRow
                      label="Amount invested"
                      value={formatCurrency(amountInvestedNum, userCurrency)}
                    />
                  )}
                  {isMarket && (
                    <SummaryRow label="Current value" value="Updated live" />
                  )}

                  {/* Mutual fund */}
                  {isMutual && amountInvestedNum > 0 && (
                    <SummaryRow
                      label="Amount invested"
                      value={formatCurrency(amountInvestedNum, userCurrency)}
                    />
                  )}
                  {isMutual && currentValueNum > 0 && (
                    <SummaryRow
                      label="Current value"
                      value={formatCurrency(currentValueNum, userCurrency)}
                    />
                  )}
                  {isMutual && amountInvestedNum > 0 && currentValueNum > 0 && (
                    <SummaryRow
                      label="Gain / loss"
                      value={`${currentValueNum - amountInvestedNum >= 0 ? "+" : ""}${formatCurrency(currentValueNum - amountInvestedNum, userCurrency)}`}
                    />
                  )}

                  {/* Bond */}
                  {isBond && faceValueNum > 0 && (
                    <SummaryRow
                      label="Face value"
                      value={formatCurrency(faceValueNum, userCurrency)}
                    />
                  )}
                  {isBond && couponRateNum > 0 && (
                    <SummaryRow
                      label="Coupon rate"
                      value={`${couponRateNum}% p.a.`}
                    />
                  )}
                  {isBond && form.maturityDate && (
                    <SummaryRow label="Matures" value={form.maturityDate} />
                  )}
                  {isBond && projectedBondValue > 0 && (
                    <SummaryRow
                      label="Projected at maturity"
                      value={`~${formatCurrency(projectedBondValue, userCurrency)}`}
                    />
                  )}
                  {isBond && amountInvestedNum > 0 && (
                    <SummaryRow
                      label="Amount invested"
                      value={formatCurrency(amountInvestedNum, userCurrency)}
                    />
                  )}

                  {/* Cash */}
                  {isCash && currentValueNum > 0 && (
                    <SummaryRow
                      label="Account balance"
                      value={formatCurrency(currentValueNum, userCurrency)}
                    />
                  )}
                  {isCash && couponRateNum > 0 && (
                    <SummaryRow
                      label="Interest rate"
                      value={`${couponRateNum}% p.a.`}
                    />
                  )}

                  {/* Employer equity */}
                  {isEquityComp && form.symbol && (
                    <SummaryRow label="Employer ticker" value={form.symbol} />
                  )}
                  {isEquityComp && quantityNum > 0 && (
                    <SummaryRow
                      label="Vested qty"
                      value={quantityNum.toLocaleString()}
                    />
                  )}
                  {isEquityComp && showOptionFields && couponRateNum > 0 && (
                    <SummaryRow
                      label="Strike"
                      value={formatCurrency(couponRateNum, userCurrency)}
                    />
                  )}
                  {isEquityComp && showOptionFields && form.maturityDate && (
                    <SummaryRow label="Expires" value={form.maturityDate} />
                  )}
                  {isEquityComp && amountInvestedNum > 0 && (
                    <SummaryRow
                      label="Cost / paid"
                      value={formatCurrency(amountInvestedNum, userCurrency)}
                    />
                  )}
                  {isEquityComp && currentValueNum > 0 && (
                    <SummaryRow
                      label="Estimated value"
                      value={formatCurrency(currentValueNum, userCurrency)}
                    />
                  )}

                  {/* Alternative / Other */}
                  {isManual && amountInvestedNum > 0 && (
                    <SummaryRow
                      label="Amount invested"
                      value={formatCurrency(amountInvestedNum, userCurrency)}
                    />
                  )}
                  {isManual && currentValueNum > 0 && (
                    <SummaryRow
                      label="Current value"
                      value={formatCurrency(currentValueNum, userCurrency)}
                    />
                  )}
                  {isManual && amountInvestedNum > 0 && currentValueNum > 0 && (
                    <SummaryRow
                      label="Gain / loss"
                      value={`${currentValueNum - amountInvestedNum >= 0 ? "+" : ""}${formatCurrency(currentValueNum - amountInvestedNum, userCurrency)}`}
                    />
                  )}

                  {/* Date */}
                  {!isBond && form.purchaseDate && (
                    <SummaryRow
                      label={isCash ? "As-of date" : "Purchase date"}
                      value={form.purchaseDate}
                    />
                  )}
                </div>

                {/* Contextual guidance */}
                <div
                  className={cn(
                    "rounded-xl border p-3 text-xs leading-relaxed",
                    insightClasses,
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span>{insight.message}</span>
                  </div>
                </div>
              </CardContent>
            </DashCard>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Internal helper ─────────────────────────────────────────────
function SummaryRow({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn("text-sm font-semibold", truncate && "truncate max-w-40")}
      >
        {value}
      </span>
    </div>
  );
}

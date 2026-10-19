"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFire,
  faArrowTrendUp,
  faArrowTrendDown,
  faPiggyBank,
  faCalendarDays,
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation,
  faChartLine,
  faSackDollar,
  faHourglassHalf,
  faUserClock,
  faPencil,
  faRotateRight,
  faInfoCircle,
  faShieldHalved,
  faBuildingColumns,
  faCoins,
  faSliders,
  faFlaskVial,
  faArrowRight,
  faXmark,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { DashboardSectionLabelWide as SectionLabel } from "@/components/dashboard/section-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  selectRetirementOutputs,
  formatCurrency,
  getUserAge,
  type RetirementConfig,
} from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { updateRetirement } from "@/lib/dashboard-api";
import { usePageData } from "@/hooks/usePageData";
import { Skeleton } from "@/components/ui/skeleton";
import { RetirementStorageCard } from "@/components/dashboard/retirement/retirement-storage-card";
import {
  RETIREMENT_STORAGE_LOCATIONS,
  getRetirementStorageTip,
} from "@/lib/retirement-storage";

// ─── Colors ───────────────────────────────────────────────────────────────────
const NAVY = "var(--brand-primary)";
const BLUE = "#7eb8e8";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const RED = "#ef4444";

// ─── Account mode helpers ─────────────────────────────────────────────────────

type AccountMode = "solo" | "partner" | "family";

function getRetirementCopy(mode: AccountMode) {
  return {
    timelineLabel:
      mode === "solo" ? "Retirement Age" : "Target Retirement Year",
    timelineTip:
      mode === "solo"
        ? "The age at which you plan to stop working."
        : "The year you and your household are aiming to retire by.",
    timelineValue: (config: RetirementConfig, currentAge: number) =>
      mode === "solo"
        ? `${config.retirementAge}`
        : `${new Date().getFullYear() + (config.retirementAge - currentAge)}`,
    planningSubline: (config: RetirementConfig, currentAge: number) =>
      mode === "solo"
        ? `Planning for age ${config.retirementAge} · ${config.retirementAge - currentAge} years away`
        : `Planning for ${new Date().getFullYear() + (config.retirementAge - currentAge)} · ${config.retirementAge - currentAge} years away`,
    currentAgeLabel: mode === "solo" ? "Current Age" : "Years to Retirement",
    currentAgeValue: (currentAge: number, yearsToRetirement: number) =>
      mode === "solo" ? `${currentAge}` : `${yearsToRetirement} years`,
    projectedAtLabel: (config: RetirementConfig, currentAge: number) =>
      mode === "solo"
        ? `At age ${config.retirementAge}`
        : `By ${new Date().getFullYear() + (config.retirementAge - currentAge)}`,
    desiredIncomeLabel:
      mode === "partner"
        ? "Combined desired monthly income in retirement"
        : mode === "family"
          ? "Total desired monthly household income in retirement"
          : "Desired monthly income in retirement",
    monthlySavingsLabel:
      mode === "solo"
        ? "Monthly retirement savings"
        : "Combined monthly retirement savings",
    simulatorRetirementLabel:
      mode === "solo" ? "Retirement Age" : "Target Retirement Year",
    simulatorRetirementTip:
      mode === "solo"
        ? "Slide to see how retiring earlier or later changes your projected balance."
        : "Slide to see how your target retirement year affects your projected balance.",
  };
}

// ─── Projection helper ────────────────────────────────────────────────────────
function futureValue(
  pv: number,
  monthly: number,
  annualRate: number,
  years: number,
): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return pv + monthly * n;
  const g = Math.pow(1 + r, n);
  return pv * g + monthly * ((g - 1) / r);
}

function buildProjectionCurve(config: RetirementConfig) {
  const storeUser0 = useFinancialStore.getState().user;
  const currentAge = storeUser0?.date_of_birth ? getUserAge(storeUser0) : 0;
  const yearsToRetirement = config.retirementAge - currentAge;

  if (yearsToRetirement <= 0) {
    return [
      {
        age: currentAge,
        balance: config.currentInvested + config.existingPensionBalance,
        year: new Date().getFullYear(),
      },
    ];
  }

  const points = [];
  const step = Math.max(1, Math.ceil(yearsToRetirement / 20));

  for (let y = 0; y <= yearsToRetirement; y += step) {
    const balance = futureValue(
      config.currentInvested + config.existingPensionBalance,
      config.monthlySavings + config.monthlyPensionContribution,
      config.expectedReturnPct,
      y,
    );
    points.push({
      age: currentAge + y,
      balance,
      year: new Date().getFullYear() + y,
    });
  }

  const finalBalance = futureValue(
    config.currentInvested + config.existingPensionBalance,
    config.monthlySavings + config.monthlyPensionContribution,
    config.expectedReturnPct,
    yearsToRetirement,
  );
  if (points[points.length - 1].age !== config.retirementAge) {
    points.push({
      age: config.retirementAge,
      balance: finalBalance,
      year: new Date().getFullYear() + yearsToRetirement,
    });
  }
  return points;
}

// ─── Tooltip for chart ────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background shadow-md px-3 py-2.5 text-xs min-w-[160px] space-y-1">
      <p className="font-semibold text-foreground">Age {label}</p>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Info tooltip wrapper ─────────────────────────────────────────────────────
function InfoTip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help inline-flex">
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-xs">
          {content}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

// ─── Stat row ─────────────────────────────────────────────────────────────────
function StatRow({
  label,
  value,
  tip,
  valueClass,
}: {
  label: string;
  value: string;
  tip?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {label} {tip && <InfoTip content={tip} />}
      </span>
      <span
        className={`font-semibold tabular-nums ${valueClass ?? "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
function EditRetirementDialog({
  open,
  onClose,
  config,
  onSave,
  accountMode,
  currentAge,
}: {
  open: boolean;
  onClose: () => void;
  config: RetirementConfig;
  onSave: (c: RetirementConfig) => void;
  accountMode: AccountMode;
  currentAge: number;
}) {
  const [draft, setDraft] = React.useState<RetirementConfig>(config);
  // For non-solo: store target year in local state, derive retirementAge on save
  const [targetYear, setTargetYear] = React.useState<number>(
    new Date().getFullYear() + (config.retirementAge - currentAge),
  );

  React.useEffect(() => {
    if (open) {
      setDraft(config);
      setTargetYear(
        new Date().getFullYear() + (config.retirementAge - currentAge),
      );
    }
  }, [open, config, currentAge]);

  const isSolo = accountMode === "solo";
  const copy = getRetirementCopy(accountMode);

  const MONEY_KEYS = new Set([
    "currentInvested",
    "existingPensionBalance",
    "monthlySavings",
    "monthlyPensionContribution",
    "desiredMonthlyIncome",
  ]);

  function field(key: keyof RetirementConfig) {
    const num = draft[key] as number;
    const isMoney = MONEY_KEYS.has(key);
    return {
      value: isMoney ? num.toLocaleString("en-US") : String(num),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const stripped = e.target.value.replace(/,/g, "");
        setDraft((d) => ({
          ...d,
          [key]: stripped === "" ? 0 : Number(stripped),
        }));
      },
    };
  }

  function handleSave() {
    let finalDraft = { ...draft };
    if (!isSolo) {
      // Convert target year back to retirementAge
      const derivedAge = currentAge + (targetYear - new Date().getFullYear());
      finalDraft = {
        ...finalDraft,
        retirementAge: Math.max(currentAge + 1, derivedAge),
      };
    }
    onSave(finalDraft);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FontAwesomeIcon icon={faPencil} className="h-4 w-4 text-primary" />
            Edit Retirement Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Timeline
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Retirement age (solo) or target year (partner/family) */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  {copy.timelineLabel} <InfoTip content={copy.timelineTip} />
                </Label>
                {isSolo ? (
                  <Input
                    type="text"
                    inputMode="numeric"
                    {...field("retirementAge")}
                  />
                ) : (
                  <Input
                    type="number"
                    min={new Date().getFullYear() + 1}
                    max={2100}
                    value={targetYear}
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Life Expectancy{" "}
                  <InfoTip content="Used to calculate how long your savings need to last." />
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  {...field("lifeExpectancy")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Balances */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Current Balances
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: "currentInvested" as const,
                  label: "Invested Today",
                  tip: "Total value of your current investment portfolio.",
                },
                {
                  key: "existingPensionBalance" as const,
                  label: "Pension Balance",
                  tip: "Current balance in your pension or 401k account.",
                },
              ].map(({ key, label, tip }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    {label} <InfoTip content={tip} />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="pl-6"
                      {...field(key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Account type */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Account Type
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                Where retirement savings are held{" "}
                <InfoTip content="The primary account type where your retirement money is saved or invested." />
              </Label>
              <Select
                value={draft.storageLocation ?? ""}
                onValueChange={(value) =>
                  setDraft((d) => ({
                    ...d,
                    storageLocation: value || undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {RETIREMENT_STORAGE_LOCATIONS.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Monthly contributions */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Monthly Contributions
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: "monthlySavings" as const,
                  label: copy.monthlySavingsLabel,
                  tip: "Amount you invest each month from your income.",
                },
                {
                  key: "monthlyPensionContribution" as const,
                  label: "Pension Contribution",
                  tip: "Monthly amount added to your pension or 401k.",
                },
              ].map(({ key, label, tip }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    {label} <InfoTip content={tip} />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="pl-6"
                      {...field(key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Assumptions */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Assumptions
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: "expectedReturnPct" as const,
                  label: "Expected Return %",
                  tip: "Annual investment return rate. Historical S&P 500 average is ~7% inflation-adjusted.",
                },
                {
                  key: "inflationPct" as const,
                  label: "Inflation Rate %",
                  tip: "Expected annual inflation. Used to adjust your future purchasing power.",
                },
                {
                  key: "safeWithdrawalRatePct" as const,
                  label: "Safe Withdrawal %",
                  tip: "The '4% rule' - the percentage of your portfolio you withdraw each year in retirement.",
                },
                {
                  key: "desiredMonthlyIncome" as const,
                  label: copy.desiredIncomeLabel,
                  tip: "How much monthly income you want in retirement (today's dollars).",
                },
              ].map(({ key, label, tip }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    {label} <InfoTip content={tip} />
                  </Label>
                  <div className="relative">
                    {key === "desiredMonthlyIncome" && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                    )}
                    <Input
                      type={key.endsWith("Pct") ? "number" : "text"}
                      inputMode={key.endsWith("Pct") ? undefined : "numeric"}
                      step={key.endsWith("Pct") ? "0.1" : undefined}
                      className={key === "desiredMonthlyIncome" ? "pl-6" : ""}
                      {...field(key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Simulator Panel ──────────────────────────────────────────────────────────
function SimulatorPanel({
  base,
  currentAge,
  accountMode,
}: {
  base: RetirementConfig;
  currentAge: number;
  accountMode: AccountMode;
}) {
  const copy = getRetirementCopy(accountMode);
  const isSolo = accountMode === "solo";
  const currentYear = new Date().getFullYear();

  const [simRetirementAge, setSimRetirementAge] = React.useState(
    base.retirementAge,
  );
  const [simMonthlySavings, setSimMonthlySavings] = React.useState(
    base.monthlySavings,
  );
  const [simReturn, setSimReturn] = React.useState(base.expectedReturnPct);
  const [simDesiredIncome, setSimDesiredIncome] = React.useState(
    base.desiredMonthlyIncome,
  );

  const simConfig: RetirementConfig = {
    ...base,
    retirementAge: simRetirementAge,
    monthlySavings: simMonthlySavings,
    expectedReturnPct: simReturn,
    desiredMonthlyIncome: simDesiredIncome,
  };

  const baseOutputs = selectRetirementOutputs(base);
  const simOutputs = selectRetirementOutputs(simConfig);
  const baseProjection = buildProjectionCurve(base);
  const simProjection = buildProjectionCurve(simConfig);

  const maxLen = Math.max(baseProjection.length, simProjection.length);
  const merged = Array.from({ length: maxLen }, (_, i) => ({
    age: (baseProjection[i] ?? simProjection[i]).age,
    base: baseProjection[i]?.balance ?? null,
    simulated: simProjection[i]?.balance ?? null,
  }));

  const changed =
    simRetirementAge !== base.retirementAge ||
    simMonthlySavings !== base.monthlySavings ||
    simReturn !== base.expectedReturnPct ||
    simDesiredIncome !== base.desiredMonthlyIncome;

  const balanceDelta =
    simOutputs.projectedBalanceAtRetirement -
    baseOutputs.projectedBalanceAtRetirement;
  const incomeDelta =
    simOutputs.sustainableMonthlyIncome - baseOutputs.sustainableMonthlyIncome;

  // For display: convert retirementAge to year for non-solo
  const simDisplayValue = isSolo
    ? `Age ${simRetirementAge}`
    : `${currentYear + (simRetirementAge - currentAge)}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Retirement Age / Target Year */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5 font-semibold">
              <FontAwesomeIcon
                icon={faUserClock}
                className="h-3.5 w-3.5 text-amber-500"
              />
              {copy.simulatorRetirementLabel}
              <InfoTip content={copy.simulatorRetirementTip} />
            </Label>
            <span className="text-sm font-bold tabular-nums">
              {simDisplayValue}
            </span>
          </div>
          <Slider
            min={currentAge + 1}
            max={80}
            step={1}
            value={[simRetirementAge]}
            onValueChange={([v]) => setSimRetirementAge(v)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {isSolo ? (
              <>
                <span>Age {currentAge + 1}</span>
                <span>Age 80</span>
              </>
            ) : (
              <>
                <span>{currentYear + 1}</span>
                <span>{currentYear + (80 - currentAge)}</span>
              </>
            )}
          </div>
        </div>

        {/* Monthly Savings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5 font-semibold">
              <FontAwesomeIcon
                icon={faPiggyBank}
                className="h-3.5 w-3.5 text-emerald-500"
              />
              {copy.monthlySavingsLabel}
              <InfoTip content="Total monthly contribution to investments and pension combined." />
            </Label>
            <span className="text-sm font-bold tabular-nums">
              {formatCurrency(simMonthlySavings)}
            </span>
          </div>
          <Slider
            min={500}
            max={50000}
            step={500}
            value={[simMonthlySavings]}
            onValueChange={([v]) => setSimMonthlySavings(v)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$500/mo</span>
            <span>$50,000/mo</span>
          </div>
        </div>

        {/* Expected Return */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5 font-semibold">
              <FontAwesomeIcon
                icon={faChartLine}
                className="h-3.5 w-3.5 text-blue-500"
              />
              Expected Annual Return
              <InfoTip content="Historical S&P 500 real return is ~7%. Conservative portfolios typically return 4-5%." />
            </Label>
            <span className="text-sm font-bold tabular-nums">{simReturn}%</span>
          </div>
          <Slider
            min={1}
            max={15}
            step={0.5}
            value={[simReturn]}
            onValueChange={([v]) => setSimReturn(v)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1%</span>
            <span>15%</span>
          </div>
        </div>

        {/* Desired Income */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5 font-semibold">
              <FontAwesomeIcon
                icon={faSackDollar}
                className="h-3.5 w-3.5 text-violet-500"
              />
              {copy.desiredIncomeLabel}
              <InfoTip content="How much monthly income you want in retirement in today's dollars." />
            </Label>
            <span className="text-sm font-bold tabular-nums">
              {formatCurrency(simDesiredIncome)}
            </span>
          </div>
          <Slider
            min={1000}
            max={50000}
            step={500}
            value={[simDesiredIncome]}
            onValueChange={([v]) => setSimDesiredIncome(v)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$1,000/mo</span>
            <span>$50,000/mo</span>
          </div>
        </div>
      </div>

      {/* Impact Summary */}
      <AnimatePresence>
        {changed && (
          <motion.div
            initial={{ opacity: 0, transform: "translateY(-8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-8px)" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              {
                label: "Projected Balance",
                base: formatCurrency(baseOutputs.projectedBalanceAtRetirement),
                sim: formatCurrency(simOutputs.projectedBalanceAtRetirement),
                delta: balanceDelta,
              },
              {
                label: "Monthly Income",
                base: formatCurrency(baseOutputs.sustainableMonthlyIncome),
                sim: formatCurrency(simOutputs.sustainableMonthlyIncome),
                delta: incomeDelta,
              },
              {
                label: isSolo ? "Years to Retire" : "Target Year",
                base: isSolo
                  ? `${baseOutputs.yearsToRetirement}yr`
                  : `${currentYear + baseOutputs.yearsToRetirement}`,
                sim: isSolo
                  ? `${simOutputs.yearsToRetirement}yr`
                  : `${currentYear + simOutputs.yearsToRetirement}`,
                delta:
                  simOutputs.yearsToRetirement - baseOutputs.yearsToRetirement,
                invertDelta: true,
              },
              {
                label: "On Track",
                base: baseOutputs.onTrack ? "Yes" : "No",
                sim: simOutputs.onTrack ? "Yes" : "No",
                delta:
                  simOutputs.onTrack && !baseOutputs.onTrack
                    ? 1
                    : !simOutputs.onTrack && baseOutputs.onTrack
                      ? -1
                      : 0,
                isStatus: true,
              },
            ].map((item) => {
              const positive = item.invertDelta
                ? item.delta <= 0
                : item.delta >= 0;
              const color =
                item.delta === 0
                  ? "text-foreground"
                  : positive
                    ? "text-emerald-600"
                    : "text-red-500";
              return (
                <div
                  key={item.label}
                  className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1"
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs line-through text-muted-foreground/60">
                      {item.base}
                    </span>
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="h-2.5 w-2.5 text-muted-foreground"
                    />
                    <span className={`text-xs font-bold ${color}`}>
                      {item.sim}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dual projection chart */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-6 rounded-full"
              style={{ backgroundColor: NAVY }}
            />
            Current plan
          </div>
          {changed && (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-6 rounded-full"
                style={{ backgroundColor: BLUE }}
              />
              Simulated
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={merged}
            margin={{ left: 16, right: 16, top: 8, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="currentColor"
              strokeOpacity={0.1}
            />
            <XAxis
              dataKey="age"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                isSolo ? `${v}` : `${currentYear + (v - currentAge)}`
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              dataKey="base"
              name="Current plan"
              stroke={NAVY}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {changed && (
              <Line
                dataKey="simulated"
                name="Simulated"
                stroke={BLUE}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {changed && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => {
              setSimRetirementAge(base.retirementAge);
              setSimMonthlySavings(base.monthlySavings);
              setSimReturn(base.expectedReturnPct);
              setSimDesiredIncome(base.desiredMonthlyIncome);
            }}
          >
            <FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" /> Reset
            to current plan
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RetirementPage() {
  const router = useRouter();
  const { loading } = usePageData("retirement");
  const storeUser = useFinancialStore((s) => s.user);
  const storeRetirement = useFinancialStore((s) => s.retirement);
  const accountMode: AccountMode =
    (storeUser?.account_mode as AccountMode) ?? "solo";
  const isSolo = accountMode === "solo";
  const currentAge = storeUser?.date_of_birth ? getUserAge(storeUser) : 0;
  const currentYear = new Date().getFullYear();
  const copy = getRetirementCopy(accountMode);

  const [config, setConfig] = React.useState<RetirementConfig>(
    () => useFinancialStore.getState().retirement,
  );

  // Sync local config when the store is updated by the fetch
  React.useEffect(() => {
    setConfig(storeRetirement);
  }, [storeRetirement]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "simulator" | "insights"
  >("overview");

  const outputs = React.useMemo(
    () => selectRetirementOutputs(config),
    [config],
  );
  const projection = React.useMemo(
    () => buildProjectionCurve(config),
    [config],
  );

  const progressPct = Math.min(
    (config.currentInvested / outputs.projectedBalanceAtRetirement) * 100,
    100,
  );

  const incomeGapAbs = Math.abs(outputs.incomeGap);
  const onTrack = outputs.onTrack;
  const gapDirection = outputs.incomeGap < 0 ? "shortfall" : "surplus";
  const totalMonthly =
    config.monthlySavings + config.monthlyPensionContribution;
  const totalInvested = config.currentInvested + config.existingPensionBalance;

  // Derived target year for non-solo display
  const targetYear = currentYear + (config.retirementAge - currentAge);

  const insights = React.useMemo(() => {
    const list: {
      level: "good" | "warning" | "danger" | "info";
      title: string;
      body: string;
      icon: any;
    }[] = [];

    if (onTrack) {
      list.push({
        level: "good",
        title: isSolo
          ? "On track to retire comfortably"
          : "Household on track to retire comfortably",
        body: `At ${formatCurrency(totalMonthly)}/mo saved, ${isSolo ? "you" : "you're both"} projected to reach ${formatCurrency(outputs.projectedBalanceAtRetirement)} by ${isSolo ? `age ${config.retirementAge}` : targetYear}. That supports about ${formatCurrency(outputs.sustainableMonthlyIncome)}/mo.`,
        icon: faCircleCheck,
      });
    } else {
      list.push({
        level: "danger",
        title: `Income shortfall of ${formatCurrency(incomeGapAbs)}/mo`,
        body: `${isSolo ? "Your" : "Your household's"} projected income of ${formatCurrency(outputs.sustainableMonthlyIncome)}/mo is below the ${formatCurrency(config.desiredMonthlyIncome)}/mo target. Raise contributions or push retirement age to close the gap.`,
        icon: faTriangleExclamation,
      });
    }

    if (
      config.monthlySavings /
        (config.monthlySavings + config.monthlyPensionContribution || 1) <
      0.3
    ) {
      list.push({
        level: "info",
        title: "Most savings go to pension",
        body: `${Math.round((config.monthlyPensionContribution / totalMonthly) * 100)}% of ${isSolo ? "your" : "combined"} contributions hit pension. Fine for tax relief, but personal investments give more flexibility later.`,
        icon: faBuildingColumns,
      });
    }

    const storageTip = getRetirementStorageTip(config.storageLocation);
    if (storageTip?.tone === "warning") {
      list.push({
        level: "warning",
        title: storageTip.title,
        body: storageTip.text,
        icon: faCoins,
      });
    } else if (!config.storageLocation) {
      list.push({
        level: "info",
        title: "Where is the money held?",
        body: "Tell us which account holds retirement savings so we can flag cash or low-yield accounts that slow growth.",
        icon: faPiggyBank,
      });
    }

    if (outputs.yearsToRetirement <= 5) {
      list.push({
        level: "warning",
        title: "Retirement is close",
        body: `${outputs.yearsToRetirement} years left. Consider shifting to a more conservative mix so a late market drop does not wipe out recent gains.`,
        icon: faHourglassHalf,
      });
    }

    if (config.expectedReturnPct > 9) {
      list.push({
        level: "warning",
        title: "Return assumption is high",
        body: `You model ${config.expectedReturnPct}% annual returns. Diversified portfolios historically do 6-7% real. Try a lower rate in the simulator.`,
        icon: faChartLine,
      });
    }

    if (progressPct >= 50 && progressPct < 75) {
      list.push({
        level: "info",
        title: "Past halfway",
        body: `${isSolo ? "You have" : "The household has"} ${progressPct.toFixed(0)}% of the projected retirement pot. Keep contributions steady and you stay on schedule.`,
        icon: faLightbulb,
      });
    }

    return list.slice(0, 5);
  }, [
    config,
    outputs,
    onTrack,
    incomeGapAbs,
    totalMonthly,
    progressPct,
    isSolo,
    targetYear,
  ]);

  const kpiItems = [
    {
      label: "Projected Balance",
      value: formatCurrency(outputs.projectedBalanceAtRetirement),
      subline: copy.projectedAtLabel(config, currentAge),
      tone: onTrack ? ("good" as const) : ("warning" as const),
    },
    {
      label: "Sustainable Income",
      value: `${formatCurrency(outputs.sustainableMonthlyIncome)}/mo`,
      subline: `Based on ${config.safeWithdrawalRatePct}% withdrawal rate`,
      tone: onTrack ? ("good" as const) : ("danger" as const),
    },
    {
      label: isSolo ? "Years to Retirement" : "Target Retirement",
      value: isSolo ? `${outputs.yearsToRetirement} years` : `${targetYear}`,
      subline: isSolo
        ? `Retire at age ${config.retirementAge}`
        : `${outputs.yearsToRetirement} years away`,
      tone: "neutral" as const,
    },
    {
      label: "Income Gap",
      value:
        outputs.incomeGap <= 0
          ? `${formatCurrency(incomeGapAbs)} shortfall`
          : `${formatCurrency(incomeGapAbs)} surplus`,
      subline: `Target: ${formatCurrency(config.desiredMonthlyIncome)}/mo`,
      tone: onTrack ? ("good" as const) : ("danger" as const),
    },
  ];

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: faChartLine },
    { key: "simulator" as const, label: "Simulator", icon: faFlaskVial },
    { key: "insights" as const, label: "Insights", icon: faLightbulb },
  ];

  const mc = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };
  const mi = {
    hidden: { opacity: 0, transform: "translateY(14px)" },
    show: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const } },
  };

  return (
    <TooltipProvider>
      <motion.div
        initial="hidden"
        animate="show"
        variants={mc}
        className="w-full"
      >
        <div className={dashboardTheme.pageContainer}>
          {/* ── Header ── */}
          <motion.div
            variants={mi}
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Retirement
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {copy.planningSubline(config, currentAge)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs gap-1.5 px-3 py-1 ${
                  onTrack
                    ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                    : "text-red-500 border-red-200 bg-red-50"
                }`}
              >
                <FontAwesomeIcon
                  icon={onTrack ? faArrowTrendUp : faArrowTrendDown}
                  className="h-3 w-3"
                />
                {onTrack ? "On Track" : "Needs Attention"}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                data-tour="primary-action"
                onClick={() => setEditOpen(true)}
              >
                <FontAwesomeIcon icon={faPencil} className="h-3 w-3" />
                Edit plan
              </Button>
            </div>
          </motion.div>

          {/* ── KPI Strip ── */}
          <motion.div variants={mi}>
            <KpiStrip cols={4} items={kpiItems} loading={loading} />
          </motion.div>

          {/* ── Tabs ── */}
          <motion.div variants={mi}>
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97] ${
                    activeTab === tab.key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Tab Content ── */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-36 w-full rounded-xl" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, transform: "translateY(12px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(-8px)" }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Projection Chart */}
                  <div>
                    <SectionLabel>Wealth projection</SectionLabel>
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">
                              Portfolio growth to retirement
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isSolo
                                ? `Age ${currentAge} → ${config.retirementAge}`
                                : `${currentYear} → ${targetYear}`}{" "}
                              · {config.expectedReturnPct}% annual return
                              assumed
                            </p>
                          </div>
                          <InfoTip content="Projection compounds your current balance plus monthly contributions at the assumed annual return rate. This is a model, not a guarantee." />
                        </div>
                      </CardHeader>
                      <CardContent className="px-2 sm:px-6 pt-2">
                        <ResponsiveContainer width="100%" height={240}>
                          <AreaChart
                            data={projection}
                            margin={{ left: 16, right: 16, top: 8, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="balGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor={NAVY}
                                  stopOpacity={0.25}
                                />
                                <stop
                                  offset="95%"
                                  stopColor={NAVY}
                                  stopOpacity={0.02}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              vertical={false}
                              strokeDasharray="3 3"
                              stroke="currentColor"
                              strokeOpacity={0.1}
                            />
                            <XAxis
                              dataKey="age"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) =>
                                isSolo
                                  ? `Age ${v}`
                                  : `${currentYear + (v - currentAge)}`
                              }
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) =>
                                `$${(v / 1000000).toFixed(1)}M`
                              }
                              width={56}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <ReferenceLine
                              x={config.retirementAge}
                              stroke={AMBER}
                              strokeDasharray="4 3"
                              label={{
                                value: isSolo ? "Retire" : `${targetYear}`,
                                position: "top",
                                fontSize: 10,
                                fill: AMBER,
                              }}
                            />
                            <Area
                              dataKey="balance"
                              name="Portfolio balance"
                              stroke={NAVY}
                              strokeWidth={2}
                              fill="url(#balGrad)"
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <RetirementStorageCard
                    storageLocation={config.storageLocation}
                    monthlySavings={totalMonthly}
                    onEdit={() => setEditOpen(true)}
                  />

                  {/* Progress + Details grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1">
                      <CardContent className="pt-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-emerald-500/10">
                            <FontAwesomeIcon
                              icon={faShieldHalved}
                              className="h-4 w-4 text-emerald-500"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              Savings progress
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {progressPct.toFixed(0)}% of target
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Progress value={progressPct} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(totalInvested)} today</span>
                            <span>
                              {formatCurrency(
                                outputs.projectedBalanceAtRetirement,
                              )}{" "}
                              target
                            </span>
                          </div>
                        </div>
                        <Separator />
                        <StatRow
                          label="Current invested"
                          value={formatCurrency(config.currentInvested)}
                          tip="Value of your current investment portfolio today."
                        />
                        <StatRow
                          label="Pension balance"
                          value={formatCurrency(config.existingPensionBalance)}
                          tip="Current balance in your pension or 401k."
                        />
                        <StatRow
                          label={copy.monthlySavingsLabel}
                          value={formatCurrency(totalMonthly)}
                          tip="Combined monthly amount going into investments and pension."
                        />
                        <StatRow
                          label="Contribution split"
                          value={`${Math.round((config.monthlySavings / totalMonthly) * 100)}% inv / ${Math.round((config.monthlyPensionContribution / totalMonthly) * 100)}% pension`}
                          tip="How your monthly contributions are split between personal investments and pension."
                        />
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardContent className="pt-5 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              Retirement income
                            </p>
                            <StatRow
                              label={copy.desiredIncomeLabel}
                              value={`${formatCurrency(config.desiredMonthlyIncome)}/mo`}
                              tip={`${isSolo ? "Your" : "Your combined household"} target monthly income in retirement, in today's dollars.`}
                            />
                            <StatRow
                              label="Sustainable income"
                              value={`${formatCurrency(outputs.sustainableMonthlyIncome)}/mo`}
                              tip={`Calculated using the ${config.safeWithdrawalRatePct}% safe withdrawal rate on your projected balance.`}
                              valueClass={
                                onTrack ? "text-emerald-600" : "text-red-500"
                              }
                            />
                            <StatRow
                              label="Inflation-adjusted"
                              value={`${formatCurrency(outputs.inflationAdjustedSustainableMonthlyIncome)}/mo`}
                              tip="Your sustainable income adjusted for inflation over the years to retirement."
                            />
                            <StatRow
                              label={
                                gapDirection === "shortfall"
                                  ? "Income shortfall"
                                  : "Income surplus"
                              }
                              value={formatCurrency(incomeGapAbs) + "/mo"}
                              tip={`Difference between ${isSolo ? "your" : "your combined"} desired income and what your portfolio can sustainably provide.`}
                              valueClass={
                                onTrack ? "text-emerald-600" : "text-red-500"
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              Assumptions
                            </p>
                            <StatRow
                              label="Expected return"
                              value={`${config.expectedReturnPct}%/yr`}
                              tip="Annual investment return assumed for the projection."
                            />
                            <StatRow
                              label="Inflation rate"
                              value={`${config.inflationPct}%/yr`}
                              tip="Expected annual inflation used to adjust future purchasing power."
                            />
                            <StatRow
                              label="Safe withdrawal"
                              value={`${config.safeWithdrawalRatePct}%/yr`}
                              tip="The '4% rule' - percentage of portfolio withdrawn each year."
                            />
                            <StatRow
                              label="Life expectancy"
                              value={`Age ${config.lifeExpectancy}`}
                              tip="Used to calculate how long your savings need to last in retirement."
                            />
                            <StatRow
                              label="Retirement duration"
                              value={`${config.lifeExpectancy - config.retirementAge} years`}
                              tip="How long your retirement savings need to fund your lifestyle."
                            />
                          </div>
                        </div>

                        <Separator />

                        <div
                          className={`rounded-lg px-4 py-3 flex items-start gap-3 ${
                            onTrack
                              ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                              : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={onTrack ? faCircleCheck : faCircleExclamation}
                            className={`h-4 w-4 mt-0.5 shrink-0 ${onTrack ? "text-emerald-600" : "text-red-500"}`}
                          />
                          <div>
                            <p
                              className={`text-xs font-semibold ${onTrack ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}
                            >
                              {onTrack
                                ? `${isSolo ? "You're" : "You're both"} on track - projected surplus of ${formatCurrency(incomeGapAbs)}/mo`
                                : `Shortfall of ${formatCurrency(incomeGapAbs)}/mo at current trajectory`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {onTrack
                                ? `${isSolo ? "Your" : "Your combined"} ${formatCurrency(totalMonthly)}/mo in contributions should grow to ${formatCurrency(outputs.projectedBalanceAtRetirement)} by ${isSolo ? `age ${config.retirementAge}` : targetYear}.`
                                : `Try increasing ${isSolo ? "your" : "your combined"} monthly contributions or adjusting ${isSolo ? "your retirement age" : "your target retirement year"} in the Simulator tab.`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === "simulator" && (
                <motion.div
                  key="simulator"
                  initial={{ opacity: 0, transform: "translateY(12px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(-8px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <SectionLabel>What-if simulator</SectionLabel>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={faSliders}
                              className="h-4 w-4 text-primary"
                            />
                            Adjust the levers
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Slide to simulate changes - see the impact on{" "}
                            {isSolo ? "your" : "your household's"} retirement
                            balance in real time
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <SimulatorPanel
                        base={config}
                        currentAge={currentAge}
                        accountMode={accountMode}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === "insights" && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, transform: "translateY(12px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(-8px)" }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <SectionLabel>Personalised insights</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {insights.map((ins, i) => {
                        const cfg = {
                          good: {
                            bg: "bg-emerald-50 dark:bg-emerald-950/30",
                            border:
                              "border-emerald-200 dark:border-emerald-800",
                            text: "text-emerald-700 dark:text-emerald-300",
                            iconColor: "text-emerald-500",
                          },
                          warning: {
                            bg: "bg-amber-50 dark:bg-amber-950/30",
                            border: "border-amber-200 dark:border-amber-800",
                            text: "text-amber-700 dark:text-amber-300",
                            iconColor: "text-amber-500",
                          },
                          danger: {
                            bg: "bg-red-50 dark:bg-red-950/30",
                            border: "border-red-200 dark:border-red-800",
                            text: "text-red-700 dark:text-red-400",
                            iconColor: "text-red-500",
                          },
                          info: {
                            bg: "bg-blue-50 dark:bg-blue-950/30",
                            border: "border-blue-200 dark:border-blue-800",
                            text: "text-blue-700 dark:text-blue-300",
                            iconColor: "text-blue-500",
                          },
                        }[ins.level];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, transform: "translateY(10px)" }}
                            animate={{ opacity: 1, transform: "translateY(0px)" }}
                            transition={{ delay: i * 0.08 }}
                            className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}
                          >
                            <div className="flex items-start gap-3">
                              <FontAwesomeIcon
                                icon={ins.icon}
                                className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.iconColor}`}
                              />
                              <div>
                                <p
                                  className={`text-xs font-semibold ${cfg.text}`}
                                >
                                  {ins.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {ins.body}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Key numbers at a glance</SectionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        {
                          icon: faCalendarDays,
                          label: copy.currentAgeLabel,
                          value: copy.currentAgeValue(
                            currentAge,
                            outputs.yearsToRetirement,
                          ),
                          color: "text-blue-500",
                          bg: "bg-blue-500/10",
                        },
                        {
                          icon: faUserClock,
                          label: copy.timelineLabel,
                          value: copy.timelineValue(config, currentAge),
                          color: "text-amber-500",
                          bg: "bg-amber-500/10",
                        },
                        {
                          icon: faSackDollar,
                          label: "Total Contributions",
                          value: formatCurrency(totalInvested),
                          color: "text-emerald-500",
                          bg: "bg-emerald-500/10",
                        },
                        {
                          icon: faChartLine,
                          label: "Projected Balance",
                          value: formatCurrency(
                            outputs.projectedBalanceAtRetirement,
                          ),
                          color: undefined,
                          bg: "bg-primary/10",
                        },
                      ].map((item, i) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.07 }}
                        >
                          <Card>
                            <CardContent className="pt-4 pb-4">
                              <div
                                className={`p-2 rounded-lg w-fit mb-2 ${item.bg}`}
                              >
                                <FontAwesomeIcon
                                  icon={item.icon}
                                  className={`h-4 w-4 ${item.color ?? "text-primary"}`}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.label}
                              </p>
                              <p className="text-sm font-bold mt-0.5 tabular-nums">
                                {item.value}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <Card className="border-dashed">
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FontAwesomeIcon
                              icon={faFlaskVial}
                              className="h-4 w-4 text-primary"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              Try the simulator
                            </p>
                            <p className="text-xs text-muted-foreground">
                              See how changing{" "}
                              {isSolo
                                ? "your retirement age"
                                : "your target retirement year"}{" "}
                              or contributions affects the outcome
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="gap-1.5 shrink-0"
                          onClick={() => setActiveTab("simulator")}
                        >
                          <FontAwesomeIcon
                            icon={faSliders}
                            className="h-3 w-3"
                          />
                          Open simulator
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <EditRetirementDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          config={config}
          onSave={(newConfig) => {
            setConfig(newConfig);
            useFinancialStore.getState().setRetirement(newConfig);
            updateRetirement(newConfig).then((updated) => {
              if (updated) {
                useFinancialStore.getState().setRetirement(updated);
                setConfig(updated);
              }
            });
          }}
          accountMode={accountMode}
          currentAge={currentAge}
        />
      </motion.div>
    </TooltipProvider>
  );
}

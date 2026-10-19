"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShield,
  faPlus,
  faPencil,
  faTrash,
  faChevronDown,
  faChevronUp,
  faArrowUpRightFromSquare,
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation,
  faRotateRight,
  faInfoCircle,
  faHouse,
  faHeartPulse,
  faCar,
  faUmbrella,
  faPersonCane,
  faPaw,
  faPlaneDeparture,
  faFileShield,
  faCoins,
  faCalendarDays,
  faLightbulb,
  faArrowRight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { DashboardSectionLabelWide as SectionLabel } from "@/components/dashboard/section-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  INSURANCE_CATEGORIES,
  insuranceCategoryLabel,
  selectInsuranceSummary,
  formatCurrency,
  totalInsurancePremium,
  totalInsuranceCoverage,
  propertyInsuranceTypeLabel,
  isInsuranceExpiringSoon,
  isInsuranceExpired,
  type InsurancePolicy,
  type InsuranceCategory,
  type Property,
  type PropertyInsurance,
} from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { useTourDemoData } from "@/hooks/useTourDemo";
import { TOUR_DEMO_INSURANCE_POLICIES } from "@/lib/tour-demo-data";
import {
  createInsurancePolicy,
  updateInsurancePolicy,
  deleteInsurancePolicy,
} from "@/lib/dashboard-api";
import { usePageData } from "@/hooks/usePageData";
import { toast } from "sonner";
import { blockRecordCreate } from "@/lib/record-limits";
import { DateInput } from "@/components/ui/date-input";
import { MoneyInput } from "@/components/ui/money-input";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Asset-linked entry type ──────────────────────────────────────────────────

interface PropertyLinkedEntry {
  entryId: string;
  property: Property;
  policy: PropertyInsurance;
}

// ─── Brand color ──────────────────────────────────────────────────────────────
const PRIMARY = "var(--brand-primary)";

// ─── Category icon map ────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<InsuranceCategory, any> = {
  life: faFileShield,
  health: faHeartPulse,
  auto: faCar,
  home: faHouse,
  disability: faPersonCane,
  umbrella: faUmbrella,
  liability: faShield,
  travel: faPlaneDeparture,
  pet: faPaw,
  other: faCoins,
};

// Recommended insurance categories for context
const RECOMMENDED_CATEGORIES: InsuranceCategory[] = [
  "life",
  "health",
  "home",
  "auto",
  "disability",
  "umbrella",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoTip({ content }: { content: string }) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help inline-flex">
          <FontAwesomeIcon
            icon={faInfoCircle}
            className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-55 text-xs">{content}</TooltipContent>
    </UITooltip>
  );
}


function getRenewalStatus(renewalDate: string): {
  label: string;
  days: number;
  tone: "expired" | "urgent" | "soon" | "ok";
} {
  const days = Math.ceil(
    (new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return { label: "Expired", days, tone: "expired" };
  if (days <= 30) return { label: `${days}d left`, days, tone: "urgent" };
  if (days <= 60) return { label: `${days}d left`, days, tone: "soon" };
  return { label: `${days}d`, days, tone: "ok" };
}

function RenewalBadge({ renewalDate }: { renewalDate: string }) {
  const { label, tone } = getRenewalStatus(renewalDate);
  const styles = {
    expired: "text-red-600 border-red-200 bg-red-50",
    urgent: "text-red-600 border-red-200 bg-red-50",
    soon: "text-amber-600 border-amber-200 bg-amber-50",
    ok: "text-emerald-600 border-emerald-200 bg-emerald-50",
  };
  const icons = {
    expired: faCircleExclamation,
    urgent: faTriangleExclamation,
    soon: faCalendarDays,
    ok: faCircleCheck,
  };
  return (
    <Badge variant="outline" className={`text-xs gap-1 py-0 ${styles[tone]}`}>
      <FontAwesomeIcon icon={icons[tone]} className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}

// ─── Add / Edit Policy Dialog ─────────────────────────────────────────────────

interface PolicyDraft {
  category: InsuranceCategory;
  provider: string;
  name: string;
  policy_number: string;
  coverage_amount: string;
  premium_monthly: string;
  deductible: string;
  start_date: string;
  renewal_date: string;
  auto_renew: boolean;
  beneficiary: string;
  notes: string;
}

const defaultDraft: PolicyDraft = {
  category: "life",
  provider: "",
  name: "",
  policy_number: "",
  coverage_amount: "",
  premium_monthly: "",
  deductible: "",
  start_date: new Date().toISOString().slice(0, 10),
  renewal_date: "",
  auto_renew: true,
  beneficiary: "",
  notes: "",
};

function PolicyDialog({
  open,
  onClose,
  onSave,
  editPolicy,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (p: InsurancePolicy) => void;
  editPolicy?: InsurancePolicy | null;
}) {
  const [draft, setDraft] = React.useState<PolicyDraft>(defaultDraft);

  React.useEffect(() => {
    if (!open) return;
    if (editPolicy) {
      setDraft({
        category: editPolicy.category,
        provider: editPolicy.provider,
        name: editPolicy.name,
        policy_number: editPolicy.policy_number,
        coverage_amount: String(editPolicy.coverage_amount),
        premium_monthly: String(editPolicy.premium_monthly),
        deductible: String(editPolicy.deductible),
        start_date: editPolicy.start_date,
        renewal_date: editPolicy.renewal_date,
        auto_renew: editPolicy.auto_renew,
        beneficiary: editPolicy.beneficiary ?? "",
        notes: editPolicy.notes ?? "",
      });
    } else {
      setDraft(defaultDraft);
    }
  }, [open, editPolicy]);

  function set<K extends keyof PolicyDraft>(key: K, val: PolicyDraft[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  function handleSave() {
    const now = new Date().toISOString();
    const policy: InsurancePolicy = {
      policy_id: editPolicy?.policy_id ?? `ins-${Date.now()}`,
      user_id: "u-1",
      category: draft.category,
      provider: draft.provider,
      name: draft.name,
      policy_number: draft.policy_number,
      coverage_amount: Number(draft.coverage_amount) || 0,
      premium_monthly: Number(draft.premium_monthly) || 0,
      deductible: Number(draft.deductible) || 0,
      start_date: draft.start_date,
      renewal_date: draft.renewal_date,
      auto_renew: draft.auto_renew,
      beneficiary: draft.beneficiary || undefined,
      notes: draft.notes || undefined,
      is_active: true,
      created_at: editPolicy?.created_at ?? now,
      updated_at: now,
    };
    onSave(policy);
    onClose();
  }

  const canSave =
    draft.name.trim() && draft.provider.trim() && draft.renewal_date;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FontAwesomeIcon
              icon={faShield}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            {editPolicy ? "Edit policy" : "Add insurance policy"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Category</Label>
            <div className="grid grid-cols-5 gap-2">
              {INSURANCE_CATEGORIES.filter((cat) => cat.value !== "home").map(
                (cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => set("category", cat.value)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97] flex flex-col items-center gap-1 ${
                      draft.category === cat.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-background text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={CATEGORY_ICONS[cat.value]}
                      className="h-3.5 w-3.5"
                    />
                    {cat.label}
                  </button>
                ),
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <FontAwesomeIcon icon={faHouse} className="h-3 w-3" />
              Home / property insurance is managed directly on each property.
            </p>
          </div>

          <Separator />

          {/* Provider + name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Provider</Label>
              <Input
                placeholder="e.g. MetLife"
                value={draft.provider}
                onChange={(e) => set("provider", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Policy name</Label>
              <Input
                placeholder="e.g. Term Life Insurance"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
          </div>

          {/* Policy number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Policy number</Label>
            <Input
              placeholder="e.g. ML-2022-44190"
              value={draft.policy_number}
              onChange={(e) => set("policy_number", e.target.value)}
            />
          </div>

          <Separator />

          {/* Financials */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Coverage
                <InfoTip content="Total payout amount this policy provides." />
              </Label>
              <MoneyInput
                value={draft.coverage_amount}
                onChange={(v) => set("coverage_amount", v)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Monthly premium
                <InfoTip content="What you pay each month to keep this policy active." />
              </Label>
              <MoneyInput
                value={draft.premium_monthly}
                onChange={(v) => set("premium_monthly", v)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Deductible
                <InfoTip content="Amount you pay out of pocket before the policy kicks in." />
              </Label>
              <MoneyInput
                value={draft.deductible}
                onChange={(v) => set("deductible", v)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Start date</Label>
              <DateInput
                value={draft.start_date}
                onChange={(v) => set("start_date", v)}
                placeholder="Pick start date"
                toYear={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Renewal date</Label>
              <DateInput
                value={draft.renewal_date}
                onChange={(v) => set("renewal_date", v)}
                placeholder="Pick renewal date"
                fromDate={new Date()}
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 40}
              />
            </div>
          </div>

          {/* Auto-renew toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Auto-renew
              <InfoTip content="Whether this policy renews automatically when it expires." />
            </Label>
            <button
              type="button"
              role="switch"
              aria-checked={draft.auto_renew}
              onClick={() => set("auto_renew", !draft.auto_renew)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none`}
              style={{
                backgroundColor: draft.auto_renew ? PRIMARY : undefined,
              }}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  draft.auto_renew ? "translate-x-4" : "translate-x-1 bg-muted"
                }`}
              />
            </button>
          </div>

          {/* Beneficiary (life / disability only) */}
          {["life", "disability"].includes(draft.category) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Beneficiary</Label>
              <Input
                placeholder="e.g. Spouse"
                value={draft.beneficiary}
                onChange={(e) => set("beneficiary", e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              placeholder="Any reminders or context about this policy..."
              rows={2}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            style={{ backgroundColor: PRIMARY, color: "white" }}
          >
            {editPolicy ? "Save changes" : "Add policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Policy card ──────────────────────────────────────────────────────────────

function PolicyCard({
  policy,
  onEdit,
  onDeactivate,
}: {
  policy: InsurancePolicy;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const renewal = getRenewalStatus(policy.renewal_date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      className="border rounded-lg overflow-hidden"
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: `${PRIMARY}12` }}
        >
          <FontAwesomeIcon
            icon={CATEGORY_ICONS[policy.category]}
            className="h-3.5 w-3.5"
            style={{ color: PRIMARY }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{policy.name}</p>
            <Badge
              variant="outline"
              className="text-xs py-0 shrink-0 capitalize"
            >
              {insuranceCategoryLabel(policy.category)}
            </Badge>
            {!policy.auto_renew && (
              <Badge
                variant="outline"
                className="text-xs py-0 shrink-0 text-amber-600 border-amber-200 bg-amber-50"
              >
                Manual renewal
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{policy.provider}</p>
        </div>

        <div className="hidden sm:block shrink-0">
          <RenewalBadge renewalDate={policy.renewal_date} />
        </div>

        <div className="text-right shrink-0 hidden md:block w-24">
          <p className="text-xs text-muted-foreground">Coverage</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(policy.coverage_amount)}
          </p>
        </div>

        <div className="text-right shrink-0 w-20">
          <p className="text-xs text-muted-foreground">Premium</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(policy.premium_monthly)}/mo
          </p>
        </div>

        <FontAwesomeIcon
          icon={expanded ? faChevronUp : faChevronDown}
          className="h-3 w-3 text-muted-foreground shrink-0"
        />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t bg-muted/10 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Policy number</p>
                  <p className="text-sm font-medium font-mono">
                    {policy.policy_number || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Deductible
                    <InfoTip content="Amount you pay out of pocket before the policy pays out." />
                  </p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(policy.deductible)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Annual premium
                  </p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(policy.premium_monthly * 12)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start date</p>
                  <p className="text-sm font-semibold">
                    {new Date(policy.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Renewal date</p>
                  <p className="text-sm font-semibold">
                    {new Date(policy.renewal_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Auto-renew</p>
                  <p className="text-sm font-semibold">
                    {policy.auto_renew ? "Yes" : "No"}
                  </p>
                </div>
                {policy.beneficiary && (
                  <div>
                    <p className="text-xs text-muted-foreground">Beneficiary</p>
                    <p className="text-sm font-semibold">
                      {policy.beneficiary}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold capitalize">
                    {getRenewalStatus(policy.renewal_date).tone === "expired"
                      ? "Expired"
                      : "Active"}
                  </p>
                </div>
              </div>

              {policy.notes && (
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    {policy.notes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <FontAwesomeIcon icon={faPencil} className="h-3 w-3" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeactivate();
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} className="h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Property-linked policy card (read-only, redirects to property edit) ─────

function PropertyPolicyCard({
  entry,
  onGoToProperty,
}: {
  entry: PropertyLinkedEntry;
  onGoToProperty: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const { policy, property } = entry;

  const expired = isInsuranceExpired(policy);
  const expiringSoon = isInsuranceExpiringSoon(policy) && !expired;
  const daysToExpiry = Math.ceil(
    (new Date(policy.expiry_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );

  const expiryTone: "expired" | "urgent" | "soon" | "ok" = expired
    ? "expired"
    : daysToExpiry <= 30
      ? "urgent"
      : daysToExpiry <= 60
        ? "soon"
        : "ok";

  const expiryStyles = {
    expired: "text-red-600 border-red-200 bg-red-50",
    urgent: "text-red-600 border-red-200 bg-red-50",
    soon: "text-amber-600 border-amber-200 bg-amber-50",
    ok: "text-emerald-600 border-emerald-200 bg-emerald-50",
  };
  const expiryIcons = {
    expired: faCircleExclamation,
    urgent: faTriangleExclamation,
    soon: faCalendarDays,
    ok: faCircleCheck,
  };
  const expiryLabel = expired ? "Expired" : `${daysToExpiry}d left`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      className="border rounded-lg overflow-hidden bg-muted/30"
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: `${PRIMARY}0d` }}
        >
          <FontAwesomeIcon
            icon={faHouse}
            className="h-3.5 w-3.5"
            style={{ color: PRIMARY }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">
              {policy.provider}{" "}
              <span className="font-normal text-muted-foreground">
                - {propertyInsuranceTypeLabel(policy.insurance_type)}
              </span>
            </p>
            <Badge
              variant="outline"
              className="text-2.5 py-0 gap-1 shrink-0 text-muted-foreground border-muted-foreground/30 bg-background"
            >
              <FontAwesomeIcon icon={faHouse} className="h-2.5 w-2.5" />
              Managed via Property
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {property.name} · {property.city}
          </p>
        </div>

        <div className="hidden sm:block shrink-0">
          <Badge
            variant="outline"
            className={`text-xs gap-1 py-0 ${expiryStyles[expiryTone]}`}
          >
            <FontAwesomeIcon
              icon={expiryIcons[expiryTone]}
              className="h-2.5 w-2.5"
            />
            {expiryLabel}
          </Badge>
        </div>

        <div className="text-right shrink-0 hidden md:block w-24">
          <p className="text-xs text-muted-foreground">Coverage</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(policy.coverage_amount)}
          </p>
        </div>

        <div className="text-right shrink-0 w-20">
          <p className="text-xs text-muted-foreground">Premium</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(Math.round(policy.annual_premium / 12))}/mo
          </p>
        </div>

        <FontAwesomeIcon
          icon={expanded ? faChevronUp : faChevronDown}
          className="h-3 w-3 text-muted-foreground shrink-0"
        />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t bg-muted/10 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Policy number</p>
                  <p className="text-sm font-medium font-mono">
                    {policy.policy_number || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deductible</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(policy.deductible)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Annual premium
                  </p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(policy.annual_premium)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiry date</p>
                  <p
                    className={`text-sm font-semibold ${expired ? "text-red-600" : expiringSoon ? "text-amber-600" : ""}`}
                  >
                    {new Date(policy.expiry_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Insurance type
                  </p>
                  <p className="text-sm font-semibold capitalize">
                    {propertyInsuranceTypeLabel(policy.insurance_type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Property</p>
                  <p className="text-sm font-semibold truncate">
                    {property.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-semibold">
                    {property.city}, {property.country}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1 justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-1">
                  <FontAwesomeIcon
                    icon={faHouse}
                    className="h-3 w-3"
                    style={{ color: PRIMARY }}
                  />
                  This policy is managed on the property. To edit or remove it,
                  go to the property.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToProperty();
                  }}
                >
                  Edit in Properties
                  <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InsurancePage() {
  const router = useRouter();
  const { loading } = usePageData("insurance");
  const storeProperties = useFinancialStore((s) => s.propertyAssets);
  const storeInsurancePolicies = useFinancialStore((s) => s.insurancePolicies);

  const { data: policies } = useTourDemoData(
    storeInsurancePolicies.filter((p) => p.is_active),
    TOUR_DEMO_INSURANCE_POLICIES,
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editPolicy, setEditPolicy] = React.useState<InsurancePolicy | null>(
    null,
  );
  const [filterCat, setFilterCat] = React.useState<InsuranceCategory | "all">(
    "all",
  );

  // Monthly income from store for premium-to-income ratio
  const storeIncomeRows = useFinancialStore((s) => s.incomeRows);
  const monthlyIncome = React.useMemo(
    () => storeIncomeRows.reduce((s, i) => s + i.amount, 0),
    [storeIncomeRows],
  );

  // ── Property-linked entries (source of truth is on the property) ──────────

  const propertyEntries = React.useMemo<PropertyLinkedEntry[]>(() => {
    return storeProperties
      .filter((p) => p.is_active)
      .flatMap((prop) =>
        prop.insurance.map((ins, idx) => ({
          entryId: `${prop.property_id}-ins-${idx}`,
          property: prop,
          policy: ins,
        })),
      );
  }, [storeProperties]);

  // Property summary (for insights and bottom panel)
  const propertyInsuranceSummary = React.useMemo(() => {
    const activeProps = storeProperties.filter((p) => p.is_active);
    const totalAnnual = activeProps.reduce(
      (s, p) => s + totalInsurancePremium(p),
      0,
    );
    const totalCoverage = activeProps.reduce(
      (s, p) => s + totalInsuranceCoverage(p),
      0,
    );
    const uninsured = activeProps.filter((p) => p.insurance.length === 0);
    return {
      propertyCount: activeProps.length,
      totalAnnual,
      totalMonthly: Math.round(totalAnnual / 12),
      totalCoverage,
      uninsured,
    };
  }, [storeProperties]);

  // ── Standalone summary from selector ─────────────────────────────────────

  const standaloneSummary = React.useMemo(
    () => selectInsuranceSummary(policies, monthlyIncome),
    [policies, monthlyIncome],
  );

  // ── Combined summary (standalone + property-linked) ───────────────────────

  const combinedSummary = React.useMemo(() => {
    const propMonthly = propertyEntries.reduce(
      (s, e) => s + e.policy.annual_premium / 12,
      0,
    );
    const propCoverage = propertyEntries.reduce(
      (s, e) => s + e.policy.coverage_amount,
      0,
    );
    const propExpired = propertyEntries.filter((e) =>
      isInsuranceExpired(e.policy),
    ).length;
    const propExpiringSoon = propertyEntries.filter(
      (e) => isInsuranceExpiringSoon(e.policy) && !isInsuranceExpired(e.policy),
    ).length;
    const annualIncome = monthlyIncome * 12;
    const totalMonthlyPremium =
      standaloneSummary.totalMonthlyPremium + propMonthly;
    const totalAnnualPremium = totalMonthlyPremium * 12;
    const premiumToIncomeRatioPct =
      annualIncome > 0
        ? Math.round((totalAnnualPremium / annualIncome) * 1000) / 10
        : 0;
    return {
      ...standaloneSummary,
      totalMonthlyPremium,
      totalAnnualPremium,
      totalCoverage: standaloneSummary.totalCoverage + propCoverage,
      totalPolicies: standaloneSummary.totalPolicies + propertyEntries.length,
      expiredCount: standaloneSummary.expiredCount + propExpired,
      expiringSoonCount: standaloneSummary.expiringSoonCount + propExpiringSoon,
      premiumToIncomeRatioPct,
    };
  }, [standaloneSummary, propertyEntries, monthlyIncome]);

  // ── Coverage spend breakdown by category (including property as "home") ───

  const spendByCategory = React.useMemo(() => {
    const map = new Map<InsuranceCategory, number>();
    policies.forEach((p) => {
      map.set(p.category, (map.get(p.category) ?? 0) + p.premium_monthly);
    });
    // Property insurance rolls up under "home"
    const propMonthly = propertyEntries.reduce(
      (s, e) => s + e.policy.annual_premium / 12,
      0,
    );
    if (propMonthly > 0) {
      map.set("home", (map.get("home") ?? 0) + propMonthly);
    }
    return [...map.entries()]
      .map(([cat, monthly]) => ({
        category: cat,
        label: insuranceCategoryLabel(cat),
        monthly,
        annual: monthly * 12,
        pct:
          combinedSummary.totalMonthlyPremium > 0
            ? (monthly / combinedSummary.totalMonthlyPremium) * 100
            : 0,
      }))
      .sort((a, b) => b.monthly - a.monthly);
  }, [policies, propertyEntries, combinedSummary.totalMonthlyPremium]);

  // ── Categories covered (including property as "home") ────────────────────

  const coveredCategories = React.useMemo(
    () =>
      new Set<InsuranceCategory>([
        ...policies.map((p) => p.category),
        ...(propertyEntries.length > 0
          ? (["home"] as InsuranceCategory[])
          : []),
      ]),
    [policies, propertyEntries],
  );

  // Missing recommended categories
  const missingCategories = RECOMMENDED_CATEGORIES.filter(
    (c) => !coveredCategories.has(c),
  );

  // ── Urgent standalone policies ────────────────────────────────────────────

  const urgentPolicies = React.useMemo(
    () =>
      [...policies]
        .filter((p) => getRenewalStatus(p.renewal_date).days <= 60)
        .sort(
          (a, b) =>
            getRenewalStatus(a.renewal_date).days -
            getRenewalStatus(b.renewal_date).days,
        ),
    [policies],
  );

  // ── Urgent property-linked entries ────────────────────────────────────────

  const urgentPropertyEntries = React.useMemo(
    () =>
      propertyEntries
        .filter((e) => {
          const days = Math.ceil(
            (new Date(e.policy.expiry_date).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );
          return days <= 60;
        })
        .sort((a, b) => {
          const da = Math.ceil(
            (new Date(a.policy.expiry_date).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );
          const db = Math.ceil(
            (new Date(b.policy.expiry_date).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );
          return da - db;
        }),
    [propertyEntries],
  );

  // ── Filtered policy lists ─────────────────────────────────────────────────

  const filteredPolicies = React.useMemo(() => {
    if (filterCat === "all") return policies;
    return policies.filter((p) => p.category === filterCat);
  }, [policies, filterCat]);

  const filteredPropertyEntries = React.useMemo(() => {
    if (filterCat === "all" || filterCat === "home") return propertyEntries;
    return [];
  }, [propertyEntries, filterCat]);

  // Present categories for filter pills (include "home" if property entries exist)
  const presentCategories = React.useMemo(() => {
    const cats = new Set<InsuranceCategory>(policies.map((p) => p.category));
    if (propertyEntries.length > 0) cats.add("home");
    return [...cats];
  }, [policies, propertyEntries]);

  // Insights
  const insights = React.useMemo(() => {
    const list: {
      tone: "good" | "warning" | "danger" | "info";
      title: string;
      body: string;
      icon: any;
    }[] = [];

    const expired = policies.filter(
      (p) => getRenewalStatus(p.renewal_date).tone === "expired",
    );
    if (expired.length > 0) {
      list.push({
        tone: "danger",
        icon: faCircleExclamation,
        title: `${expired.length} expired ${expired.length === 1 ? "policy" : "policies"}`,
        body: `${expired.map((p) => p.name).join(", ")} ${expired.length === 1 ? "has" : "have"} expired. Renew or replace soon.`,
      });
    }

    const noAutoRenew = policies.filter(
      (p) =>
        !p.auto_renew &&
        getRenewalStatus(p.renewal_date).days > 0 &&
        getRenewalStatus(p.renewal_date).days <= 90,
    );
    if (noAutoRenew.length > 0) {
      list.push({
        tone: "warning",
        icon: faTriangleExclamation,
        title: "Manual renewal required",
        body: `${noAutoRenew.map((p) => p.name).join(", ")} ${noAutoRenew.length === 1 ? "does" : "do"} not auto-renew and ${noAutoRenew.length === 1 ? "is" : "are"} due soon. Set a reminder.`,
      });
    }

    if (propertyInsuranceSummary.uninsured.length > 0) {
      list.push({
        tone: "danger",
        icon: faHouse,
        title: `${propertyInsuranceSummary.uninsured.length} uninsured ${propertyInsuranceSummary.uninsured.length === 1 ? "property" : "properties"}`,
        body: `${propertyInsuranceSummary.uninsured.map((p) => p.name).join(", ")} ${propertyInsuranceSummary.uninsured.length === 1 ? "has" : "have"} no insurance attached. Go to Properties to add coverage.`,
      });
    }

    if (missingCategories.length > 0) {
      list.push({
        tone: "info",
        icon: faLightbulb,
        title: "Missing coverage types",
        body: `No ${missingCategories.map((c) => insuranceCategoryLabel(c)).join(", ")} policy on file. Worth reviewing whether you need them.`,
      });
    }

    if (combinedSummary.premiumToIncomeRatioPct > 15) {
      list.push({
        tone: "warning",
        icon: faCoins,
        title: "Insurance costs a lot",
        body: `Premiums are ${combinedSummary.premiumToIncomeRatioPct.toFixed(1)}% of income. Typical range is 10-15%. Check for overlap or cover you no longer need.`,
      });
    } else if (combinedSummary.premiumToIncomeRatioPct > 0) {
      list.push({
        tone: "good",
        icon: faCircleCheck,
        title: "Insurance spend looks fine",
        body: `${combinedSummary.premiumToIncomeRatioPct.toFixed(1)}% of income on premiums, within the usual 10-15% band.`,
      });
    }

    return list.slice(0, 4);
  }, [policies, missingCategories, propertyInsuranceSummary, combinedSummary]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openCreatePolicy() {
    if (blockRecordCreate("insurance_policies")) return;
    setEditPolicy(null);
    setDialogOpen(true);
  }

  async function handleSave(p: InsurancePolicy) {
    const exists = storeInsurancePolicies.find(
      (x) => x.policy_id === p.policy_id,
    );
    if (!exists && blockRecordCreate("insurance_policies")) return;
    try {
      if (exists) {
        await updateInsurancePolicy(p);
        useFinancialStore.getState().removeInsurancePolicy(p.policy_id);
      } else {
        const created = await createInsurancePolicy(p);
        if (created?.policy_id && created.policy_id !== p.policy_id) {
          p = { ...p, policy_id: created.policy_id };
        }
      }
      useFinancialStore.getState().addInsurancePolicy(p);
      toast.success(exists ? "Policy updated." : "Policy added.");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Failed to save policy. Please try again.",
      );
    }
    setEditPolicy(null);
  }

  async function handleDeactivate(policyId: string) {
    try {
      await deleteInsurancePolicy(policyId);
      useFinancialStore.getState().removeInsurancePolicy(policyId);
      toast.success("Policy removed.");
    } catch {
      toast.error("Failed to remove policy. Please try again.");
    }
  }

  // ── KPI strip ─────────────────────────────────────────────────────────────

  const kpiItems = [
    {
      label: "Monthly premium",
      value: formatCurrency(combinedSummary.totalMonthlyPremium),
      subline: `${formatCurrency(combinedSummary.totalAnnualPremium)} per year`,
      tone: "neutral" as const,
    },
    {
      label: "Total coverage",
      value: formatCurrency(combinedSummary.totalCoverage),
      subline: `Across ${combinedSummary.totalPolicies} active ${combinedSummary.totalPolicies === 1 ? "policy" : "policies"}`,
      tone: "neutral" as const,
    },
    {
      label: "Premium to income",
      value: `${combinedSummary.premiumToIncomeRatioPct.toFixed(1)}%`,
      subline: "Target: under 15% of income",
      tone:
        combinedSummary.premiumToIncomeRatioPct <= 15
          ? ("good" as const)
          : ("warning" as const),
    },
    {
      label: "Renewals due",
      value: `${combinedSummary.expiringSoonCount + combinedSummary.expiredCount}`,
      subline:
        combinedSummary.expiredCount > 0
          ? `${combinedSummary.expiredCount} expired, ${combinedSummary.expiringSoonCount} expiring soon`
          : `${combinedSummary.expiringSoonCount} expiring within 60 days`,
      tone:
        combinedSummary.expiredCount > 0
          ? ("danger" as const)
          : combinedSummary.expiringSoonCount > 0
            ? ("warning" as const)
            : ("good" as const),
    },
  ];

  // ── Motion ────────────────────────────────────────────────────────────────

  const mc = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.04 },
    },
  };
  const mi = {
    hidden: { opacity: 0, transform: "translateY(12px)" },
    show: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const } },
  };

  if (!loading && policies.length === 0 && propertyEntries.length === 0) {
    return (
      <TooltipProvider>
        <div className={dashboardTheme.pageContainer}>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Insurance
              </h1>
              <p className="text-sm text-muted-foreground">
                Your policies, coverage, and upcoming renewals
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 self-start sm:self-auto"
              style={{ backgroundColor: PRIMARY, color: "white" }}
              data-tour="primary-action"
              onClick={openCreatePolicy}
            >
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
              Add policy
            </Button>
          </div>

          {/* Empty state card */}
          <DashboardEmptyState
            icon={
              <FontAwesomeIcon
                icon={faShield}
                className="h-8 w-8 text-muted-foreground"
              />
            }
            title="Add a policy"
            description={
              <>
                Insurance is your safety net - health, life, property, auto, and
                more. Add even one policy and you&apos;ll see total coverage,
                premiums by category, and renewal reminders so nothing lapses
                unexpectedly.
              </>
            }
            actionSlot={
              <Button
                size="sm"
                className="gap-1.5 mt-2"
                style={{ backgroundColor: PRIMARY, color: "white" }}
                onClick={openCreatePolicy}
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                Add your first policy
              </Button>
            }
          />
        </div>

        {/* Still mount the add dialog so clicks above work */}
        <PolicyDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditPolicy(null);
          }}
          onSave={handleSave}
          editPolicy={editPolicy}
        />
      </TooltipProvider>
    );
  }

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
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Insurance
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your policies, coverage, and upcoming renewals
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              style={{ backgroundColor: PRIMARY, color: "white" }}
              data-tour="primary-action"
              onClick={openCreatePolicy}
            >
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
              Add policy
            </Button>
          </motion.div>

          {/* ── KPI Strip ── */}
          <motion.div variants={mi}>
            <KpiStrip cols={4} items={kpiItems} loading={loading} />
          </motion.div>

          {/* ── Renewal alerts ── */}
          {(urgentPolicies.length > 0 || urgentPropertyEntries.length > 0) && (
            <motion.div variants={mi}>
              <SectionLabel>Renewal alerts</SectionLabel>
              <div className="space-y-2">
                {urgentPolicies.map((policy) => {
                  const r = getRenewalStatus(policy.renewal_date);
                  const isExpired = r.tone === "expired";
                  return (
                    <motion.div
                      key={policy.policy_id}
                      initial={{ opacity: 0, transform: "translateX(-8px)" }}
                      animate={{ opacity: 1, transform: "translateX(0px)" }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] as const }}
                      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
                        isExpired
                          ? "border-red-200 bg-red-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon
                          icon={
                            isExpired
                              ? faCircleExclamation
                              : faTriangleExclamation
                          }
                          className={`h-4 w-4 shrink-0 ${isExpired ? "text-red-500" : "text-amber-500"}`}
                        />
                        <div>
                          <p
                            className={`text-xs font-semibold ${isExpired ? "text-red-700" : "text-amber-700"}`}
                          >
                            {policy.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isExpired
                              ? `Expired ${new Date(policy.renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                              : `Renews ${new Date(policy.renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${policy.auto_renew ? "(auto)" : "(manual)"}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 shrink-0"
                        onClick={() => {
                          setEditPolicy(policy);
                          setDialogOpen(true);
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faRotateRight}
                          className="h-3 w-3"
                        />
                        Review
                      </Button>
                    </motion.div>
                  );
                })}
                {urgentPropertyEntries.map((entry) => {
                  const isExpired = isInsuranceExpired(entry.policy);
                  return (
                    <motion.div
                      key={entry.entryId}
                      initial={{ opacity: 0, transform: "translateX(-8px)" }}
                      animate={{ opacity: 1, transform: "translateX(0px)" }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] as const }}
                      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
                        isExpired
                          ? "border-red-200 bg-red-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon
                          icon={
                            isExpired
                              ? faCircleExclamation
                              : faTriangleExclamation
                          }
                          className={`h-4 w-4 shrink-0 ${isExpired ? "text-red-500" : "text-amber-500"}`}
                        />
                        <div>
                          <p
                            className={`text-xs font-semibold ${isExpired ? "text-red-700" : "text-amber-700"}`}
                          >
                            {entry.policy.provider} -{" "}
                            {propertyInsuranceTypeLabel(
                              entry.policy.insurance_type,
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.property.name} ·{" "}
                            {isExpired
                              ? `Expired ${new Date(entry.policy.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                              : `Expires ${new Date(entry.policy.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 shrink-0"
                        onClick={() =>
                          router.push(
                            `/dashboard/properties/${entry.property.property_id}/edit?focus=insurance`,
                          )
                        }
                      >
                        <FontAwesomeIcon
                          icon={faArrowRight}
                          className="h-3 w-3"
                        />
                        Edit in Properties
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Insights ── */}
          {insights.length > 0 && (
            <motion.div variants={mi}>
              <SectionLabel>Insights</SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((ins, i) => {
                  const cfg = {
                    good: {
                      bg: "bg-emerald-50",
                      border: "border-emerald-200",
                      text: "text-emerald-700",
                      icon: "text-emerald-500",
                    },
                    warning: {
                      bg: "bg-amber-50",
                      border: "border-amber-200",
                      text: "text-amber-700",
                      icon: "text-amber-500",
                    },
                    danger: {
                      bg: "bg-red-50",
                      border: "border-red-200",
                      text: "text-red-700",
                      icon: "text-red-500",
                    },
                    info: {
                      bg: "bg-blue-50",
                      border: "border-blue-200",
                      text: "text-blue-700",
                      icon: "text-blue-500",
                    },
                  }[ins.tone];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, transform: "translateY(8px)" }}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={{ delay: i * 0.07 }}
                      className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <FontAwesomeIcon
                          icon={ins.icon}
                          className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.icon}`}
                        />
                        <div>
                          <p className={`text-xs font-semibold ${cfg.text}`}>
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
            </motion.div>
          )}

          {/* ── Cost breakdown + Coverage checker ── */}
          <motion.div
            variants={mi}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Spend by category */}
            <div>
              <SectionLabel>Spend by category</SectionLabel>
              <Card>
                <CardContent className="pt-5 space-y-3">
                  {spendByCategory.map((row) => (
                    <div key={row.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={CATEGORY_ICONS[row.category]}
                            className="h-3 w-3"
                            style={{ color: PRIMARY }}
                          />
                          <span className="text-muted-foreground">
                            {row.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {row.pct.toFixed(0)}%
                          </span>
                          <span className="font-semibold tabular-nums w-20 text-right">
                            {formatCurrency(row.monthly)}/mo
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${row.pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: PRIMARY }}
                        />
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Total
                    </span>
                    <span className="font-bold tabular-nums">
                      {formatCurrency(combinedSummary.totalMonthlyPremium)}/mo
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coverage checklist */}
            <div>
              <SectionLabel>Coverage checklist</SectionLabel>
              <Card>
                <CardContent className="pt-5 space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Most people carry these six types. Tick what you have and spot gaps.
                  </p>
                  {RECOMMENDED_CATEGORIES.map((cat) => {
                    const covered = coveredCategories.has(cat);
                    const matchingPolicies = policies.filter(
                      (p) => p.category === cat,
                    );
                    // Property-linked entries count as "home" coverage
                    const matchingPropertyEntries =
                      cat === "home" ? propertyEntries : [];
                    const totalCount =
                      matchingPolicies.length + matchingPropertyEntries.length;
                    const totalMonthly =
                      matchingPolicies.reduce(
                        (s, p) => s + p.premium_monthly,
                        0,
                      ) +
                      matchingPropertyEntries.reduce(
                        (s, e) => s + e.policy.annual_premium / 12,
                        0,
                      );
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between text-xs py-1.5 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={covered ? faCircleCheck : faCircleExclamation}
                            className={`h-3.5 w-3.5 shrink-0 ${covered ? "text-emerald-500" : "text-muted-foreground/40"}`}
                          />
                          <div className="flex items-center gap-1.5">
                            <FontAwesomeIcon
                              icon={CATEGORY_ICONS[cat]}
                              className="h-3 w-3"
                              style={{ color: PRIMARY }}
                            />
                            <span
                              className={
                                covered
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }
                            >
                              {insuranceCategoryLabel(cat)}
                            </span>
                          </div>
                        </div>
                        {covered ? (
                          <span className="text-muted-foreground">
                            {totalCount}{" "}
                            {totalCount === 1 ? "policy" : "policies"} &middot;{" "}
                            {formatCurrency(Math.round(totalMonthly))}/mo
                          </span>
                        ) : (
                          <button
                            className="text-xs underline underline-offset-2"
                            style={{ color: PRIMARY }}
                            onClick={openCreatePolicy}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* ── Policy list ── */}
          <motion.div variants={mi}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <SectionLabel>All policies</SectionLabel>
              <div className="flex items-center gap-1 flex-wrap text-xs">
                <button
                  onClick={() => setFilterCat("all")}
                  className={`px-2.5 py-1 rounded-full border transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97] ${
                    filterCat === "all"
                      ? "text-white border-transparent"
                      : "border-muted text-muted-foreground hover:border-foreground/30"
                  }`}
                  style={
                    filterCat === "all" ? { backgroundColor: PRIMARY } : {}
                  }
                >
                  All ({combinedSummary.totalPolicies})
                </button>
                {presentCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className={`px-2.5 py-1 rounded-full border transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97] ${
                      filterCat === cat
                        ? "text-white border-transparent"
                        : "border-muted text-muted-foreground hover:border-foreground/30"
                    }`}
                    style={
                      filterCat === cat ? { backgroundColor: PRIMARY } : {}
                    }
                  >
                    {insuranceCategoryLabel(cat)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredPolicies.length === 0 &&
              filteredPropertyEntries.length === 0 ? (
              combinedSummary.totalPolicies === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                  <div className="p-4 rounded-full bg-muted">
                    <FontAwesomeIcon
                      icon={faShield}
                      className="h-8 w-8 text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      Add your policies
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add your insurance policies to track coverage and
                      renewals.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={openCreatePolicy}
                  >
                    Add policy
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center space-y-3"
                >
                  <div className="p-3 rounded-full bg-muted">
                    <FontAwesomeIcon
                      icon={faShield}
                      className="h-6 w-6 text-muted-foreground"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No policies in this category
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={openCreatePolicy}
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Add
                    one
                  </Button>
                </motion.div>
              )
            ) : (
              <div className="space-y-2">
                {filteredPolicies.map((policy) => (
                  <PolicyCard
                    key={policy.policy_id}
                    policy={policy}
                    onEdit={() => {
                      setEditPolicy(policy);
                      setDialogOpen(true);
                    }}
                    onDeactivate={() => handleDeactivate(policy.policy_id)}
                  />
                ))}
                {filteredPropertyEntries.map((entry) => (
                  <PropertyPolicyCard
                    key={entry.entryId}
                    entry={entry}
                    onGoToProperty={() =>
                      router.push(
                        `/dashboard/properties/${entry.property.property_id}/edit?focus=insurance`,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Property insurance notice ── */}
          <motion.div variants={mi}>
            <SectionLabel>Property insurance</SectionLabel>
            <Card
              className="border-dashed"
              style={{ borderColor: `${PRIMARY}30` }}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{ backgroundColor: `${PRIMARY}12` }}
                    >
                      <FontAwesomeIcon
                        icon={faHouse}
                        className="h-4 w-4"
                        style={{ color: PRIMARY }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {propertyInsuranceSummary.propertyCount}{" "}
                        {propertyInsuranceSummary.propertyCount === 1
                          ? "property"
                          : "properties"}{" "}
                        tracked
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Combined property insurance costs{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(
                            propertyInsuranceSummary.totalMonthly,
                          )}
                          /mo
                        </span>{" "}
                        across{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(
                            propertyInsuranceSummary.totalCoverage,
                          )}
                        </span>{" "}
                        in total coverage. Property insurance is managed
                        directly on each property.
                      </p>
                      {propertyInsuranceSummary.uninsured.length > 0 && (
                        <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                          <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="h-3 w-3"
                          />
                          {propertyInsuranceSummary.uninsured
                            .map((p) => p.name)
                            .join(", ")}{" "}
                          {propertyInsuranceSummary.uninsured.length === 1
                            ? "has"
                            : "have"}{" "}
                          no insurance attached.
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs shrink-0"
                    onClick={() => router.push("/dashboard/properties")}
                  >
                    Manage in Properties
                    <FontAwesomeIcon
                      icon={faArrowUpRightFromSquare}
                      className="h-3 w-3"
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Dialog ── */}
        <PolicyDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditPolicy(null);
          }}
          onSave={handleSave}
          editPolicy={editPolicy}
        />
      </motion.div>
    </TooltipProvider>
  );
}

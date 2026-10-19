"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPencil,
  faTrash,
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation,
  faChevronDown,
  faChevronUp,
  faInfoCircle,
  faUserGroup,
  faVault,
  faFilePen,
  faHeart,
  faBitcoinSign,
  faShieldHalved,
  faXmark,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";

import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { DashboardSectionLabelWide as SectionLabel } from "@/components/dashboard/section-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialStore } from "@/store/financialStore";
import type {
  WillStatus,
  WillInfo,
  Beneficiary,
  Dependent,
  DigitalAsset,
  LetterOfWishes,
  LegacyState,
} from "@/store/financialStore";
import { formatCurrency } from "@/lib/client-data";
import { DateInput } from "@/components/ui/date-input";
import { MoneyInput } from "@/components/ui/money-input";

// ─── Brand ────────────────────────────────────────────────────────────────────
const PRIMARY = "var(--brand-primary)";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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


const WILL_STATUS_CONFIG: Record<
  WillStatus,
  { label: string; tone: string; icon: any; description: string }
> = {
  none: {
    label: "No will",
    tone: "text-red-600 border-red-200 bg-red-50",
    icon: faCircleExclamation,
    description: "You don't have a will on record. This is a critical gap.",
  },
  draft: {
    label: "Draft in progress",
    tone: "text-amber-600 border-amber-200 bg-amber-50",
    icon: faTriangleExclamation,
    description: "Your will is in draft. Make sure to get it signed.",
  },
  signed: {
    label: "Signed & valid",
    tone: "text-emerald-600 border-emerald-200 bg-emerald-50",
    icon: faCircleCheck,
    description: "Your will is signed and legally valid.",
  },
  needs_update: {
    label: "Needs update",
    tone: "text-amber-600 border-amber-200 bg-amber-50",
    icon: faTriangleExclamation,
    description: "Your will exists but may be out of date.",
  },
};

const DIGITAL_ASSET_TYPE_LABELS: Record<DigitalAsset["type"], string> = {
  crypto: "Cryptocurrency",
  account: "Online Account",
  domain: "Domain / Website",
  business: "Digital Business",
  other: "Other",
};

const RELIANCE_LABELS: Record<Dependent["financialReliance"], string> = {
  full: "Fully dependent",
  partial: "Partially dependent",
  minimal: "Minimally dependent",
};

// ─── Will Dialog ──────────────────────────────────────────────────────────────

function WillDialog({
  open,
  onClose,
  will,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  will: WillInfo;
  onSave: (w: WillInfo) => void;
}) {
  const [draft, setDraft] = React.useState<WillInfo>(will);

  React.useEffect(() => {
    if (open) setDraft(will);
  }, [open, will]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Will & Estate
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Will status</Label>
            <Select
              value={draft.status}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, status: v as WillStatus }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No will</SelectItem>
                <SelectItem value="draft">Draft in progress</SelectItem>
                <SelectItem value="signed">Signed & valid</SelectItem>
                <SelectItem value="needs_update">Needs update</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Last updated{" "}
              <InfoTip content="When was your will last reviewed or updated?" />
            </Label>
            <DateInput
              value={draft.lastUpdated ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, lastUpdated: v }))}
              placeholder="Pick a date"
              toDate={new Date()}
              toYear={new Date().getFullYear()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Executor name</Label>
            <Input
              placeholder="e.g. Jane Doe"
              value={draft.executorName ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, executorName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Storage location
              <InfoTip content="Where is the original document kept? e.g. solicitor's office, safe at home." />
            </Label>
            <Input
              placeholder="e.g. Solicitor's office, home safe"
              value={draft.storageLocation ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, storageLocation: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Any reminders or context..."
              value={draft.notes ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            style={{ backgroundColor: PRIMARY, color: "white" }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Beneficiary Dialog ───────────────────────────────────────────────────────

function BeneficiaryDialog({
  open,
  onClose,
  existing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Beneficiary | null;
  onSave: (b: Beneficiary) => void;
}) {
  const defaultDraft: Beneficiary = {
    id: uid(),
    name: "",
    relationship: "",
    allocationPct: 0,
    linkedAssets: [],
    contactInfo: "",
  };
  const [draft, setDraft] = React.useState<Beneficiary>(defaultDraft);

  React.useEffect(() => {
    if (open) setDraft(existing ?? { ...defaultDraft, id: uid() });
  }, [open, existing]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FontAwesomeIcon
              icon={faUserGroup}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            {existing ? "Edit beneficiary" : "Add beneficiary"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full name</Label>
              <Input
                placeholder="e.g. Ama Mensah"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Relationship</Label>
              <Input
                placeholder="e.g. Spouse, Child"
                value={draft.relationship}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, relationship: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Allocation %{" "}
              <InfoTip content="What percentage of your estate do they receive?" />
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={draft.allocationPct || ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    allocationPct: Number(e.target.value),
                  }))
                }
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Contact information</Label>
            <Input
              placeholder="Email or phone number"
              value={draft.contactInfo ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, contactInfo: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!draft.name.trim()}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            style={{ backgroundColor: PRIMARY, color: "white" }}
          >
            {existing ? "Save changes" : "Add beneficiary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dependent Dialog ─────────────────────────────────────────────────────────

function DependentDialog({
  open,
  onClose,
  existing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Dependent | null;
  onSave: (d: Dependent) => void;
}) {
  const defaultDraft: Dependent = {
    id: uid(),
    name: "",
    relationship: "",
    financialReliance: "full",
    notes: "",
  };
  const [draft, setDraft] = React.useState<Dependent>(defaultDraft);

  React.useEffect(() => {
    if (open) setDraft(existing ?? { ...defaultDraft, id: uid() });
  }, [open, existing]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FontAwesomeIcon
              icon={faHeart}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            {existing ? "Edit dependent" : "Add dependent"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full name</Label>
              <Input
                placeholder="e.g. Kofi Mensah"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Relationship</Label>
              <Input
                placeholder="e.g. Child, Parent"
                value={draft.relationship}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, relationship: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date of birth</Label>
            <DateInput
              value={draft.dateOfBirth ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, dateOfBirth: v }))}
              placeholder="Pick date of birth"
              toDate={new Date()}
              toYear={new Date().getFullYear()}
              fromYear={1900}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Financial reliance
              <InfoTip content="How much does this person depend on you financially?" />
            </Label>
            <Select
              value={draft.financialReliance}
              onValueChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  financialReliance: v as Dependent["financialReliance"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Fully dependent</SelectItem>
                <SelectItem value="partial">Partially dependent</SelectItem>
                <SelectItem value="minimal">Minimally dependent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Any context about their situation..."
              value={draft.notes ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!draft.name.trim()}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            style={{ backgroundColor: PRIMARY, color: "white" }}
          >
            {existing ? "Save changes" : "Add dependent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Digital Asset Dialog ─────────────────────────────────────────────────────

function DigitalAssetDialog({
  open,
  onClose,
  existing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existing?: DigitalAsset | null;
  onSave: (a: DigitalAsset) => void;
}) {
  const defaultDraft: DigitalAsset = {
    id: uid(),
    name: "",
    type: "crypto",
    value: 0,
    accessInstructions: "",
    custodian: "",
  };
  const [draft, setDraft] = React.useState<DigitalAsset>(defaultDraft);

  React.useEffect(() => {
    if (open) setDraft(existing ?? { ...defaultDraft, id: uid() });
  }, [open, existing]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FontAwesomeIcon
              icon={faVault}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            {existing ? "Edit digital asset" : "Add digital asset"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Name</Label>
              <Input
                placeholder="e.g. Bitcoin wallet"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type</Label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, type: v as DigitalAsset["type"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="account">Online Account</SelectItem>
                  <SelectItem value="domain">Domain / Website</SelectItem>
                  <SelectItem value="business">Digital Business</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Estimated value</Label>
            <MoneyInput
              value={draft.value ? String(draft.value) : ""}
              onChange={(v) =>
                setDraft((d) => ({ ...d, value: Number(v) || 0 }))
              }
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Custodian / Platform
              <InfoTip content="Where is this asset held? e.g. Coinbase, Binance, GoDaddy" />
            </Label>
            <Input
              placeholder="e.g. Coinbase"
              value={draft.custodian ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, custodian: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Access instructions
              <InfoTip content="How would your family access this? Do not store actual passwords here - reference a password manager or sealed envelope." />
            </Label>
            <Textarea
              rows={2}
              placeholder="e.g. Seed phrase stored in sealed envelope in home safe. Password in 1Password vault under 'Crypto'."
              value={draft.accessInstructions ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, accessInstructions: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!draft.name.trim()}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            style={{ backgroundColor: PRIMARY, color: "white" }}
          >
            {existing ? "Save changes" : "Add asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Letter of Wishes Dialog ──────────────────────────────────────────────────

function LetterDialog({
  open,
  onClose,
  letter,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  letter: LetterOfWishes;
  onSave: (l: LetterOfWishes) => void;
}) {
  const [draft, setDraft] = React.useState<LetterOfWishes>(letter);

  React.useEffect(() => {
    if (open) setDraft(letter);
  }, [open, letter]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FontAwesomeIcon
              icon={faFilePen}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            Letter of wishes
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            A letter of wishes is a personal, non-binding message to your
            family. It can cover funeral preferences, sentimental wishes,
            guidance for children, or anything you want them to know. It sits
            alongside your will but is not legally binding.
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Last updated</Label>
            <DateInput
              value={draft.lastUpdated ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, lastUpdated: v }))}
              placeholder="Pick a date"
              toDate={new Date()}
              toYear={new Date().getFullYear()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Your message</Label>
            <Textarea
              rows={8}
              placeholder="Write a personal message to your family here. This is private and stored securely..."
              value={draft.content ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, content: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            style={{ backgroundColor: PRIMARY, color: "white" }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LegacyPage() {
  const store = useFinancialStore();
  const accountMode = store.user?.account_mode ?? "solo";
  const isSolo = accountMode === "solo";

  const legacy = useFinancialStore((s) => s.legacy);
  const {
    setWill,
    addBeneficiary,
    updateBeneficiary,
    removeBeneficiary,
    addDependent,
    updateDependent,
    removeDependent,
    addDigitalAsset,
    updateDigitalAsset,
    removeDigitalAsset,
    setLetterOfWishes,
  } = useFinancialStore();

  // Dialogs
  const [willOpen, setWillOpen] = React.useState(false);
  const [beneficiaryOpen, setBeneficiaryOpen] = React.useState(false);
  const [editBeneficiary, setEditBeneficiary] =
    React.useState<Beneficiary | null>(null);
  const [dependentOpen, setDependentOpen] = React.useState(false);
  const [editDependent, setEditDependent] = React.useState<Dependent | null>(
    null,
  );
  const [digitalOpen, setDigitalOpen] = React.useState(false);
  const [editDigital, setEditDigital] = React.useState<DigitalAsset | null>(
    null,
  );
  const [letterOpen, setLetterOpen] = React.useState(false);

  // Computed
  const totalAllocation = legacy.beneficiaries.reduce(
    (s, b) => s + b.allocationPct,
    0,
  );
  const allocationWarning =
    totalAllocation !== 100 && legacy.beneficiaries.length > 0;
  const willConfig = WILL_STATUS_CONFIG[legacy.will.status];
  const totalDigitalValue = legacy.digitalAssets.reduce(
    (s, a) => s + (a.value ?? 0),
    0,
  );
  const fullyDependents = legacy.dependents.filter(
    (d) => d.financialReliance === "full",
  ).length;

  // Insights
  const insights = React.useMemo(() => {
    const list: {
      tone: "good" | "warning" | "danger" | "info";
      title: string;
      body: string;
      icon: any;
    }[] = [];

    if (legacy.will.status === "none") {
      list.push({
        tone: "danger",
        icon: faCircleExclamation,
        title: "No will on record",
        body: "Without a will, your estate will be distributed according to local intestacy laws - which may not reflect your wishes. This is the most urgent legacy planning step.",
      });
    } else if (legacy.will.status === "needs_update") {
      list.push({
        tone: "warning",
        icon: faTriangleExclamation,
        title: "Your will may need updating",
        body: "Major life events like marriage, children, or significant asset changes should trigger a will review. Consider scheduling a review with a solicitor.",
      });
    } else if (legacy.will.status === "signed") {
      list.push({
        tone: "good",
        icon: faCircleCheck,
        title: "Will is signed and valid",
        body: "Your will is in order. Remember to review it after major life events and ensure your executor knows where it is stored.",
      });
    }

    if (allocationWarning) {
      list.push({
        tone: "warning",
        icon: faTriangleExclamation,
        title: `Beneficiary allocations add up to ${totalAllocation}%`,
        body: `Your allocations should total 100%. Currently they total ${totalAllocation}%. Adjust your beneficiary percentages to ensure your full estate is accounted for.`,
      });
    }

    if (
      fullyDependents > 0 &&
      store.insurancePolicies.filter(
        (p) => p.category === "life" && p.is_active,
      ).length === 0
    ) {
      list.push({
        tone: "danger",
        icon: faShieldHalved,
        title: "No life insurance for your dependents",
        body: `You have ${fullyDependents} fully dependent ${fullyDependents === 1 ? "person" : "people"} but no active life insurance policy. This leaves them financially exposed if something happens to you.`,
      });
    }

    if (legacy.digitalAssets.length === 0) {
      list.push({
        tone: "info",
        icon: faLightbulb,
        title: "Consider documenting digital assets",
        body: "Cryptocurrency, online businesses, and digital accounts can be lost forever if your family doesn't know they exist or how to access them.",
      });
    }

    if (!legacy.letterOfWishes.content) {
      list.push({
        tone: "info",
        icon: faFilePen,
        title: "Write a letter of wishes",
        body: "A letter of wishes lets you leave personal guidance for your family - funeral preferences, messages to loved ones, or instructions that don't belong in a legal document.",
      });
    }

    return list.slice(0, 4);
  }, [
    legacy,
    allocationWarning,
    totalAllocation,
    fullyDependents,
    store.insurancePolicies,
  ]);

  // KPI strip
  const kpiItems = [
    {
      label: "Will status",
      value: willConfig.label,
      subline: legacy.will.executorName
        ? `Executor: ${legacy.will.executorName}`
        : "No executor set",
      tone:
        legacy.will.status === "signed"
          ? ("good" as const)
          : legacy.will.status === "none"
            ? ("danger" as const)
            : ("warning" as const),
    },
    {
      label: "Beneficiaries",
      value: `${legacy.beneficiaries.length}`,
      subline:
        totalAllocation > 0 ? `${totalAllocation}% allocated` : "None added",
      tone: allocationWarning
        ? ("warning" as const)
        : legacy.beneficiaries.length > 0
          ? ("good" as const)
          : ("neutral" as const),
    },
    {
      label: "Dependents",
      value: `${legacy.dependents.length}`,
      subline:
        fullyDependents > 0
          ? `${fullyDependents} fully dependent`
          : "None added",
      tone:
        legacy.dependents.length > 0
          ? ("neutral" as const)
          : ("neutral" as const),
    },
    {
      label: "Digital assets",
      value:
        totalDigitalValue > 0
          ? formatCurrency(totalDigitalValue)
          : `${legacy.digitalAssets.length} items`,
      subline:
        legacy.digitalAssets.length > 0
          ? `${legacy.digitalAssets.length} documented`
          : "None documented",
      tone:
        legacy.digitalAssets.length > 0
          ? ("good" as const)
          : ("neutral" as const),
    },
  ];

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
                  Legacy
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isSolo
                    ? "Plan what happens to your estate and protect the people you care about."
                    : "Plan what happens to your household's estate and protect the people you care about."}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── KPI Strip ── */}
          <motion.div variants={mi}>
            <KpiStrip cols={4} items={kpiItems} />
          </motion.div>

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

          {/* ── Will & Estate ── */}
          <motion.div variants={mi}>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Will & estate</SectionLabel>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setWillOpen(true)}
              >
                <FontAwesomeIcon icon={faPencil} className="h-3 w-3" />
                {legacy.will.status === "none" ? "Add will details" : "Edit"}
              </Button>
            </div>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 shrink-0 ${willConfig.tone}`}
                  >
                    <FontAwesomeIcon
                      icon={willConfig.icon}
                      className="h-4 w-4"
                    />
                    <span className="text-xs font-semibold">
                      {willConfig.label}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {willConfig.description}
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      {legacy.will.executorName && (
                        <>
                          <span className="text-muted-foreground">
                            Executor
                          </span>
                          <span className="font-medium">
                            {legacy.will.executorName}
                          </span>
                        </>
                      )}
                      {legacy.will.lastUpdated && (
                        <>
                          <span className="text-muted-foreground">
                            Last updated
                          </span>
                          <span className="font-medium">
                            {new Date(
                              legacy.will.lastUpdated,
                            ).toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </>
                      )}
                      {legacy.will.storageLocation && (
                        <>
                          <span className="text-muted-foreground">
                            Stored at
                          </span>
                          <span className="font-medium">
                            {legacy.will.storageLocation}
                          </span>
                        </>
                      )}
                    </div>
                    {legacy.will.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1">
                        {legacy.will.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Beneficiaries ── */}
          <motion.div variants={mi}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SectionLabel>Beneficiaries</SectionLabel>
                {allocationWarning && (
                  <Badge
                    variant="outline"
                    className="text-xs py-0 text-amber-600 border-amber-200 bg-amber-50 mb-3"
                  >
                    {totalAllocation}% allocated
                  </Badge>
                )}
                {!allocationWarning && totalAllocation === 100 && (
                  <Badge
                    variant="outline"
                    className="text-xs py-0 text-emerald-600 border-emerald-200 bg-emerald-50 mb-3"
                  >
                    100% allocated
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setEditBeneficiary(null);
                  setBeneficiaryOpen(true);
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                Add beneficiary
              </Button>
            </div>

            {legacy.beneficiaries.length === 0 ? (
              <DashboardEmptyState
                size="sm"
                icon={
                  <FontAwesomeIcon
                    icon={faUserGroup}
                    className="h-6 w-6 text-muted-foreground"
                  />
                }
                title="No beneficiaries added"
                description={
                  <>
                    Beneficiaries are the people who inherit your estate. Add
                    them now so allocations, contact info, and instructions are
                    documented in one place - your family won’t have to guess in
                    a difficult moment.
                  </>
                }
                action={{
                  label: "Add beneficiary",
                  onClick: () => {
                    setEditBeneficiary(null);
                    setBeneficiaryOpen(true);
                  },
                }}
              />
            ) : (
              <div className="space-y-2">
                {legacy.beneficiaries.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between border rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <FontAwesomeIcon
                          icon={faUserGroup}
                          className="h-3.5 w-3.5 text-muted-foreground"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.relationship}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {b.allocationPct}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          of estate
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditBeneficiary(b);
                            setBeneficiaryOpen(true);
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faPencil}
                            className="h-3 w-3"
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeBeneficiary(b.id)}
                        >
                          <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Dependents ── */}
          <motion.div variants={mi}>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Dependents</SectionLabel>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setEditDependent(null);
                  setDependentOpen(true);
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                Add dependent
              </Button>
            </div>

            {legacy.dependents.length === 0 ? (
              <DashboardEmptyState
                size="sm"
                icon={
                  <FontAwesomeIcon
                    icon={faHeart}
                    className="h-6 w-6 text-muted-foreground"
                  />
                }
                title="No dependents added"
                description={
                  <>
                    Dependents are the people who rely on you financially -
                    children, partners, parents, or anyone you support. Listing
                    them helps us right-size your insurance needs and estate
                    plan so no one is left vulnerable.
                  </>
                }
                action={{
                  label: "Add dependent",
                  onClick: () => {
                    setEditDependent(null);
                    setDependentOpen(true);
                  },
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {legacy.dependents.map((d) => (
                  <div
                    key={d.id}
                    className="border rounded-lg px-4 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.relationship}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditDependent(d);
                            setDependentOpen(true);
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faPencil}
                            className="h-3 w-3"
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeDependent(d.id)}
                        >
                          <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs py-0 ${
                        d.financialReliance === "full"
                          ? "text-red-600 border-red-200 bg-red-50"
                          : d.financialReliance === "partial"
                            ? "text-amber-600 border-amber-200 bg-amber-50"
                            : "text-emerald-600 border-emerald-200 bg-emerald-50"
                      }`}
                    >
                      {RELIANCE_LABELS[d.financialReliance]}
                    </Badge>
                    {d.notes && (
                      <p className="text-xs text-muted-foreground">{d.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Digital Assets ── */}
          <motion.div variants={mi}>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Digital assets</SectionLabel>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setEditDigital(null);
                  setDigitalOpen(true);
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                Add digital asset
              </Button>
            </div>

            {legacy.digitalAssets.length === 0 ? (
              <DashboardEmptyState
                size="sm"
                icon={
                  <FontAwesomeIcon
                    icon={faVault}
                    className="h-6 w-6 text-muted-foreground"
                  />
                }
                title="No digital assets documented"
                description={
                  <>
                    Crypto wallets, online businesses, domain names, and digital
                    subscriptions can be lost forever without documentation. Add
                    them here so your executor can access or transfer them when
                    needed.
                  </>
                }
                action={{
                  label: "Add digital asset",
                  onClick: () => {
                    setEditDigital(null);
                    setDigitalOpen(true);
                  },
                }}
              />
            ) : (
              <div className="space-y-2">
                {legacy.digitalAssets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <FontAwesomeIcon
                          icon={a.type === "crypto" ? faBitcoinSign : faVault}
                          className="h-3.5 w-3.5 text-muted-foreground"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DIGITAL_ASSET_TYPE_LABELS[a.type]}
                          {a.custodian ? ` · ${a.custodian}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {a.value && a.value > 0 && (
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(a.value)}
                        </p>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditDigital(a);
                            setDigitalOpen(true);
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faPencil}
                            className="h-3 w-3"
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeDigitalAsset(a.id)}
                        >
                          <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Letter of Wishes ── */}
          <motion.div variants={mi}>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Letter of wishes</SectionLabel>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setLetterOpen(true)}
              >
                <FontAwesomeIcon icon={faPencil} className="h-3 w-3" />
                {legacy.letterOfWishes.content ? "Edit" : "Write letter"}
              </Button>
            </div>
            <Card
              className={!legacy.letterOfWishes.content ? "border-dashed" : ""}
            >
              <CardContent className="pt-5">
                {legacy.letterOfWishes.content ? (
                  <div className="space-y-2">
                    {legacy.letterOfWishes.lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        Last updated{" "}
                        {new Date(
                          legacy.letterOfWishes.lastUpdated,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-4">
                      "{legacy.letterOfWishes.content}"
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5 px-0"
                      onClick={() => setLetterOpen(true)}
                    >
                      Read and edit full letter →
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <FontAwesomeIcon
                      icon={faFilePen}
                      className="h-6 w-6 text-muted-foreground"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        Write a letter of wishes
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        A letter of wishes lets you leave personal guidance for
                        your family - things that don't belong in a legal
                        document but matter deeply.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLetterOpen(true)}
                    >
                      Write your letter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Dialogs ── */}
        <WillDialog
          open={willOpen}
          onClose={() => setWillOpen(false)}
          will={legacy.will}
          onSave={(w) => setWill(w)}
        />
        <BeneficiaryDialog
          open={beneficiaryOpen}
          onClose={() => {
            setBeneficiaryOpen(false);
            setEditBeneficiary(null);
          }}
          existing={editBeneficiary}
          onSave={(b) =>
            editBeneficiary ? updateBeneficiary(b) : addBeneficiary(b)
          }
        />
        <DependentDialog
          open={dependentOpen}
          onClose={() => {
            setDependentOpen(false);
            setEditDependent(null);
          }}
          existing={editDependent}
          onSave={(d) => (editDependent ? updateDependent(d) : addDependent(d))}
        />
        <DigitalAssetDialog
          open={digitalOpen}
          onClose={() => {
            setDigitalOpen(false);
            setEditDigital(null);
          }}
          existing={editDigital}
          onSave={(a) =>
            editDigital ? updateDigitalAsset(a) : addDigitalAsset(a)
          }
        />
        <LetterDialog
          open={letterOpen}
          onClose={() => setLetterOpen(false)}
          letter={legacy.letterOfWishes}
          onSave={(letter) => setLetterOfWishes(letter)}
        />
      </motion.div>
    </TooltipProvider>
  );
}

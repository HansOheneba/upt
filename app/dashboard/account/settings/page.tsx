"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getUserFullName, type User } from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { useClientGate } from "@/hooks/useClientGate";
import { usePageData } from "@/hooks/usePageData";
import {
  updateUser,
  submitRiskAssessment,
  updateRiskProfileFactors,
  deleteAccount,
  getRiskBand,
} from "@/lib/dashboard-api";
import { resetSession } from "@/lib/session-reset";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save,
  UserIcon,
  Globe,
  ShieldCheck,
  Building2,
  ClipboardList,
  XIcon,
  CreditCard,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import {
  currencies as allCurrencies,
  getSymbolFromCurrency,
} from "country-data-list";
import csc from "countries-states-cities";
import RiskAttitudeQuiz from "@/components/dashboard/risk/quiz";
import { RiskResultScreen } from "@/components/dashboard/risk/quizCard";
import { type RiskAssessmentResult } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

// ─── CSC country list ────────────────────────────────────────────────────────
const CSC_COUNTRIES = (
  csc.getAllCountries() as Array<{
    id: number;
    name: string;
    iso2: string;
    emoji: string;
    phone_code: string;
  }>
).sort((a, b) => a.name.localeCompare(b.name));

const currencyOptions = allCurrencies.all
  .filter((c) => c.code && c.name)
  .sort((a, b) => a.code.localeCompare(b.code));

const contactMethods = ["email", "phone", "whatsapp"];
const contactMethodLabels: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
};

const maritalStatusOptions = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

type OptionScore = 1 | 2 | 3 | 4 | 5;
type RiskBand =
  | "Capital Preservation"
  | "Conservative"
  | "Balanced"
  | "Growth"
  | "Aggressive";

/** Map quiz band → API risk_profile value */
function bandToApiValue(band: RiskBand): string {
  const map: Record<RiskBand, string> = {
    "Capital Preservation": "conservative",
    Conservative: "conservative",
    Balanced: "moderate",
    Growth: "aggressive",
    Aggressive: "aggressive",
  };
  return map[band];
}

function riskBandLabel(val?: string | null): string {
  const map: Record<string, string> = {
    conservative: "Conservative",
    moderate: "Moderate Growth",
    aggressive: "Aggressive Growth",
    "Capital Preservation": "Capital Preservation",
    Conservative: "Conservative",
    Balanced: "Balanced",
    Growth: "Growth",
    Aggressive: "Aggressive",
  };
  return val ? (map[val] ?? val) : "Not assessed yet";
}

function accountModeLabel(mode?: string) {
  if (mode === "partner") return "Partner Account";
  if (mode === "family") return "Family Account";
  return "Individual Account";
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { loading } = usePageData("profile");
  const storeUser = useFinancialStore((s) => s.user);
  const setUser = useFinancialStore((s) => s.setUser);
  const { sub, ready: subReady } = useClientGate();

  const [saving, setSaving] = useState(false);
  const [riskFactorDeps, setRiskFactorDeps] = useState<number | "">(0);
  const [savingRiskFactors, setSavingRiskFactors] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizEverOpened, setQuizEverOpened] = useState(false);
  const [quizConfirmOpen, setQuizConfirmOpen] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<RiskAssessmentResult | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    if (quizOpen) {
      setQuizEverOpened(true);
      setQuizResult(null);
    }
  }, [quizOpen]);

  const baseUser: User = storeUser ?? {
    user_id: "",
    email: "",
    resident_country: "",
    currency: "USD",
    is_active: true,
    created_at: "",
    updated_at: "",
    user_type: "regular",
  };

  useEffect(() => {
    if (storeUser?.dependents != null) {
      setRiskFactorDeps(storeUser.dependents);
    }
  }, [storeUser?.dependents]);

  const [form, setForm] = useState<User & { citizenships: string[] }>({
    ...baseUser,
    citizenships: baseUser.citizenships ?? [],
    resident_state: baseUser.resident_state ?? "",
    city: baseUser.city ?? "",
    preferred_contact: baseUser.preferred_contact ?? "email",
  });

  const mode = form.account_mode ?? "solo";
  const isSolo = mode === "solo";
  const isEnterprise = form.user_type === "enterprise";

  // ─── CSC-derived state and city lists ───────────────────────────────────────
  const selectedCscCountry = useMemo(
    () => CSC_COUNTRIES.find((c) => c.name === form.resident_country) ?? null,
    [form.resident_country],
  );

  const stateList = useMemo(
    () =>
      selectedCscCountry
        ? (
            csc.getStatesOfCountry(selectedCscCountry.id) as Array<{
              id: number;
              name: string;
              country_id: number;
              country_code: string;
              state_code: string;
            }>
          ).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [selectedCscCountry],
  );

  const selectedCscState = useMemo(
    () => stateList.find((s) => s.name === form.resident_state) ?? null,
    [stateList, form.resident_state],
  );

  const cityList = useMemo(
    () =>
      selectedCscState
        ? (
            csc.getCitiesOfState(selectedCscState.id) as Array<{
              id: number;
              name: string;
              state_id: number;
              state_code: string;
              country_id: number;
              country_code: string;
            }>
          ).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [selectedCscState],
  );

  const statesAvailable = stateList.length > 0;
  const citiesAvailable = cityList.length > 0;

  function handleChange(field: keyof User | "citizenships", value: unknown) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Clear dependent location fields when country changes
      if (field === "resident_country") {
        next.resident_state = "";
        next.city = "";
      }
      // Clear city when state changes
      if (field === "resident_state") {
        next.city = "";
      }
      return next;
    });
  }

  function handleCitizenshipAdd(country: string) {
    if (!form.citizenships.includes(country)) {
      setForm((prev) => ({
        ...prev,
        citizenships: [...prev.citizenships, country],
      }));
    }
  }

  function handleCitizenshipRemove(country: string) {
    setForm((prev) => ({
      ...prev,
      citizenships: prev.citizenships.filter((c) => c !== country),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name,
        last_name: form.last_name,
        display_name: form.display_name,
        phone_number: form.phone_number,
        resident_country: form.resident_country,
        resident_state: form.resident_state,
        city: form.city,
        citizenships: form.citizenships.join(", "),
        date_of_birth: form.date_of_birth,
        currency: form.currency,
        preferred_contact: form.preferred_contact,
        occupation: form.occupation,
        marital_status: form.marital_status,
        account_mode: form.account_mode,
        dependents: form.dependents,
        bio: form.bio,
      };
      Object.keys(payload).forEach(
        (k) => payload[k] == null && delete payload[k],
      );
      const updated = await updateUser(payload);
      if (updated) {
        setUser({ ...form, updated_at: new Date().toISOString() });
        toast.success("Profile saved.");
      } else {
        toast.error("Failed to save. Please try again.");
      }
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuizSave(result: {
    score: number;
    band: RiskBand;
    answers: Record<number, OptionScore>;
    responses: Record<string, number>;
  }) {
    setQuizSubmitting(true);
    try {
      const submitted = await submitRiskAssessment({
        questionnaire_version: "1.0",
        responses: result.responses,
      });
      if (submitted) {
        const riskProfile = getRiskBand(submitted);
        if (riskProfile) {
          useFinancialStore.getState().setRiskAssessment(submitted);
          setForm((f) => ({
            ...f,
            risk_profile: riskProfile as User["risk_profile"],
          }));
        }
        setQuizResult(submitted);
      } else {
        toast.error("Failed to save risk profile. Please try again.");
      }
    } catch {
      toast.error("Failed to save risk profile. Please try again.");
    } finally {
      setQuizSubmitting(false);
    }
  }

  async function handleRiskFactorsSave() {
    if (riskFactorDeps === "") return;
    setSavingRiskFactors(true);
    try {
      await updateRiskProfileFactors({ dependents: riskFactorDeps });
      setUser({
        ...useFinancialStore.getState().user!,
        dependents: riskFactorDeps,
      });
      toast.success("Risk factors updated.");
    } catch {
      toast.error("Failed to update risk factors. Please try again.");
    } finally {
      setSavingRiskFactors(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const ok = await deleteAccount();
      if (ok) {
        resetSession();
        router.replace("/");
      } else {
        toast.error("Failed to delete account. Please try again.");
      }
    } catch {
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  const initials = getUserFullName(form)
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header - always visible */}
      <div>
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal details and platform preferences.
        </p>
      </div>

      {/* Profile summary */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-[var(--brand-primary)] text-white">
              {loading ? "…" : initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-lg">
                    {getUserFullName(form)}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {accountModeLabel(mode)}
                  </Badge>
                  {isEnterprise && (
                    <Badge className="text-xs bg-[var(--brand-primary)] text-white gap-1">
                      <Building2 className="h-3 w-3" />
                      Enterprise
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{form.email}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            {isSolo ? "Personal Information" : "Household Information"}
          </CardTitle>
          <CardDescription>
            {isSolo
              ? "Update your personal information."
              : "Update your household details."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {/* Display name - works for all account modes */}
              <div className="space-y-2">
                <Label>{isSolo ? "Full Name" : "Household Name"}</Label>
                <Input
                  value={form.display_name ?? ""}
                  onChange={(e) => handleChange("display_name", e.target.value)}
                />
              </div>

              {/* First / last name - solo only */}
              {isSolo && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={form.first_name ?? ""}
                      onChange={(e) =>
                        handleChange("first_name", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={form.last_name ?? ""}
                      onChange={(e) =>
                        handleChange("last_name", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    value={form.phone_number ?? ""}
                    onChange={(e) =>
                      handleChange("phone_number", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Date of Birth - solo only */}
              {isSolo && (
                <div className="space-y-2 w-fit">
                  <Label>Date of Birth</Label>
                  <DateInput
                    value={form.date_of_birth ?? ""}
                    onChange={(v) => handleChange("date_of_birth", v)}
                    toDate={new Date()}
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                  />
                </div>
              )}

              {/* Occupation + Marital Status - solo only */}
              {isSolo && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Occupation</Label>
                    <Input
                      value={form.occupation ?? ""}
                      onChange={(e) =>
                        handleChange("occupation", e.target.value)
                      }
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Marital Status</Label>
                    <Select
                      value={form.marital_status ?? ""}
                      onValueChange={(v) => handleChange("marital_status", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {maritalStatusOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Prefix + Gender - solo only */}
              {isSolo && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prefix</Label>
                    <Select
                      value={form.prefix ?? ""}
                      onValueChange={(v) => handleChange("prefix", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select prefix" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Mr", "Mrs", "Ms", "Dr", "Prof", "Rev"].map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={form.gender ?? ""}
                      onValueChange={(v) => handleChange("gender", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { value: "M", label: "Male" },
                          { value: "F", label: "Female" },
                          { value: "O", label: "Non-binary / Other" },
                          { value: "X", label: "Prefer not to say" },
                        ].map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Dependents - all account types */}
              <div className="space-y-2 w-fit">
                <Label>Number of Dependents</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.dependents ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "dependents",
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                  className="w-32"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label>{isSolo ? "Bio" : "Household Description"}</Label>
                <Textarea
                  value={form.bio ?? ""}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  placeholder={
                    isSolo
                      ? "A short description about yourself…"
                      : "A short description about your household…"
                  }
                  rows={3}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Residency & Citizenship */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Residency &amp; Citizenship
          </CardTitle>
          <CardDescription>
            Provide information related to your residency and nationality.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Country */}
                <div className="space-y-2">
                  <Label>Country of Residence</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className={cn(
                          "w-full justify-between font-normal h-10",
                          !form.resident_country && "text-muted-foreground",
                        )}
                      >
                        {form.resident_country
                          ? (() => {
                              const m = CSC_COUNTRIES.find(
                                (c) => c.name === form.resident_country,
                              );
                              return m
                                ? `${m.emoji} ${m.name}`
                                : form.resident_country;
                            })()
                          : "Select country"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {CSC_COUNTRIES.map((c) => (
                              <CommandItem
                                key={c.iso2}
                                value={c.name}
                                onSelect={(val) => {
                                  handleChange("resident_country", val);
                                  setCountryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.resident_country === c.name
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {c.emoji} {c.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* State / Region */}
                {statesAvailable && (
                  <div className="space-y-2">
                    <Label>State / Region</Label>
                    <Popover open={stateOpen} onOpenChange={setStateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={stateOpen}
                          className={cn(
                            "w-full justify-between font-normal h-10",
                            !form.resident_state && "text-muted-foreground",
                          )}
                        >
                          {form.resident_state || "Select state / region"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search state..." />
                          <CommandList>
                            <CommandEmpty>No state found.</CommandEmpty>
                            <CommandGroup>
                              {stateList.map((s) => (
                                <CommandItem
                                  key={s.id}
                                  value={s.name}
                                  onSelect={(val) => {
                                    handleChange("resident_state", val);
                                    setStateOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.resident_state === s.name
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {s.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label>City</Label>
                {citiesAvailable ? (
                  <Popover open={cityOpen} onOpenChange={setCityOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={cityOpen}
                        className={cn(
                          "w-full justify-between font-normal h-10",
                          !form.city && "text-muted-foreground",
                        )}
                      >
                        {form.city || "Select city"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search city..." />
                        <CommandList>
                          <CommandEmpty>No city found.</CommandEmpty>
                          <CommandGroup>
                            {cityList.map((city) => (
                              <CommandItem
                                key={city.id}
                                value={city.name}
                                onSelect={(val) => {
                                  handleChange("city", val);
                                  setCityOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.city === city.name
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {city.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    value={form.city ?? ""}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Enter city name"
                  />
                )}
              </div>

              {/* Citizenship - solo only (partner/family share a household) */}
              {isSolo && (
                <div className="space-y-2">
                  <Label>Citizenship</Label>
                  <Select onValueChange={(v) => handleCitizenshipAdd(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add citizenship" />
                    </SelectTrigger>
                    <SelectContent>
                      {CSC_COUNTRIES.map((c) => (
                        <SelectItem key={c.iso2} value={c.name}>
                          {c.emoji} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.citizenships.map((country) => (
                      <span
                        key={country}
                        className="px-3 py-1 text-xs bg-muted rounded-full cursor-pointer hover:bg-muted/70"
                        onClick={() => handleCitizenshipRemove(country)}
                      >
                        {country} &times;
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Financial Profile - risk is read-only, requires quiz to update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Risk Profile
          </CardTitle>
          <CardDescription>
            Your risk tolerance is determined by the risk assessment
            questionnaire. To change it, retake the quiz.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-9 w-36" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Current risk profile
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {form.risk_profile
                      ? riskBandLabel(form.risk_profile)
                      : "Not assessed yet"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setQuizOpen(true)}
                >
                  <ClipboardList className="h-4 w-4" />
                  {form.risk_profile ? "Retake quiz" : "Take quiz"}
                </Button>
              </div>

              {/* Dependents - feeds risk.profile-factors */}
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label>Number of Dependents</Label>
                  <p className="text-xs text-muted-foreground">
                    Used to personalise your risk profile calculation.
                  </p>
                  <Input
                    type="number"
                    min={0}
                    value={riskFactorDeps}
                    onChange={(e) =>
                      setRiskFactorDeps(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-32"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRiskFactorsSave}
                  disabled={savingRiskFactors || riskFactorDeps === ""}
                >
                  {savingRiskFactors ? "Saving..." : "Save"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Manage your platform preferences.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Preferred Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => handleChange("currency", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {getSymbolFromCurrency(c.code) !== c.code
                          ? `${getSymbolFromCurrency(c.code)} `
                          : ""}
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Contact Method</Label>
                <Select
                  value={form.preferred_contact ?? "email"}
                  onValueChange={(v) => handleChange("preferred_contact", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {contactMethodLabels[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Account - read-only, enterprise users only */}
      {isEnterprise && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Enterprise Account
            </CardTitle>
            <CardDescription>
              Your access is sponsored by your company. These details are
              managed by your organisation and cannot be edited here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm font-medium">
                  {form.enterprise_info?.company_name ?? "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Company ID</p>
                <p className="text-sm font-medium font-mono">
                  {form.enterprise_info?.company_id ?? "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Seat Granted</p>
                <p className="text-sm font-medium">
                  {form.enterprise_info?.seat_granted_at
                    ? new Date(
                        form.enterprise_info.seat_granted_at,
                      ).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Provisioned By</p>
                <p className="text-sm font-medium">
                  {form.enterprise_info?.seat_granted_by ?? "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-white">
        <div className="border-b border-red-200 px-6 py-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
        </div>
        <div className="px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setDeleteConfirmText("");
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Account confirmation dialog */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteOpen(false);
            setDeleteConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This will permanently delete your account and all your data -
                goals, assets, cash flow records, and everything else. There is
                no way to recover this.
              </span>
              <span className="block mt-3 font-medium text-foreground">
                To confirm, type{" "}
                <span className="font-mono bg-muted px-1 rounded">
                  delete my account
                </span>{" "}
                below.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <Input
              placeholder="delete my account"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="border-red-200 focus-visible:ring-red-400"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              disabled={deleteConfirmText !== "delete my account" || deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
            >
              {deleting ? "Deleting..." : "Permanently delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Risk quiz - right-side sheet */}
      <DialogPrimitive.Root
        open={quizOpen}
        onOpenChange={(v) => {
          if (v) setQuizEverOpened(true);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            forceMount
            onClick={() => {
              if (!quizResult) setQuizConfirmOpen(true);
            }}
            className={[
              "fixed inset-0 z-50 bg-black/50",
              quizOpen
                ? "animate-fade animate-duration-200"
                : quizEverOpened
                  ? "animate-fade animate-reverse animate-duration-150 animate-fill-forwards pointer-events-none"
                  : "hidden",
            ].join(" ")}
          />
          <DialogPrimitive.Content
            forceMount
            aria-describedby={undefined}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              if (!quizResult) setQuizConfirmOpen(true);
            }}
            className={[
              "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden border-l bg-background shadow-lg outline-none sm:max-w-lg",
              quizOpen
                ? "animate-fade-left animate-duration-300 animate-ease-out"
                : quizEverOpened
                  ? "animate-fade-left animate-reverse animate-duration-150 animate-ease-out animate-fill-forwards pointer-events-none"
                  : "hidden",
            ].join(" ")}
          >
            <DialogPrimitive.Title className="sr-only">
              Risk Assessment
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Answer honestly - there are no right or wrong answers.
            </DialogPrimitive.Description>
            {!quizResult && (
              <button
                type="button"
                onClick={() => setQuizConfirmOpen(true)}
                className="absolute right-4 top-4 z-10 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
            <div className="flex-1 overflow-auto">
              {quizResult ? (
                <RiskResultScreen
                  result={quizResult}
                  onDone={() => {
                    setQuizOpen(false);
                    setQuizResult(null);
                  }}
                />
              ) : quizSubmitting ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Analysing your responses...
                  </p>
                </div>
              ) : (
                <RiskAttitudeQuiz onSave={handleQuizSave} />
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Confirm exit */}
      <AlertDialog open={quizConfirmOpen} onOpenChange={setQuizConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit the quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress won&apos;t be saved. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setQuizConfirmOpen(false);
                setQuizOpen(false);
              }}
            >
              Exit quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

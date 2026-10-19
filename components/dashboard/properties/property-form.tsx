"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronsUpDown, Home, Lightbulb } from "lucide-react";
import csc from "countries-states-cities";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
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
import {
  type Property,
  type PropertyType,
  type PropertyCondition,
  type PropertyOccupancy,
  type PropertyInsurance,
  type PropertyMortgage,
  type PropertyDetailField,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_CONDITION_OPTIONS,
  PROPERTY_OCCUPANCY_OPTIONS,
  formatCurrency,
  formatPropertySpecs,
  buildPropertyFieldSources,
  toPropertyWriteBody,
  getInvestmentCurrency,
} from "@/lib/client-data";
import {
  getPropertyAreaField,
  resolvePropertyCatalogCountry,
} from "@/lib/clients/property-areas";
import { useFinancialStore } from "@/store/financialStore";
import { blockRecordCreate } from "@/lib/record-limits";
import {
  createProperty,
  updateProperty as apiUpdateProperty,
} from "@/lib/dashboard-api";
import { clearPageCache } from "@/hooks/usePageData";
import { InsuranceSection } from "./insurance-section";
import { MortgageSection } from "./mortgage-section";
import { DateInput } from "@/components/ui/date-input";

type CscCountry = {
  id: number;
  name: string;
  iso2: string;
};

type CscState = {
  id: number;
  name: string;
};

type CscCity = {
  id: number;
  name: string;
};

const PROPERTY_COUNTRIES = (csc.getAllCountries() as CscCountry[]).sort((a, b) =>
  a.name.localeCompare(b.name),
);

/** Property form country labels that are not the CSC country name. */
const PROPERTY_COUNTRY_ISO: Record<string, string> = {
  USA: "US",
  UK: "GB",
  UAE: "AE",
  Canada: "CA",
  Australia: "AU",
  Ghana: "GH",
  Nigeria: "NG",
  "South Africa": "ZA",
  Singapore: "SG",
  Germany: "DE",
  France: "FR",
  Netherlands: "NL",
  Switzerland: "CH",
  Japan: "JP",
};

function cscCountryForProperty(country: string): CscCountry | null {
  const trimmed = country.trim();
  if (!trimmed || trimmed.toLowerCase() === "other") return null;
  const countries = PROPERTY_COUNTRIES;
  const iso =
    PROPERTY_COUNTRY_ISO[trimmed] ??
    PROPERTY_COUNTRY_ISO[resolvePropertyCatalogCountry(trimmed) ?? ""];
  if (iso) return countries.find((c) => c.iso2 === iso) ?? null;
  const name = (resolvePropertyCatalogCountry(trimmed) ?? trimmed).toLowerCase();
  return countries.find((c) => c.name.toLowerCase() === name) ?? null;
}

function statesForPropertyCountry(country: string): CscState[] {
  const cscCountry = cscCountryForProperty(country);
  if (!cscCountry) return [];
  return (csc.getStatesOfCountry(cscCountry.id) as CscState[]).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function citiesForPropertyRegion(country: string, region: string): CscCity[] {
  const state = statesForPropertyCountry(country).find((s) => s.name === region);
  if (!state) return [];
  return (csc.getCitiesOfState(state.id) as CscCity[]).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Region that contains this city, when only one region does. */
function regionForPropertyCity(country: string, city: string): string {
  const key = city.trim().toLowerCase();
  if (!key) return "";
  const hits: string[] = [];
  for (const state of statesForPropertyCountry(country)) {
    const cities = csc.getCitiesOfState(state.id) as CscCity[];
    if (cities.some((c) => c.name.toLowerCase() === key)) hits.push(state.name);
  }
  return hits.length === 1 ? hits[0] : "";
}

// ── Form state ──────────────────────────────────────────────────
export type PropertyFormValues = {
  name: string;
  propertyType: PropertyType;
  country: string;
  region: string;
  city: string;
  locality: string;
  address: string;
  landArea: string;
  buildingArea: string;
  bedrooms: string;
  bathrooms: string;
  floors: string;
  yearBuilt: string;
  condition: PropertyCondition | "";
  occupancy: PropertyOccupancy | "";
  purchaseDate: string;
  purchasePrice: string;
  marketValue: string;
  valueUncertain: boolean;
  mortgageBalance: string;
  isPrimary: boolean;
  insurance: PropertyInsurance[];
  mortgage: PropertyMortgage | null;
};

export type PropertyFormProps = {
  editingProperty?: Property;
  title?: string;
  subtitle?: string;
  /** When "insurance", auto-scroll to the insurance section on mount. */
  focusSection?: string;
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

function optionalPositive(value: string): number | undefined {
  const trimmed = value.replace(/,/g, "").trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function optionalWhole(value: string): number | undefined {
  const n = optionalPositive(value);
  if (n == null || !Number.isInteger(n)) return undefined;
  return n;
}

function optionalYear(value: string): number | undefined {
  if (!/^\d{4}$/.test(value.trim())) return undefined;
  const n = Number(value);
  const max = new Date().getFullYear();
  if (n < 1000 || n > max) return undefined;
  return n;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function decimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("")}`;
}

function numToField(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "";
  return String(value);
}

function asPropertyType(value: string | undefined): PropertyType {
  const match = PROPERTY_TYPE_OPTIONS.find((o) => o.value === value);
  return match?.value ?? "house";
}

function asCondition(value: string | undefined): PropertyCondition | "" {
  return PROPERTY_CONDITION_OPTIONS.some((o) => o.value === value)
    ? (value as PropertyCondition)
    : "";
}

function asOccupancy(value: string | undefined): PropertyOccupancy | "" {
  return PROPERTY_OCCUPANCY_OPTIONS.some((o) => o.value === value)
    ? (value as PropertyOccupancy)
    : "";
}

/**
 * Which detail fields apply to a type.
 * Land has no building. Apartment and condo are units, not a plot.
 * Commercial is a building, not a home. Other keeps every field.
 */
function fieldsForPropertyType(type: PropertyType) {
  const land = type === "land";
  const unit = type === "apartment" || type === "condo";
  const commercial = type === "commercial";
  return {
    landArea: !unit,
    buildingArea: !land,
    bedrooms: !land && !commercial,
    bathrooms: !land && !commercial,
    floors: !land,
    yearBuilt: !land,
    primaryResidence: !land && !commercial,
  };
}

const EMPTY_DETAILS = {
  locality: "",
  address: "",
  landArea: "",
  buildingArea: "",
  bedrooms: "",
  bathrooms: "",
  floors: "",
  yearBuilt: "",
  condition: "" as const,
  occupancy: "" as const,
};

// ── Component ───────────────────────────────────────────────────
export function PropertyForm({
  editingProperty,
  title,
  subtitle,
  focusSection,
}: PropertyFormProps) {
  const router = useRouter();
  const isEditing = !!editingProperty;
  const investmentCurrency = getInvestmentCurrency(
    useFinancialStore((s) => s.user),
  );

  const insuranceSectionRef = React.useRef<HTMLDivElement>(null);
  const mortgageSectionRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to insurance section when navigated with ?focus=insurance
  React.useEffect(() => {
    if (focusSection === "insurance" && insuranceSectionRef.current) {
      const timer = setTimeout(() => {
        insuranceSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 350);
      return () => clearTimeout(timer);
    }
    if (focusSection === "mortgage" && mortgageSectionRef.current) {
      const timer = setTimeout(() => {
        mortgageSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [focusSection]);

  const [form, setForm] = React.useState<PropertyFormValues>(() => {
    if (editingProperty) {
      return {
        name: editingProperty.name,
        propertyType: asPropertyType(editingProperty.property_type),
        country: editingProperty.country,
        region: regionForPropertyCity(
          editingProperty.country,
          editingProperty.city,
        ),
        city: editingProperty.city,
        locality: editingProperty.locality ?? "",
        address: editingProperty.address ?? "",
        landArea: numToField(editingProperty.land_area_m2),
        buildingArea: numToField(editingProperty.building_area_m2),
        bedrooms: numToField(editingProperty.bedrooms),
        bathrooms: numToField(editingProperty.bathrooms),
        floors: numToField(editingProperty.floors),
        yearBuilt: numToField(editingProperty.year_built),
        condition: asCondition(editingProperty.condition),
        occupancy: asOccupancy(editingProperty.occupancy),
        purchaseDate: editingProperty.purchase_date,
        purchasePrice: editingProperty.purchase_price
          ? formatNumberWithCommas(editingProperty.purchase_price.toString())
          : "",
        marketValue: formatNumberWithCommas(
          editingProperty.market_value.toString(),
        ),
        valueUncertain: editingProperty.value_uncertain ?? false,
        mortgageBalance: formatNumberWithCommas(
          editingProperty.mortgage_balance.toString(),
        ),
        isPrimary: editingProperty.is_primary,
        insurance: editingProperty.insurance ?? [],
        mortgage: editingProperty.mortgage ?? null,
      };
    }
    return {
      name: "",
      propertyType: "house",
      country: "",
      region: "",
      city: "",
      ...EMPTY_DETAILS,
      purchaseDate: "",
      purchasePrice: "",
      marketValue: "",
      valueUncertain: false,
      mortgageBalance: "",
      isPrimary: false,
      insurance: [],
      mortgage: null,
    };
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [countryOpen, setCountryOpen] = React.useState(false);
  const [regionOpen, setRegionOpen] = React.useState(false);
  const [cityOpen, setCityOpen] = React.useState(false);

  // ── Updater ─────────────────────────────────────────────────
  function update<K extends keyof PropertyFormValues>(
    key: K,
    value: PropertyFormValues[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function localityFor(country: string, city: string, locality: string): string {
    const area = getPropertyAreaField(country, city);
    if (area.mode === "list" && locality && !area.areas.includes(locality)) {
      return "";
    }
    return locality;
  }

  function applyCountry(country: string): void {
    setForm((prev) => ({
      ...prev,
      country,
      region: "",
      city: "",
      locality: localityFor(country, "", prev.locality),
    }));
  }

  function applyRegion(region: string): void {
    setForm((prev) => {
      const city = citiesForPropertyRegion(prev.country, region).some(
        (c) => c.name === prev.city,
      )
        ? prev.city
        : "";
      return {
        ...prev,
        region,
        city,
        locality: localityFor(prev.country, city, prev.locality),
      };
    });
  }

  function applyCity(city: string): void {
    setForm((prev) => ({
      ...prev,
      city,
      locality: localityFor(prev.country, city, prev.locality),
    }));
  }

  function renderCityField() {
    const waitingForCountry = !form.country;
    const waitingForRegion =
      statesAvailable && !form.region && !form.city.trim();
    const useList = citiesAvailable && !waitingForCountry && !waitingForRegion;

    return (
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        {useList ? (
          <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button
                id="city"
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={cityOpen}
                className={cn(
                  "h-9 w-full justify-between font-normal",
                  !form.city && "text-muted-foreground",
                )}
              >
                {form.city || "Select city"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-(--radix-popover-trigger-width) p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Search city..." />
                <CommandList>
                  <CommandEmpty>No city found.</CommandEmpty>
                  <CommandGroup>
                    {cityList.map((city) => (
                      <CommandItem
                        key={city.id}
                        value={city.name}
                        onSelect={() => {
                          applyCity(city.name);
                          setCityOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.city === city.name ? "opacity-100" : "opacity-0",
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
        ) : waitingForCountry || waitingForRegion ? (
          <Button
            id="city"
            type="button"
            variant="outline"
            disabled
            className="h-9 w-full justify-between font-normal text-muted-foreground"
          >
            {waitingForCountry ? "Select a country first" : "Select a region first"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        ) : (
          <Input
            id="city"
            placeholder={
              statesAvailable ? "Enter city name" : "e.g. New York, Sydney, Accra"
            }
            value={form.city}
            onChange={(e) => applyCity(e.target.value)}
            required
          />
        )}
      </div>
    );
  }

  function handleMoneyInput(
    key: "purchasePrice" | "marketValue",
    value: string,
  ): void {
    update(key, formatNumberWithCommas(value));
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const purchasePriceNum = toNumber(form.purchasePrice);
  const marketValueNum = toNumber(form.marketValue);
  const mortgageNum = toNumber(form.mortgageBalance);
  const equity = marketValueNum - mortgageNum;
  const lvr =
    marketValueNum > 0 ? Math.round((mortgageNum / marketValueNum) * 100) : 0;

  // ── Contextual insight ──────────────────────────────────────
  type Insight = { tone: "info" | "good" | "warn"; message: string };

  const insight: Insight = React.useMemo(() => {
    if (!form.name.trim() || marketValueNum <= 0) {
      return {
        tone: "info",
        message:
          "Fill in the details to see how this property fits your portfolio.",
      };
    }
    if (lvr > 80) {
      return {
        tone: "warn",
        message: `LVR is ${lvr}%. You may be paying lenders mortgage insurance. More equity would help.`,
      };
    }
    if (lvr > 60) {
      return {
        tone: "info",
        message: `LVR is ${lvr}%. Equity is ${formatCurrency(equity, investmentCurrency)}. Refinancing might get you a better rate.`,
      };
    }
    if (mortgageNum === 0 && marketValueNum > 0) {
      return {
        tone: "good",
        message: `Paid off. ${formatCurrency(marketValueNum, investmentCurrency)} in equity.`,
      };
    }
    return {
      tone: "good",
      message: `LVR ${lvr}%. Equity ${formatCurrency(equity, investmentCurrency)}.`,
    };
  }, [form.name, marketValueNum, mortgageNum, lvr, equity, investmentCurrency]);

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
  const isValid =
    form.name.trim().length > 0 &&
    form.country.length > 0 &&
    form.city.trim().length > 0 &&
    (form.valueUncertain || marketValueNum > 0) &&
    form.purchaseDate.length > 0;

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    if (!isEditing && blockRecordCreate("properties")) return;
    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const locality = form.locality.trim();
      const address = form.address.trim();
      const fields = fieldsForPropertyType(form.propertyType);
      const landArea = fields.landArea
        ? optionalPositive(form.landArea)
        : undefined;
      const buildingArea = fields.buildingArea
        ? optionalPositive(form.buildingArea)
        : undefined;
      const bedrooms = fields.bedrooms ? optionalWhole(form.bedrooms) : undefined;
      const bathrooms = fields.bathrooms
        ? optionalWhole(form.bathrooms)
        : undefined;
      const floors = fields.floors ? optionalWhole(form.floors) : undefined;
      const yearBuilt = fields.yearBuilt
        ? optionalYear(form.yearBuilt)
        : undefined;
      const condition = form.condition || undefined;
      let occupancy = form.occupancy || undefined;
      let isPrimary = fields.primaryResidence && form.isPrimary;
      if (occupancy === "rented" || occupancy === "vacant") isPrimary = false;
      if (isPrimary && !occupancy) occupancy = "owner_occupied";
      const statedValue =
        !form.valueUncertain && marketValueNum > 0 ? marketValueNum : undefined;
      const detailValues: Partial<Record<PropertyDetailField, string | number>> =
        {
          locality: locality || undefined,
          address: address || undefined,
          land_area_m2: landArea,
          building_area_m2: buildingArea,
          bedrooms,
          bathrooms,
          floors,
          year_built: yearBuilt,
          condition,
          occupancy,
        };

      let property: Property = {
        property_id: editingProperty?.property_id ?? `p-${Date.now()}`,
        user_id: editingProperty?.user_id ?? "u-1",
        name: form.name.trim(),
        property_type: form.propertyType,
        country: form.country,
        city: form.city.trim(),
        locality: locality || undefined,
        address: address || undefined,
        land_area_m2: landArea,
        building_area_m2: buildingArea,
        bedrooms,
        bathrooms,
        floors,
        year_built: yearBuilt,
        condition,
        occupancy,
        purchase_date: form.purchaseDate,
        purchase_price: purchasePriceNum > 0 ? purchasePriceNum : null,
        market_value: statedValue ?? 0,
        current_value: statedValue,
        value_uncertain: form.valueUncertain,
        mortgage_balance: form.mortgage ? form.mortgage.balance : mortgageNum,
        is_primary: isPrimary,
        is_active: editingProperty?.is_active ?? true,
        field_sources: buildPropertyFieldSources(
          detailValues,
          editingProperty,
        ),
        insurance: form.insurance,
        mortgage: form.mortgage
          ? { ...form.mortgage, type: "repayment" }
          : undefined,
        valuations: editingProperty?.valuations,
        published_valuation_id: editingProperty?.published_valuation_id,
        created_at: editingProperty?.created_at ?? now,
        updated_at: now,
      };

      const apiPayload = toPropertyWriteBody(property, {
        includeId: Boolean(editingProperty),
      });
      const saved = editingProperty
        ? await apiUpdateProperty({
            ...apiPayload,
            property_id: property.property_id,
          })
        : await createProperty(apiPayload);
      if (saved?.property_id) {
        property = saved;
      }
      if (editingProperty) {
        useFinancialStore.getState().updateProperty(property);
      } else {
        useFinancialStore.getState().addProperty(property);
      }

      // Invalidate TTL caches for pages that derive data from properties
      // (insurance and liabilities show property-linked entries). This forces
      // a fresh API fetch the next time those pages are visited.
      clearPageCache("properties", "insurance");

      router.push("/dashboard/properties");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Could not save this property.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const areaField = getPropertyAreaField(form.country, form.city);
  const areaChoices =
    areaField.mode === "list"
      ? form.locality && !areaField.areas.includes(form.locality)
        ? [form.locality, ...areaField.areas]
        : areaField.areas
      : [];
  const stateList = statesForPropertyCountry(form.country);
  const statesAvailable = stateList.length > 0;
  const cityList = citiesForPropertyRegion(form.country, form.region);
  const citiesAvailable = cityList.length > 0;
  const countryNames = PROPERTY_COUNTRIES.map((country) => country.name);
  const countryChoices =
    form.country && !countryNames.includes(form.country)
      ? [form.country, ...countryNames]
      : countryNames;
  const fields = fieldsForPropertyType(form.propertyType);
  const specLine = formatPropertySpecs({
    bedrooms: fields.bedrooms ? optionalWhole(form.bedrooms) : undefined,
    bathrooms: fields.bathrooms ? optionalWhole(form.bathrooms) : undefined,
    floors: fields.floors ? optionalWhole(form.floors) : undefined,
    building_area_m2: fields.buildingArea
      ? optionalPositive(form.buildingArea)
      : undefined,
    land_area_m2: fields.landArea ? optionalPositive(form.landArea) : undefined,
    year_built: fields.yearBuilt ? optionalYear(form.yearBuilt) : undefined,
    condition: form.condition || undefined,
    occupancy: form.occupancy || undefined,
  });

  // ── Render ──────────────────────────────────────────────────
  const formTitle = title ?? (isEditing ? "Edit property" : "Add a property");
  const formSubtitle =
    subtitle ??
    (isEditing
      ? `Update the details for ${editingProperty!.name}.`
      : "Track a new real estate holding.");

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
              <CardTitle className="text-base">Property Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tell us about the property; we&apos;ll help you track it.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Property name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Primary Residence, Rental Unit, Beach House"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
              </div>

              <Separator />

              {/* Type + Primary toggle */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="property-type">Property type</Label>
                  <Select
                    value={form.propertyType}
                    onValueChange={(v) => {
                      const next = v as PropertyType;
                      const nextFields = fieldsForPropertyType(next);
                      setForm((prev) => ({
                        ...prev,
                        propertyType: next,
                        isPrimary: nextFields.primaryResidence
                          ? prev.isPrimary
                          : false,
                      }));
                    }}
                  >
                    <SelectTrigger id="property-type" className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fields.primaryResidence ? (
                  <div className="space-y-2">
                    <Label>Primary residence</Label>
                    <div className="flex items-center gap-3 pt-2">
                      <Switch
                        checked={form.isPrimary}
                        onCheckedChange={(checked) => {
                          setForm((prev) => ({
                            ...prev,
                            isPrimary: checked,
                            occupancy: checked
                              ? "owner_occupied"
                              : prev.occupancy,
                          }));
                        }}
                      />
                      <span className="text-sm">
                        {form.isPrimary ? "Yes" : "No"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your main home. A rented or vacant property cannot be
                      the primary residence.
                    </p>
                  </div>
                ) : null}
              </div>

              <Separator />

              {/* Location */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="country"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className={cn(
                          "h-9 w-full justify-between font-normal",
                          !form.country && "text-muted-foreground",
                        )}
                      >
                        {form.country || "Select country"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-(--radix-popover-trigger-width) p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {countryChoices.map((country) => (
                              <CommandItem
                                key={country}
                                value={country}
                                onSelect={() => {
                                  applyCountry(country);
                                  setCountryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.country === country
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {country}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {statesAvailable ? (
                  <div className="space-y-2">
                    <Label htmlFor="region">State / Region</Label>
                    <Popover open={regionOpen} onOpenChange={setRegionOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="region"
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={regionOpen}
                          className={cn(
                            "h-9 w-full justify-between font-normal",
                            !form.region && "text-muted-foreground",
                          )}
                        >
                          {form.region || "Select state / region"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-(--radix-popover-trigger-width) p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Search state..." />
                          <CommandList>
                            <CommandEmpty>No state found.</CommandEmpty>
                            <CommandGroup>
                              {stateList.map((state) => (
                                <CommandItem
                                  key={state.id}
                                  value={state.name}
                                  onSelect={() => {
                                    applyRegion(state.name);
                                    setRegionOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.region === state.name
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {state.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  renderCityField()
                )}
              </div>

              {statesAvailable ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {renderCityField()}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="address">Street address</Label>
                <Input
                  id="address"
                  placeholder="64 Castle Road, London SW3 6NP"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Include the postcode for UK properties. That is what the
                  valuation uses.
                </p>
              </div>

              {areaField.mode === "list" && (
                <div className="space-y-2">
                  <Label htmlFor="locality">Area</Label>
                  <Select
                    value={form.locality || undefined}
                    onValueChange={(v) =>
                      update("locality", v === "__clear__" ? "" : v)
                    }
                  >
                    <SelectTrigger id="locality" className="w-full">
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {form.locality && (
                        <SelectItem value="__clear__">No area</SelectItem>
                      )}
                      {areaChoices.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {areaField.cityMatched
                      ? `Areas in ${form.city.trim()}. Stored as the area name only.`
                      : form.city.trim()
                        ? "This city is not in the list, so every area in the country is shown."
                        : "Select a city to narrow the list. Stored as the area name only."}
                  </p>
                </div>
              )}

              {areaField.mode === "free" && (
                <div className="space-y-2">
                  <Label htmlFor="locality">Area</Label>
                  <Input
                    id="locality"
                    placeholder="Neighbourhood or district"
                    value={form.locality}
                    onChange={(e) => update("locality", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Type the area name only, for example Chelsea, not Chelsea,
                    London.
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">
                    {form.propertyType === "land"
                      ? "Land"
                      : form.propertyType === "commercial"
                        ? "Size"
                        : form.propertyType === "apartment" ||
                            form.propertyType === "condo"
                          ? "Unit size"
                          : "Size and layout"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {form.propertyType === "land"
                      ? "Land area and condition. Your advisor uses these when valuing the plot. Leave a field blank if you do not know it."
                      : form.propertyType === "commercial"
                        ? "Floor area, floors, and condition. Leave a field blank if you do not know it."
                        : form.propertyType === "apartment" ||
                            form.propertyType === "condo"
                          ? "Rooms and floor area of the unit. Leave a field blank if you do not know it."
                          : "Rooms, floor area, and condition. Your advisor uses these when valuing the property. Leave a field blank if you do not know it."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {fields.landArea ? (
                  <div className="space-y-2">
                    <Label htmlFor="land-area">Land area (m²)</Label>
                    <Input
                      id="land-area"
                      inputMode="decimal"
                      placeholder="962"
                      value={form.landArea}
                      onChange={(e) =>
                        update("landArea", decimalInput(e.target.value))
                      }
                      onBlur={() => {
                        if (optionalPositive(form.landArea) == null) {
                          update("landArea", "");
                        }
                      }}
                    />
                  </div>
                  ) : null}
                  {fields.buildingArea ? (
                    <div className="space-y-2">
                      <Label htmlFor="building-area">Building area (m²)</Label>
                      <Input
                        id="building-area"
                        inputMode="decimal"
                        placeholder="502"
                        value={form.buildingArea}
                        onChange={(e) =>
                          update("buildingArea", decimalInput(e.target.value))
                        }
                        onBlur={() => {
                          if (optionalPositive(form.buildingArea) == null) {
                            update("buildingArea", "");
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                {fields.bedrooms ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        inputMode="numeric"
                        placeholder="5"
                        value={form.bedrooms}
                        onChange={(e) =>
                          update("bedrooms", digitsOnly(e.target.value))
                        }
                        onBlur={() => {
                          if (optionalWhole(form.bedrooms) == null) {
                            update("bedrooms", "");
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        inputMode="numeric"
                        placeholder="3"
                        value={form.bathrooms}
                        onChange={(e) =>
                          update("bathrooms", digitsOnly(e.target.value))
                        }
                        onBlur={() => {
                          if (optionalWhole(form.bathrooms) == null) {
                            update("bathrooms", "");
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="floors">Floors</Label>
                      <Input
                        id="floors"
                        inputMode="numeric"
                        placeholder="2"
                        value={form.floors}
                        onChange={(e) =>
                          update("floors", digitsOnly(e.target.value))
                        }
                        onBlur={() => {
                          if (optionalWhole(form.floors) == null) {
                            update("floors", "");
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <div
                  className={
                    fields.yearBuilt && fields.bedrooms
                      ? "grid grid-cols-1 gap-4 md:grid-cols-3"
                      : "grid grid-cols-1 gap-4 md:grid-cols-2"
                  }
                >
                  {fields.floors && !fields.bedrooms ? (
                    <div className="space-y-2">
                      <Label htmlFor="floors">Floors</Label>
                      <Input
                        id="floors"
                        inputMode="numeric"
                        placeholder="2"
                        value={form.floors}
                        onChange={(e) =>
                          update("floors", digitsOnly(e.target.value))
                        }
                        onBlur={() => {
                          if (optionalWhole(form.floors) == null) {
                            update("floors", "");
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  {fields.yearBuilt ? (
                    <div className="space-y-2">
                      <Label htmlFor="year-built">Year built</Label>
                      <Input
                        id="year-built"
                        inputMode="numeric"
                        placeholder="1998"
                        maxLength={4}
                        value={form.yearBuilt}
                        onChange={(e) =>
                          update(
                            "yearBuilt",
                            digitsOnly(e.target.value).slice(0, 4),
                          )
                        }
                        onBlur={() => {
                          if (optionalYear(form.yearBuilt) == null) {
                            update("yearBuilt", "");
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={form.condition || undefined}
                      onValueChange={(v) =>
                        update(
                          "condition",
                          v === "__clear__" ? "" : (v as PropertyCondition),
                        )
                      }
                    >
                      <SelectTrigger id="condition" className="w-full">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {form.condition && (
                          <SelectItem value="__clear__">Not set</SelectItem>
                        )}
                        {PROPERTY_CONDITION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupancy">Occupancy</Label>
                    <Select
                      value={form.occupancy || undefined}
                      onValueChange={(v) => {
                        const occupancy =
                          v === "__clear__" ? "" : (v as PropertyOccupancy);
                        setForm((prev) => ({
                          ...prev,
                          occupancy,
                          isPrimary:
                            occupancy === "rented" || occupancy === "vacant"
                              ? false
                              : prev.isPrimary,
                        }));
                      }}
                    >
                      <SelectTrigger id="occupancy" className="w-full">
                        <SelectValue placeholder="Select occupancy" />
                      </SelectTrigger>
                      <SelectContent>
                        {form.occupancy && (
                          <SelectItem value="__clear__">Not set</SelectItem>
                        )}
                        {PROPERTY_OCCUPANCY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financials */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchase-price">Purchase price</Label>
                  <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                    <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                      {investmentCurrency}
                    </span>
                    <input
                      id="purchase-price"
                      type="text"
                      inputMode="numeric"
                      placeholder="600,000"
                      value={form.purchasePrice}
                      onChange={(e) =>
                        handleMoneyInput("purchasePrice", e.target.value)
                      }
                      className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    What you originally paid for this property.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="market-value">
                    Current market value
                    {form.valueUncertain && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (valuation pending)
                      </span>
                    )}
                  </Label>
                  <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                    <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                      {investmentCurrency}
                    </span>
                    <input
                      id="market-value"
                      type="text"
                      inputMode="numeric"
                      placeholder="850,000"
                      value={form.marketValue}
                      onChange={(e) =>
                        handleMoneyInput("marketValue", e.target.value)
                      }
                      disabled={form.valueUncertain}
                      className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      id="value-uncertain"
                      checked={form.valueUncertain}
                      onCheckedChange={(checked) => {
                        update("valueUncertain", checked);
                        if (checked) update("marketValue", "");
                      }}
                    />
                    <Label
                      htmlFor="value-uncertain"
                      className="text-xs font-normal text-muted-foreground cursor-pointer"
                    >
                      I&apos;m not sure of the current value
                    </Label>
                  </div>
                </div>
              </div>

              {/* Equity / LVR preview */}
              {marketValueNum > 0 && (
                <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>
                      Equity:{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(equity, investmentCurrency)}
                      </span>
                    </span>
                    <span>
                      LVR:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          lvr > 80
                            ? "text-rose-600 dark:text-rose-400"
                            : lvr > 60
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-foreground",
                        )}
                      >
                        {lvr}%
                      </span>
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Mortgage */}
              <div
                ref={mortgageSectionRef}
                id="mortgage-section"
                className="scroll-mt-6"
              >
                <MortgageSection
                  mortgage={form.mortgage}
                  currency={investmentCurrency}
                  onChange={(mortgage) => {
                    update("mortgage", mortgage);
                    // Keep the simple mortgageBalance field in sync
                    if (mortgage) {
                      update(
                        "mortgageBalance",
                        formatNumberWithCommas(String(mortgage.balance)),
                      );
                    }
                  }}
                />
              </div>

              <Separator />

              {/* Insurance */}
              <div
                ref={insuranceSectionRef}
                id="insurance-section"
                className="scroll-mt-6"
              >
                <InsuranceSection
                  policies={form.insurance}
                  currency={investmentCurrency}
                  suggestedType={
                    form.occupancy === "rented" ? "landlord" : "homeowners"
                  }
                  onChange={(policies) => update("insurance", policies)}
                />
              </div>

              <Separator />

              {/* Purchase date */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchase-date">Purchase date</Label>
                  <DateInput
                    id="purchase-date"
                    value={form.purchaseDate}
                    onChange={(v) => update("purchaseDate", v)}
                    placeholder="Pick purchase date"
                    toDate={new Date()}
                    toYear={new Date().getFullYear()}
                  />
                  <p className="text-xs text-muted-foreground">
                    When you purchased or settled on this property.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/dashboard/properties")}
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
                    ? "Saving\u2026"
                    : isEditing
                      ? "Save changes"
                      : "Add property"}
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
                    value={form.name.trim() || "\u2014"}
                    truncate
                  />
                  <SummaryRow
                    label="Type"
                    value={
                      PROPERTY_TYPE_OPTIONS.find(
                        (o) => o.value === form.propertyType,
                      )?.label ?? "\u2014"
                    }
                  />
                  <SummaryRow
                    label="Location"
                    value={
                      [form.locality.trim(), form.city.trim(), form.country]
                        .filter(Boolean)
                        .join(", ") || "-"
                    }
                  />
                  {specLine ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {specLine}
                    </p>
                  ) : null}

                  <Separator />

                  <SummaryRow
                    label="Market Value"
                    value={
                      marketValueNum > 0
                        ? formatCurrency(marketValueNum, investmentCurrency)
                        : "—"
                    }
                  />
                  <SummaryRow
                    label="Mortgage"
                    value={
                      mortgageNum > 0
                        ? formatCurrency(mortgageNum, investmentCurrency)
                        : marketValueNum > 0
                          ? "Paid off"
                          : "—"
                    }
                  />
                  <SummaryRow
                    label="Equity"
                    value={
                      marketValueNum > 0
                        ? formatCurrency(equity, investmentCurrency)
                        : "—"
                    }
                  />
                  <SummaryRow
                    label="LVR"
                    value={marketValueNum > 0 ? `${lvr}%` : "\u2014"}
                  />

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {!fields.primaryResidence
                        ? PROPERTY_TYPE_OPTIONS.find(
                            (o) => o.value === form.propertyType,
                          )?.label ?? "Property"
                        : form.isPrimary
                          ? "Primary residence"
                          : "Investment property"}
                    </span>
                  </div>

                  <SummaryRow
                    label="Purchased"
                    value={form.purchaseDate || "\u2014"}
                  />

                  {form.insurance.length > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Insurance
                        </span>
                      </div>
                      <SummaryRow
                        label="Policies"
                        value={String(form.insurance.length)}
                      />
                      <SummaryRow
                        label="Coverage"
                        value={formatCurrency(
                          form.insurance.reduce(
                            (s, i) => s + i.coverage_amount,
                            0,
                          ),
                          investmentCurrency,
                        )}
                      />
                      <SummaryRow
                        label="Premium/yr"
                        value={formatCurrency(
                          form.insurance.reduce(
                            (s, i) => s + i.annual_premium,
                            0,
                          ),
                          investmentCurrency,
                        )}
                      />
                    </>
                  )}
                  {form.insurance.length === 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        No insurance - consider adding a policy
                      </div>
                    </>
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
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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

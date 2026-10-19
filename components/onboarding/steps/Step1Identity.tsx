"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import csc from "countries-states-cities";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
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

import currencyCodes from "currency-codes";
import {
  AsYouType,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

import {
  identitySchema,
  type IdentityFormValues,
} from "@/lib/onboarding/schemas";
import type { IdentityData } from "@/lib/onboarding/types";
import { ONBOARDING_COPY } from "@/lib/onboarding/copy";
import { useOnboardingStore } from "@/store/onboardingStore";
import {
  ArrowRight,
  ChevronsUpDown,
  Check,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── CSC country list (sorted) ────────────────────────────────────────────────
const CSC_COUNTRIES = (
  csc.getAllCountries() as Array<{
    id: number;
    name: string;
    iso2: string;
    emoji: string;
    phone_code: string;
  }>
).sort((a, b) => a.name.localeCompare(b.name));

// ─── Dial codes from CSC countries ────────────────────────────────────────────
const DIAL_CODE_LIST = CSC_COUNTRIES.filter((c) => c.phone_code)
  .map((c) => ({
    code: c.iso2,
    name: c.name,
    flag: c.emoji,
    dialCode: `+${c.phone_code}`,
  }))
  .filter(
    (c, idx, arr) => arr.findIndex((x) => x.dialCode === c.dialCode) === idx,
  )
  .sort((a, b) => a.name.localeCompare(b.name));

function extractDialCode(phoneNumber?: string) {
  if (!phoneNumber?.trim()) return null;

  const matchedCountry = [...DIAL_CODE_LIST]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => phoneNumber.startsWith(country.dialCode));

  return matchedCountry?.dialCode ?? null;
}

function stripDialCode(phoneNumber: string | undefined, dialCode: string) {
  if (!phoneNumber) return "";
  return phoneNumber.startsWith(dialCode)
    ? phoneNumber.slice(dialCode.length).trim()
    : phoneNumber;
}

function formatNationalNumber(digits: string, countryCode?: string) {
  const nationalDigits = digits.replace(/\D/g, "");
  if (!countryCode) return nationalDigits;
  return new AsYouType(countryCode as CountryCode).input(nationalDigits);
}

function getPhoneFeedback(
  fullPhone: string | undefined,
  dialCode: string,
  touched: boolean,
) {
  const nationalDigits = stripDialCode(fullPhone, dialCode).replace(/\D/g, "");

  // Only validate after blur so we don't nag while the user is still typing.
  if (!touched) {
    return {
      tone: "muted" as const,
      message: "Enter your mobile number without the country code.",
    };
  }

  if (!nationalDigits) {
    return {
      tone: "error" as const,
      message: "Phone number is required",
    };
  }

  if (isValidPhoneNumber(fullPhone ?? "")) {
    return {
      tone: "success" as const,
      message: "Looks like a valid phone number.",
    };
  }

  if (!isPossiblePhoneNumber(fullPhone ?? "")) {
    return {
      tone: "error" as const,
      message:
        "This number looks too short or too long for the selected country code.",
    };
  }

  return {
    tone: "error" as const,
    message: "Enter a valid phone number for the selected country code.",
  };
}

// ─── Currencies (all ISO 4217 via currency-codes) ───────────────────────────
const CURRENCY_LIST = currencyCodes
  .codes()
  .map((code) => {
    const entry = currencyCodes.code(code);
    return entry ? { code: entry.code, name: entry.currency } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a!.name.localeCompare(b!.name)) as {
  code: string;
  name: string;
}[];

const MARITAL_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
];

const PREFIXES = ["Mr", "Mrs", "Ms", "Dr", "Prof", "Rev"];

const GENDERS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "O", label: "Non-binary / Other" },
  { value: "X", label: "Prefer not to say" },
];

interface Step1IdentityProps {
  defaultValues?: IdentityData | null;
  onComplete: (data: IdentityData) => void;
  onBack?: () => void;
}

export function Step1Identity({
  defaultValues,
  onComplete,
  onBack,
}: Step1IdentityProps) {
  const [dialCode, setDialCode] = React.useState(
    () => extractDialCode(defaultValues?.phone_number) ?? "+233",
  );
  const [phoneTouched, setPhoneTouched] = React.useState(false);
  const [countryOpen, setCountryOpen] = React.useState(false);
  const [stateOpen, setStateOpen] = React.useState(false);
  const [cityOpen, setCityOpen] = React.useState(false);
  const [dialCodeOpen, setDialCodeOpen] = React.useState(false);
  const [currencyOpen, setCurrencyOpen] = React.useState(false);
  const [showOptional, setShowOptional] = React.useState(() =>
    Boolean(
      defaultValues?.prefix ||
      defaultValues?.gender ||
      defaultValues?.marital_status ||
      defaultValues?.occupation,
    ),
  );

  const { accountMode } = useOnboardingStore();
  const isSolo = accountMode === "solo";

  const initialValues: IdentityFormValues = {
    first_name: defaultValues?.first_name ?? "",
    last_name: defaultValues?.last_name ?? "",
    display_name: defaultValues?.display_name ?? "",
    date_of_birth: defaultValues?.date_of_birth ?? "",
    phone_number: defaultValues?.phone_number ?? "",
    resident_country: defaultValues?.resident_country ?? "",
    resident_state: defaultValues?.resident_state ?? "",
    resident_city: defaultValues?.resident_city ?? "",
    currency: defaultValues?.currency ?? "",
    account_mode: accountMode,
    marital_status: defaultValues?.marital_status ?? "",
    occupation: defaultValues?.occupation ?? "",
    prefix: defaultValues?.prefix ?? "",
    gender: defaultValues?.gender ?? "",
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: initialValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const selectedCountry = watch("resident_country");
  const selectedState = watch("resident_state");
  const watchedPhoneNumber = watch("phone_number");
  const watchedResidentCity = watch("resident_city");
  const watchedCurrency = watch("currency");
  const watchedDisplayName = watch("display_name");
  const watchedFirstName = watch("first_name");
  const watchedLastName = watch("last_name");
  const watchedDateOfBirth = watch("date_of_birth");

  // Derive state + city lists from CSC based on selections
  const selectedCscCountry = React.useMemo(
    () => CSC_COUNTRIES.find((c) => c.name === selectedCountry) ?? null,
    [selectedCountry],
  );

  const stateList = React.useMemo(
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

  const selectedCscState = React.useMemo(
    () => stateList.find((s) => s.name === selectedState) ?? null,
    [stateList, selectedState],
  );

  const cityList = React.useMemo(
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

  // Clear state + city only when the user actively changes the country
  // (not on mount - compare against the initial value to avoid StrictMode double-fire)
  const prevCountryRef = React.useRef(initialValues.resident_country);
  React.useEffect(() => {
    if (prevCountryRef.current === selectedCountry) return;
    prevCountryRef.current = selectedCountry;
    setValue("resident_state", "");
    setValue("resident_city", "");
  }, [selectedCountry]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear city only when the user actively changes the state
  const prevStateRef = React.useRef(initialValues.resident_state ?? "");
  React.useEffect(() => {
    if (prevStateRef.current === selectedState) return;
    prevStateRef.current = selectedState ?? "";
    setValue("resident_city", "");
  }, [selectedState]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPhoneValid = Boolean(
    watchedPhoneNumber && isValidPhoneNumber(watchedPhoneNumber),
  );
  const phoneFeedback = getPhoneFeedback(
    watchedPhoneNumber,
    dialCode,
    phoneTouched,
  );

  const canContinue = isSolo
    ? Boolean(
        watchedFirstName?.trim() &&
        watchedLastName?.trim() &&
        watchedDateOfBirth &&
        isPhoneValid &&
        selectedCountry &&
        (!statesAvailable || selectedState) &&
        watchedResidentCity?.trim() &&
        watchedCurrency,
      )
    : Boolean(
        watchedDisplayName?.trim() &&
        isPhoneValid &&
        selectedCountry &&
        (!statesAvailable || selectedState) &&
        watchedResidentCity?.trim() &&
        watchedCurrency,
      );

  // Keep account_mode in sync with store value (in case user went back and changed it)
  React.useEffect(() => {
    setValue("account_mode", accountMode);
  }, [accountMode, setValue]);

  // ─── Auto-detect country + currency via IP ────────
  React.useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data?.country_code) {
          const match = CSC_COUNTRIES.find((c) => c.iso2 === data.country_code);
          if (match) {
            if (!defaultValues?.resident_country) {
              setValue("resident_country", match.name);
            }
            if (!defaultValues?.phone_number && match.phone_code) {
              setDialCode(`+${match.phone_code}`);
            }
          }
        }
        if (!defaultValues?.currency && data?.currency) {
          const matched = CURRENCY_LIST.find((c) => c.code === data.currency);
          if (matched) setValue("currency", matched.code);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(data: IdentityFormValues) {
    // For solo accounts: derive display_name from first + last name
    const display_name = isSolo
      ? `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim()
      : data.display_name;

    onComplete({
      ...data,
      display_name,
      resident_state: data.resident_state || undefined,
      // Clear fields that don't apply to the account mode
      first_name: isSolo ? data.first_name : undefined,
      last_name: isSolo ? data.last_name : undefined,
      date_of_birth: isSolo ? data.date_of_birth : undefined,
      marital_status: data.marital_status || undefined,
      occupation: data.occupation || undefined,
      prefix: isSolo ? data.prefix || undefined : undefined,
      gender: isSolo ? data.gender || undefined : undefined,
    });
  }

  const heading = ONBOARDING_COPY.identity.sectionHeading[accountMode];
  const subheading = ONBOARDING_COPY.identity.sectionSubheading[accountMode];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
          {heading}
        </h1>
        <p className="mt-2 text-slate-500 text-sm sm:text-base">
          {subheading} Only the essentials are shown. You can add more details
          later, or expand the section below.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── PERSONAL INFO ── */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm space-y-5">
          <p className="text-xs font-semibold capitalize uppercase tracking-widest text-slate-400">
            Personal Info
          </p>

          {isSolo ? (
            /* ── SOLO: first name + last name (prefix moved to optional) ── */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input {...register("first_name")} />
                {errors.first_name && (
                  <p className="text-xs text-red-500">
                    {errors.first_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input {...register("last_name")} />
                {errors.last_name && (
                  <p className="text-xs text-red-500">
                    {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* ── PARTNER / FAMILY: collect household display name ── */
            <div className="space-y-1.5">
              <Label>{ONBOARDING_COPY.identity.nameLabel[accountMode]}</Label>
              <Input
                {...register("display_name")}
                placeholder={
                  ONBOARDING_COPY.identity.namePlaceholder[accountMode] ?? ""
                }
              />
              {errors.display_name && (
                <p className="text-xs text-red-500">
                  {errors.display_name.message}
                </p>
              )}
            </div>
          )}

          {/* DOB + Phone — DOB only for solo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isSolo && (
              <div className="flex flex-col gap-2">
                <Label>Date of Birth</Label>
                <DatePickerField
                  control={control}
                  name="date_of_birth"
                  placeholder="Select date of birth"
                  fromYear={1930}
                  toYear={new Date().getFullYear() - 16}
                  disabled={{
                    after: new Date(
                      new Date().getFullYear() - 16,
                      new Date().getMonth(),
                      new Date().getDate(),
                    ),
                  }}
                />
              </div>
            )}

            {/* Phone — dial code + number */}
            <div className="space-y-1.5">
              <Label>Phone number</Label>
              <Controller
                control={control}
                name="phone_number"
                render={({ field }) => {
                  const selectedDialCodeCountry = DIAL_CODE_LIST.find(
                    (country) => country.dialCode === dialCode,
                  );
                  const rawNumber = formatNationalNumber(
                    stripDialCode(field.value, dialCode),
                    selectedDialCodeCountry?.code,
                  );

                  function handleDialCodeChange(nextDialCode: string) {
                    const nextCountry = DIAL_CODE_LIST.find(
                      (country) => country.dialCode === nextDialCode,
                    );
                    const national = formatNationalNumber(
                      stripDialCode(field.value, dialCode),
                      nextCountry?.code,
                    );
                    setDialCode(nextDialCode);
                    field.onChange(`${nextDialCode} ${national}`.trim());
                    setDialCodeOpen(false);
                  }

                  return (
                    <div className="flex gap-2">
                      <Popover
                        open={dialCodeOpen}
                        onOpenChange={setDialCodeOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={dialCodeOpen}
                            className="w-28 shrink-0 justify-between font-normal px-2"
                          >
                            <span className="truncate">
                              {selectedDialCodeCountry?.flag ?? "🌍"} {dialCode}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-78 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search phone code or country..." />
                            <CommandList>
                              <CommandEmpty>No phone code found.</CommandEmpty>
                              <CommandGroup>
                                {DIAL_CODE_LIST.map((country) => (
                                  <CommandItem
                                    key={`${country.code}-${country.dialCode}`}
                                    value={`${country.name} ${country.dialCode} ${country.code}`}
                                    onSelect={() =>
                                      handleDialCodeChange(country.dialCode)
                                    }
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        dialCode === country.dialCode
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {country.flag} {country.dialCode} -{" "}
                                    {country.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <Input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="12 345 6789"
                        value={rawNumber}
                        aria-invalid={phoneFeedback.tone === "error"}
                        onFocus={() => setPhoneTouched(false)}
                        onBlur={() => {
                          setPhoneTouched(true);
                          field.onBlur();
                        }}
                        onChange={(e) => {
                          const formatted = formatNationalNumber(
                            e.target.value,
                            selectedDialCodeCountry?.code,
                          );
                          field.onChange(`${dialCode} ${formatted}`.trim());
                        }}
                        className={cn(
                          "flex-1",
                          phoneFeedback.tone === "error" &&
                            "border-red-400 focus-visible:ring-red-400/40",
                          phoneFeedback.tone === "success" &&
                            "border-emerald-500 focus-visible:ring-emerald-500/30",
                        )}
                      />
                    </div>
                  );
                }}
              />
              <p
                className={cn(
                  "text-xs",
                  phoneFeedback.tone === "error" && "text-red-500",
                  phoneFeedback.tone === "success" && "text-emerald-600",
                  phoneFeedback.tone === "muted" && "text-slate-400",
                )}
              >
                {phoneFeedback.message}
              </p>
            </div>
          </div>

          {/* Gender + Marital + Occupation + Prefix — collapsed by default */}
          {isSolo && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowOptional((s) => !s)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                aria-expanded={showOptional}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showOptional && "rotate-180",
                  )}
                />
                {showOptional ? "Hide" : "Add"} personal details (optional)
              </button>

              {showOptional && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Prefix</Label>
                    <Controller
                      control={control}
                      name="prefix"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {PREFIXES.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Controller
                      control={control}
                      name="gender"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDERS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Marital status</Label>
                    <Controller
                      control={control}
                      name="marital_status"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {MARITAL_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Occupation</Label>
                    <Input {...register("occupation")} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── LOCATION & PREFERENCES ── */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm space-y-5">
          <p className="text-xs font-semibold capitalize uppercase tracking-widest text-slate-400">
            Location & Preferences
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Country — searchable combobox */}
            <div className="space-y-1.5">
              <Label>Country of residence</Label>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryOpen}
                    className={cn(
                      "w-full justify-between font-normal h-10",
                      !selectedCountry && "text-slate-400",
                    )}
                  >
                    {selectedCountry
                      ? (() => {
                          const match = CSC_COUNTRIES.find(
                            (c) => c.name === selectedCountry,
                          );
                          return match
                            ? `${match.emoji} ${match.name}`
                            : selectedCountry;
                        })()
                      : "Select country"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-70 p-0" align="start">
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
                              setValue("resident_country", val, {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                              setCountryOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCountry === c.name
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
              {errors.resident_country && (
                <p className="text-xs text-red-500">
                  {errors.resident_country.message}
                </p>
              )}
            </div>

            {/* State / Region — shown when the selected country has states in CSC */}
            {statesAvailable && (
              <div className="space-y-1.5">
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
                        !selectedState && "text-slate-400",
                      )}
                    >
                      {selectedState || "Select state / region"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-70 p-0" align="start">
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
                                setValue("resident_state", val, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                  shouldTouch: true,
                                });
                                setStateOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedState === s.name
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* City — dropdown from CSC if cities available, else text input */}
            <div className="space-y-1.5">
              <Label>City</Label>
              {citiesAvailable ? (
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityOpen}
                      disabled={statesAvailable && !selectedState}
                      className={cn(
                        "w-full justify-between font-normal h-10",
                        !watchedResidentCity && "text-slate-400",
                      )}
                    >
                      {watchedResidentCity || "Select city"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-70 p-0" align="start">
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
                                setValue("resident_city", val, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                  shouldTouch: true,
                                });
                                setCityOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchedResidentCity === city.name
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
                <Controller
                  control={control}
                  name="resident_city"
                  render={({ field }) => (
                    <Input
                      {...field}
                      disabled={statesAvailable && !selectedState}
                      placeholder={
                        statesAvailable && !selectedState
                          ? "Select a region first"
                          : statesAvailable
                            ? "Enter city name"
                            : "eg. Cairo"
                      }
                    />
                  )}
                />
              )}
              {errors.resident_city && (
                <p className="text-xs text-red-500">
                  {errors.resident_city.message}
                </p>
              )}
            </div>

            {/* Currency - searchable combobox */}
            <div className="space-y-1.5">
              <Label>Preferred currency</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => {
                  const selected = CURRENCY_LIST.find(
                    (c) => c.code === field.value,
                  );
                  return (
                    <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={currencyOpen}
                          className={cn(
                            "w-full justify-between font-normal h-10",
                            !field.value && "text-slate-400",
                          )}
                        >
                          {selected
                            ? `${selected.code} - ${selected.name}`
                            : "Select currency"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search currency or code..." />
                          <CommandList>
                            <CommandEmpty>No currency found.</CommandEmpty>
                            <CommandGroup>
                              {CURRENCY_LIST.map((c) => (
                                <CommandItem
                                  key={c.code}
                                  value={`${c.code} ${c.name}`}
                                  onSelect={() => {
                                    field.onChange(c.code);
                                    setCurrencyOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === c.code
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span className="font-medium">{c.code}</span>
                                  <span className="ml-2 text-slate-500 truncate">
                                    {c.name}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                }}
              />
              {errors.currency && (
                <p className="text-xs text-red-500">
                  {errors.currency.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-between gap-3">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 gap-1 h-12 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={!canContinue}
          className="flex-1 gap-2 h-12 bg-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] text-white rounded-xl"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {!canContinue && (
        <p className="text-sm">
          Please fill in all required fields before continuing.
        </p>
      )}
    </div>
  );
}

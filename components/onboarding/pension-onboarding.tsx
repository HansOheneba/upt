"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import csc from "countries-states-cities";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { CelereyLoader } from "@/components/login/celerey-loader";
import { useClientGate } from "@/hooks/useClientGate";
import { isOnboarded } from "@/lib/client-data";
import { finishPensionJoin } from "@/lib/pension/enter";
import { formatAmountTyping, finalizeAmountInput, formatGhs, parseAmountInput } from "@/lib/pension/metrics";
import { isValidPhoneNumber } from "libphonenumber-js";

const STAGES = [
  { label: "You", steps: [1] },
  { label: "Next of kin", steps: [2] },
  { label: "Contributions", steps: [3] },
  { label: "Review", steps: [4] },
];

/** National digits for a Ghana number, without the leading 0 or +233. */
function ghanaNationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+") || digits.startsWith("00233")) {
    digits = digits.replace(/^00/, "").replace(/^233/, "");
  } else if (digits.startsWith("233") && digits.length > 9) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
}

function groupGhanaNational(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)]
    .filter(Boolean)
    .join(" ");
}

/** Display form: +233 24 411 9088 */
function formatGhanaPhone(raw: string): string {
  const digits = ghanaNationalDigits(raw);
  if (!digits) return "";
  return `+233 ${groupGhanaNational(digits)}`;
}

function ghanaPhoneError(raw: string, emptyMessage: string): string | null {
  const digits = ghanaNationalDigits(raw);
  if (!digits) return emptyMessage;
  if (digits.length < 9 || !isValidPhoneNumber(`+233${digits}`)) {
    return "Enter a valid mobile number.";
  }
  return null;
}

function ageFromIso(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const born = new Date(year, month - 1, day);
  if (
    born.getFullYear() !== year ||
    born.getMonth() !== month - 1 ||
    born.getDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  const hadBirthday =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

function birthDateError(iso: string): string | null {
  if (!iso) return "Enter your date of birth.";
  const age = ageFromIso(iso);
  if (age === null || age > 100) return "Enter a valid date of birth.";
  if (age < 18) return "You need to be at least 18.";
  return null;
}

type CscCountry = { id: number; name: string; iso2: string; emoji: string };
type CscRegion = { id: number; name: string };
type CscCity = { id: number; name: string };

const COUNTRIES = (csc.getAllCountries() as CscCountry[]).sort((a, b) =>
  a.name.localeCompare(b.name),
);

function regionsFor(countryName: string): CscRegion[] {
  const country = COUNTRIES.find((item) => item.name === countryName);
  if (!country) return [];
  return (csc.getStatesOfCountry(country.id) as CscRegion[]).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function citiesFor(countryName: string, regionName: string): CscCity[] {
  const region = regionsFor(countryName).find(
    (item) => item.name === regionName,
  );
  if (!region) return [];
  return (csc.getCitiesOfState(region.id) as CscCity[]).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function formatPlace(country: string, region: string, city: string): string {
  return [city, region, country].filter((part) => part.trim()).join(", ");
}

type Draft = {
  firstName: string;
  lastName: string;
  mobile: string;
  profession: string;
  dateOfBirth: string;
  country: string;
  region: string;
  city: string;
  nextOfKin: string;
  nextOfKinContact: string;
  monthlyContribution: string;
  targetPot: string;
  retirementAge: string;
};

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  mobile: "",
  profession: "",
  dateOfBirth: "",
  country: "Ghana",
  region: "",
  city: "",
  nextOfKin: "",
  nextOfKinContact: "",
  monthlyContribution: "300",
  targetPot: "",
  retirementAge: "60",
};

export function PensionOnboarding() {
  const router = useRouter();
  const { ready, auth } = useClientGate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [kinError, setKinError] = useState<string | null>(null);

  const regions = useMemo(() => regionsFor(draft.country), [draft.country]);
  const cities = useMemo(
    () => citiesFor(draft.country, draft.region),
    [draft.country, draft.region],
  );
  const selectedCountry = COUNTRIES.find((item) => item.name === draft.country);

  useEffect(() => {
    if (!ready) return;
    if (!auth.loggedIn) {
      router.replace("/");
      return;
    }
    if (isOnboarded()) router.replace("/dashboard");
  }, [ready, auth.loggedIn, router]);

  if (!ready || !auth.loggedIn || isOnboarded()) return <CelereyLoader />;

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function nextFromYou() {
    if (
      !draft.firstName.trim() ||
      !draft.lastName.trim() ||
      !draft.profession.trim()
    ) {
      setError("Enter your name and profession.");
      return;
    }
    const birthMessage = birthDateError(draft.dateOfBirth);
    if (birthMessage) {
      setError(birthMessage);
      return;
    }
    if (!draft.country) {
      setError("Select your country of residence.");
      return;
    }
    if (regions.length > 0 && !draft.region) {
      setError("Select your region.");
      return;
    }
    if (cities.length > 0 && !draft.city) {
      setError("Select your city.");
      return;
    }
    const mobileMessage = ghanaPhoneError(
      draft.mobile,
      "Enter your mobile number.",
    );
    if (mobileMessage) {
      setMobileError(mobileMessage);
      setError(null);
      return;
    }
    setMobileError(null);
    setError(null);
    setStep(2);
  }

  function nextFromKin() {
    if (!draft.nextOfKin.trim()) {
      setError("Enter your next of kin.");
      return;
    }
    const kinMessage = ghanaPhoneError(
      draft.nextOfKinContact,
      "Enter a contact number for your next of kin.",
    );
    if (kinMessage) {
      setKinError(kinMessage);
      setError(null);
      return;
    }
    setKinError(null);
    setError(null);
    setStep(3);
  }

  function nextFromContribution() {
    const amount = parseAmountInput(draft.monthlyContribution);
    const target = parseAmountInput(draft.targetPot);
    const age = Number(draft.retirementAge.trim());
    if (!Number.isFinite(amount) || amount < 20) {
      setError("Enter a monthly contribution of at least GHS 20.");
      return;
    }
    if (!Number.isFinite(target) || target < 100) {
      setError("Enter a pension target of at least GHS 100.");
      return;
    }
    if (!Number.isInteger(age) || age < 18 || age > 100) {
      setError("Enter a retirement age between 18 and 100.");
      return;
    }
    const currentAge = ageFromIso(draft.dateOfBirth);
    if (currentAge !== null && age <= currentAge) {
      setError(
        `Retirement age has to be later than your current age of ${currentAge}.`,
      );
      return;
    }
    setError(null);
    setStep(4);
  }

  function finish() {
    finishPensionJoin({
      firstName: draft.firstName,
      lastName: draft.lastName,
      mobile: formatGhanaPhone(draft.mobile),
      profession: draft.profession,
      location: formatPlace(draft.country, draft.region, draft.city),
      dateOfBirth: draft.dateOfBirth,
      nextOfKin: draft.nextOfKin,
      nextOfKinContact: formatGhanaPhone(draft.nextOfKinContact),
      monthlyContribution: parseAmountInput(draft.monthlyContribution),
      targetPot: parseAmountInput(draft.targetPot),
      retirementAge: Number(draft.retirementAge.trim()),
    });
    router.replace("/dashboard");
  }

  const currentAge = ageFromIso(draft.dateOfBirth);
  const chosenRetirementAge = Number(draft.retirementAge.trim());
  const yearsToRetirement =
    currentAge !== null && Number.isInteger(chosenRetirementAge)
      ? chosenRetirementAge - currentAge
      : null;

  return (
    <OnboardingShell currentStep={step} totalSteps={4} stages={STAGES}>
      <div className="space-y-6">
        {step === 1 ? (
          <>
            <Heading
              title="Your My Own Pension account"
              body="This is the membership we already collect when someone joins on Mobile Money."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                value={draft.firstName}
                onChange={(value) => patch({ firstName: value })}
              />
              <Field
                label="Last name"
                value={draft.lastName}
                onChange={(value) => patch({ lastName: value })}
              />
              <div className="sm:col-span-2">
                <GhanaPhoneField
                  label="Mobile number"
                  value={draft.mobile}
                  error={mobileError}
                  onChange={(value) => {
                    setMobileError(null);
                    patch({ mobile: formatGhanaPhone(value) });
                  }}
                />
              </div>
              <Field
                label="Profession"
                value={draft.profession}
                onChange={(value) => patch({ profession: value })}
              />
              <BirthDateField
                value={draft.dateOfBirth}
                onChange={(dateOfBirth) => {
                  setError(null);
                  patch({ dateOfBirth });
                }}
              />
              <p className="text-sm font-medium sm:col-span-2">Where you live</p>
              <PlaceSelect
                label="Country of residence"
                value={draft.country}
                placeholder="Select country of residence"
                display={
                  selectedCountry
                    ? `${selectedCountry.emoji} ${selectedCountry.name}`
                    : draft.country
                }
                searchPlaceholder="Search country..."
                emptyLabel="No country found."
                options={COUNTRIES.map((country) => ({
                  id: country.iso2,
                  label: country.name,
                  prefix: country.emoji,
                }))}
                onChange={(country) => {
                  setError(null);
                  patch({ country, region: "", city: "" });
                }}
              />
              <PlaceSelect
                label="Region"
                value={draft.region}
                placeholder="Select region"
                searchPlaceholder="Search region..."
                emptyLabel="No region found."
                disabled={!draft.country || regions.length === 0}
                options={regions.map((region) => ({
                  id: region.id,
                  label: region.name,
                }))}
                onChange={(region) => {
                  setError(null);
                  patch({ region, city: "" });
                }}
              />
              {cities.length > 0 || !draft.region ? (
                <PlaceSelect
                  label="City"
                  value={draft.city}
                  placeholder={
                    draft.region ? "Select city" : "Select a region first"
                  }
                  searchPlaceholder="Search city..."
                  emptyLabel="No city found."
                  disabled={!draft.region}
                  options={cities.map((city) => ({
                    id: city.id,
                    label: city.name,
                  }))}
                  onChange={(city) => {
                    setError(null);
                    patch({ city });
                  }}
                />
              ) : null}
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Heading
              title="Next of kin"
              body="The same details a claim form asks for, kept on the member record."
            />
            <div className="grid gap-4">
              <Field
                label="Next of kin"
                value={draft.nextOfKin}
                onChange={(value) => patch({ nextOfKin: value })}
              />
              <GhanaPhoneField
                label="Next of kin contact"
                value={draft.nextOfKinContact}
                error={kinError}
                onChange={(value) => {
                  setKinError(null);
                  patch({ nextOfKinContact: formatGhanaPhone(value) });
                }}
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Heading
              title="How you contribute"
              body="Personal pension contributions come in through MTN Mobile Money. Set the pot you want and the age you plan to retire."
            />
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">MTN Mobile Money</p>
              <p className="text-muted-foreground">
                USSD or the My Own Pension app. We do not ask you to sign up
                again.
              </p>
            </div>
            <AmountField
              label="Monthly contribution (GHS)"
              value={draft.monthlyContribution}
              onChange={(value) => patch({ monthlyContribution: value })}
            />
            <AmountField
              label="Pension target (GHS)"
              value={draft.targetPot}
              onChange={(value) => patch({ targetPot: value })}
            />
            <Field
              label="Retirement age"
              value={draft.retirementAge}
              onChange={(value) => patch({ retirementAge: value })}
              type="number"
              min={18}
            />
            {yearsToRetirement !== null && yearsToRetirement > 0 ? (
              <p className="text-sm text-muted-foreground">
                That is {yearsToRetirement}{" "}
                {yearsToRetirement === 1 ? "year" : "years"} away.
              </p>
            ) : null}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Heading
              title="Review"
              body="Check these details before you open the account. Contributions post from MTN Mobile Money."
            />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item
                label="Name"
                value={`${draft.firstName} ${draft.lastName}`}
              />
              <Item label="Mobile" value={formatGhanaPhone(draft.mobile)} />
              <Item label="Profession" value={draft.profession} />
              <Item
                label="Date of birth"
                value={
                  draft.dateOfBirth
                    ? format(new Date(`${draft.dateOfBirth}T00:00:00`), "d MMM yyyy")
                    : ""
                }
              />
              <Item label="Country of residence" value={draft.country} />
              <Item label="Region" value={draft.region} />
              {draft.city ? <Item label="City" value={draft.city} /> : null}
              <Item label="Next of kin" value={draft.nextOfKin} />
              <Item
                label="Next of kin contact"
                value={formatGhanaPhone(draft.nextOfKinContact)}
              />
              <Item label="Channel" value="MTN Mobile Money · My Own Pension" />
              <Item
                label="Monthly"
                value={formatGhs(parseAmountInput(draft.monthlyContribution) || 0, 2)}
              />
              <Item
                label="Pension target"
                value={formatGhs(
                  parseAmountInput(draft.targetPot) || 0,
                  2,
                )}
              />
              <Item label="Retirement age" value={draft.retirementAge} />
            </dl>
          </>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          {step === 1 ? (
            <Button type="button" onClick={nextFromYou}>
              Continue
            </Button>
          ) : null}
          {step === 2 ? (
            <Button type="button" onClick={nextFromKin}>
              Continue
            </Button>
          ) : null}
          {step === 3 ? (
            <Button type="button" onClick={nextFromContribution}>
              Review
            </Button>
          ) : null}
          {step === 4 ? (
            <Button type="button" onClick={finish}>
              Open my pension
            </Button>
          ) : null}
        </div>
      </div>
    </OnboardingShell>
  );
}

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function BirthDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-2">
      <Label htmlFor="date-of-birth">Date of birth</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-of-birth"
            type="button"
            variant="outline"
            className={cn(
              "h-9 w-full justify-start px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            {selected ? format(selected, "d MMM yyyy") : "Select date of birth"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            captionLayout="dropdown"
            fromYear={thisYear - 100}
            toYear={thisYear - 18}
            defaultMonth={selected ?? new Date(thisYear - 30, 0)}
            disabled={{ after: new Date(thisYear - 18, new Date().getMonth(), new Date().getDate()) }}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function GhanaPhoneField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  const helpId = `${id}-help`;
  const national = groupGhanaNational(ghanaNationalDigits(value));

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex">
        <span className="inline-flex h-9 shrink-0 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-medium text-foreground">
          +233
        </span>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? helpId : undefined}
          className="rounded-l-none"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error ? (
        <p id={helpId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PlaceSelect({
  label,
  value,
  display,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  display?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  options: { id: string | number; label: string; prefix?: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-between px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {value ? (display ?? value) : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.label);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === option.label ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.prefix ? `${option.prefix} ` : null}
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={formatAmountTyping(value)}
        onChange={(event) => onChange(formatAmountTyping(event.target.value))}
        onBlur={(event) => onChange(finalizeAmountInput(event.currentTarget.value))}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        min={type === "number" ? (min ?? 20) : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

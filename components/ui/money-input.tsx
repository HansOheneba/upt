"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  /** Raw numeric string (no commas), e.g. "12500.50" */
  value: string;
  onChange: (value: string) => void;
  currencySymbol?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

function addCommas(raw: string): string {
  if (!raw) return "";
  const [integer, decimal] = raw.split(".");
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

function stripNonNumeric(raw: string): string {
  // Remove everything except digits and a single decimal point
  const noCommas = raw.replace(/,/g, "");
  const match = noCommas.match(/^\d*\.?\d*/);
  return match ? match[0] : "";
}

export function MoneyInput({
  value,
  onChange,
  currencySymbol = "$",
  placeholder = "0",
  id,
  className,
  disabled = false,
}: MoneyInputProps) {
  const [displayValue, setDisplayValue] = React.useState(() =>
    addCommas(value),
  );

  // Sync if parent changes value externally
  React.useEffect(() => {
    setDisplayValue(addCommas(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = stripNonNumeric(e.target.value);
    setDisplayValue(addCommas(raw));
    onChange(raw);
  }

  function handleBlur() {
    // Re-format on blur to clean up any oddities
    setDisplayValue(addCommas(value));
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {currencySymbol}
      </span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        className={cn("pl-6", className)}
      />
    </div>
  );
}

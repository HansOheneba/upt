"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  /** ISO currency code shown as the left badge, e.g. "GHS", "USD" */
  currency: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function CurrencyInput({
  currency,
  value,
  onChange,
  placeholder = "0",
  id,
  disabled = false,
  className,
}: CurrencyInputProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
        {currency}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"
      />
    </div>
  );
}

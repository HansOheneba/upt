"use client";

import * as React from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { Input } from "@/components/ui/input";

interface CurrencyNumberInputFieldProps<
  TFieldValues extends FieldValues = FieldValues,
> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  id?: string;
  placeholder?: string;
  className?: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function sanitizeNumericInput(raw: string) {
  const noCommas = raw.replace(/,/g, "");
  const onlyDigitsAndDots = noCommas.replace(/[^\d.]/g, "");

  const firstDot = onlyDigitsAndDots.indexOf(".");
  if (firstDot === -1) return onlyDigitsAndDots;

  const beforeDot = onlyDigitsAndDots.slice(0, firstDot + 1);
  const afterDot = onlyDigitsAndDots.slice(firstDot + 1).replace(/\./g, "");
  return `${beforeDot}${afterDot}`;
}

export function CurrencyNumberInputField<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  name,
  id,
  placeholder,
  className,
}: CurrencyNumberInputFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const numericValue =
          typeof field.value === "number" && !Number.isNaN(field.value)
            ? field.value
            : undefined;
        const displayValue =
          numericValue === undefined ? "" : formatNumber(numericValue);

        return (
          <Input
            id={id}
            inputMode="decimal"
            placeholder={placeholder}
            className={className}
            value={displayValue}
            onChange={(e) => {
              const sanitized = sanitizeNumericInput(e.target.value);
              if (sanitized === "") {
                // undefined makes the field fall back to its last number.
                field.onChange(Number.NaN);
                return;
              }

              field.onChange(Number(sanitized));
            }}
            onBlur={field.onBlur}
            onFocus={(e) => {
              e.target.select();
            }}
          />
        );
      }}
    />
  );
}

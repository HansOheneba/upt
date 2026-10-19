"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Controller, Control, FieldValues, Path } from "react-hook-form";

interface DatePickerFieldProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  showRelativeCountdown?: boolean;
  disabled?: { before?: Date; after?: Date };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatRelativeCountdown(date: Date | undefined) {
  if (!date) return "Not selected";

  const now = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "in 1 day";
  if (diffDays === -1) return "1 day ago";

  if (diffDays > 0) {
    let cursor = new Date(now);
    let months = 0;

    while (true) {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      if (next.getTime() <= target.getTime()) {
        months += 1;
        cursor = next;
      } else {
        break;
      }
    }

    const remainingDays = Math.round(
      (target.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24),
    );

    const parts: string[] = [];
    if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
    if (remainingDays > 0) {
      parts.push(`${remainingDays} day${remainingDays === 1 ? "" : "s"}`);
    }

    if (parts.length === 0) return `in ${diffDays} days`;
    return `in ${parts.join(", ")}`;
  }

  const pastDays = Math.abs(diffDays);
  return `${pastDays} day${pastDays === 1 ? "" : "s"} ago`;
}

export function DatePickerField<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  name,
  placeholder = "Select date",
  fromYear = 1950,
  toYear = new Date().getFullYear(),
  showRelativeCountdown = false,
}: DatePickerFieldProps<TFieldValues>) {
  const [open, setOpen] = React.useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selectedDate = field.value ? new Date(field.value) : undefined;

        return (
          <>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal border-slate-200"
                >
                  {selectedDate ? format(selectedDate, "PPP") : placeholder}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  captionLayout="dropdown"
                  fromYear={fromYear}
                  toYear={toYear}
                  onSelect={(date) => {
                    field.onChange(
                      date ? date.toISOString().split("T")[0] : "",
                    );
                    setOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>

            {showRelativeCountdown && (
              <p className="px-1 pt-1 text-xs text-slate-500">
                <span className="font-medium">
                  {formatRelativeCountdown(selectedDate)}
                </span>
              </p>
            )}
          </>
        );
      }}
    />
  );
}

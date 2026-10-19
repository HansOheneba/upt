"use client";

import * as React from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { parseDate } from "chrono-node";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NaturalLanguageDatePickerFieldProps<
  TFieldValues extends FieldValues = FieldValues,
> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  placeholder?: string;
}

function formatDate(date: Date | undefined) {
  if (!date) return "";

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatRelativeCountdown(date: Date | undefined) {
  if (!date) return "Not selected";

  const now = startOfDay(new Date());
  const target = startOfDay(date);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "in 1 day";
  if (diffDays === -1) return "1 day ago";

  if (diffDays > 0) {
    let cursor = new Date(now);
    let months = 0;

    // Build a calendar-accurate months + days duration for future dates.
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
    if (months > 0) {
      parts.push(`${months} month${months === 1 ? "" : "s"}`);
    }
    if (remainingDays > 0) {
      parts.push(`${remainingDays} day${remainingDays === 1 ? "" : "s"}`);
    }

    if (parts.length === 0) {
      return `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
    }

    return `in ${parts.join(", ")}`;
  }

  const pastDays = Math.abs(diffDays);
  return `${pastDays} day${pastDays === 1 ? "" : "s"} ago`;
}

function toISODate(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().split("T")[0];
}

function parseInputToDate(value: string) {
  if (!value.trim()) return undefined;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (isoMatch) {
    const parsed = new Date(
      `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`,
    );
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = parseDate(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
}

export function NaturalLanguageDatePickerField<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  name,
  placeholder = "Tomorrow or next week",
}: NaturalLanguageDatePickerFieldProps<TFieldValues>) {
  const [open, setOpen] = React.useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selectedDate = parseInputToDate(field.value || "");
        const inputValue = field.value
          ? formatDate(selectedDate) || field.value
          : "";

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Input
                value={inputValue}
                placeholder={placeholder}
                onChange={(e) => {
                  const raw = e.target.value;
                  field.onChange(raw);

                  const parsed = parseInputToDate(raw);
                  if (parsed) {
                    field.onChange(toISODate(parsed));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(true);
                  }
                }}
              />

              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Select target date"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="end"
                  sideOffset={8}
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    captionLayout="dropdown"
                    fromYear={1950}
                    toYear={new Date().getFullYear() + 50}
                    defaultMonth={selectedDate ?? new Date()}
                    onSelect={(date) => {
                      if (!date) {
                        field.onChange("");
                        return;
                      }

                      field.onChange(toISODate(date));
                      setOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <p className="px-1 text-xs text-slate-500">
              <span className="font-medium">
                {formatRelativeCountdown(selectedDate)}
              </span>
            </p>
          </div>
        );
      }}
    />
  );
}

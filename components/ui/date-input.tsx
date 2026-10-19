"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateInputProps {
  /** ISO date string "YYYY-MM-DD" or empty string */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Disable dates before this date */
  fromDate?: Date;
  /** Disable dates after this date */
  toDate?: Date;
  fromYear?: number;
  toYear?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder = "Pick a date",
  fromDate,
  toDate,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 30,
  className,
  disabled = false,
  id,
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? format(selected, "d MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          fromYear={fromYear}
          toYear={toYear}
          fromDate={fromDate}
          toDate={toDate}
          captionLayout="dropdown"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

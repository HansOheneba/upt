"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AppointmentDuration, AppointmentSlot, AppointmentType } from "@/lib/book-api";
import {
  APPOINTMENT_DURATIONS,
  BOOKABLE_SESSION_TYPES,
  SESSION_TYPE_LABELS,
} from "@/components/dashboard/advisor/types";
import { formatAdvisoryDate, formatAdvisoryTime } from "@/lib/advisory-map";

const PRIMARY = "var(--brand-primary)";

const TIME_OPTIONS = (() => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 18 && minute > 0) break;
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const sample = new Date(2000, 0, 1, hour, minute);
      options.push({
        value,
        label: sample.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }),
      });
    }
  }
  return options;
})();

function combineDateAndTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if (
    [year, month, day, hours, minutes].some((part) => Number.isNaN(part))
  ) {
    return null;
  }
  const local = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

function slotRangeDates(): { fromDate: Date; toDate: Date } {
  const fromDate = new Date();
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 14);
  return { fromDate, toDate };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting?: boolean;
  slots: AppointmentSlot[];
  slotsLoading?: boolean;
  onDurationChange: (duration: AppointmentDuration) => void;
  onRequest: (input: {
    type: AppointmentType;
    durationMinutes: AppointmentDuration;
    scheduledAt: string;
    title?: string;
    message: string;
  }) => void;
};

export function RequestSessionDialog({
  open,
  onOpenChange,
  submitting,
  slots,
  slotsLoading,
  onDurationChange,
  onRequest,
}: Props) {
  const [type, setType] = React.useState<AppointmentType>("review");
  const [duration, setDuration] = React.useState<AppointmentDuration>(30);
  const [note, setNote] = React.useState("");
  const [preferredDate, setPreferredDate] = React.useState("");
  const [preferredTime, setPreferredTime] = React.useState("");
  const [slotStart, setSlotStart] = React.useState<string | null>(null);
  const { fromDate, toDate } = slotRangeDates();

  React.useEffect(() => {
    if (!open) return;
    setSlotStart(null);
    setNote("");
  }, [open]);

  function clearPreferredDateTime() {
    setPreferredDate("");
    setPreferredTime("");
  }

  function handlePreferredDate(next: string) {
    setPreferredDate(next);
    setSlotStart(null);
  }

  function handlePreferredTime(next: string) {
    setPreferredTime(next);
    setSlotStart(null);
  }

  function handleDuration(next: AppointmentDuration) {
    setDuration(next);
    setSlotStart(null);
    onDurationChange(next);
  }

  function scheduledPreference(): string | null {
    if (slotStart) return slotStart;
    return combineDateAndTime(preferredDate, preferredTime);
  }

  function handleRequest() {
    const scheduledAt = scheduledPreference();
    const message = note.trim();
    if (!scheduledAt || !message) return;
    onRequest({
      type,
      durationMinutes: duration,
      scheduledAt,
      message,
    });
  }

  const canRequest =
    Boolean(scheduledPreference()) && note.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-muted/60 bg-background/95 backdrop-blur sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a Session</DialogTitle>
          <DialogDescription>
            Choose a time that works for you. Your RM will confirm within 1 - 2
            business days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-type">Session type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AppointmentType)}
            >
              <SelectTrigger id="session-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKABLE_SESSION_TYPES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SESSION_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-2">
              {APPOINTMENT_DURATIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleDuration(mins)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    duration === mins
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-muted/60 bg-background/60 hover:bg-muted/30",
                  )}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-note">
              Note for your RM{" "}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id="session-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share context, topics to cover, or questions for the meeting."
              rows={3}
              className="resize-none"
              required
              aria-required
            />
            <p className="text-xs text-muted-foreground">
              Required so your RM knows what to prepare for.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="session-preferred-date">Preferred date</Label>
              <DateInput
                id="session-preferred-date"
                value={preferredDate}
                onChange={handlePreferredDate}
                placeholder="Pick a date"
                fromDate={fromDate}
                toDate={toDate}
                fromYear={fromDate.getFullYear()}
                toYear={toDate.getFullYear()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-preferred-time">Preferred time</Label>
              <Select
                value={preferredTime || undefined}
                onValueChange={handlePreferredTime}
              >
                <SelectTrigger id="session-preferred-time" className="w-full">
                  <SelectValue placeholder="Pick a time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Pick a preferred date and time, or choose a matching slot below.
              Your RM must accept before the session is confirmed.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Matching times (optional)
            </p>
            {slotsLoading ? (
              <p className="text-xs text-muted-foreground">Loading times...</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No overlapping times in the next two weeks. Request a time
                instead.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {slots.map((slot) => {
                  const selected = slotStart === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => {
                        setSlotStart(slot.start);
                        clearPreferredDateTime();
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        selected
                          ? "border-foreground/20 bg-foreground text-background"
                          : "border-muted/60 bg-background/60 hover:bg-muted/30",
                      )}
                    >
                      {formatAdvisoryDate(slot.start)}{" "}
                      {formatAdvisoryTime(slot.start)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRequest}
            disabled={submitting || !canRequest}
            className="text-white"
            style={{ backgroundColor: PRIMARY }}
          >
            {submitting ? "Sending..." : "Request session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { appointmentsCardClass } from "./appointments-ui";
import { cn } from "@/lib/utils";
import {
  CONFLICT_COPY,
  fetchAvailability,
  isNoAdvisorError,
  updateAvailability,
  type ClientAvailability,
  type Weekday,
} from "@/lib/book-api";
import { SessionExpiredError } from "@/lib/dashboard-api";
import { isOfflineSession } from "@/lib/session-expired";
import { useLocalSampleData } from "@/hooks/useLocalSampleData";
import { usesLocalSampleData } from "@/lib/demo-mode";

const PRIMARY = "var(--brand-primary)";

const DAYS: { id: Weekday; label: string }[] = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const TIMEZONES = [
  "Africa/Accra",
  "Africa/Lagos",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "UTC",
];

const TIME_OPTIONS = (() => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 21; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 21 && minute > 0) break;
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

const DEFAULT_AVAILABILITY: ClientAvailability = {
  timezone:
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC",
  hoursStart: "09:00",
  hoursEnd: "17:00",
  daysAvailable: ["mon", "tue", "wed", "thu", "fri"],
};

function formatTimeLabel(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return hhmm;
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  enabled: boolean;
  demoValue?: ClientAvailability;
};

export function ClientAvailabilityCard({ enabled, demoValue }: Props) {
  const demo = useLocalSampleData();
  const [value, setValue] = React.useState<ClientAvailability>(
    DEFAULT_AVAILABILITY,
  );
  const [draft, setDraft] = React.useState<ClientAvailability>(value);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!demo) return;
    const next = demoValue ?? DEFAULT_AVAILABILITY;
    setValue(next);
    setDraft(next);
  }, [demo, demoValue]);

  React.useEffect(() => {
    if (!enabled || demo || usesLocalSampleData() || isOfflineSession()) return;
    let cancelled = false;
    setLoading(true);
    fetchAvailability()
      .then((next) => {
        if (!cancelled) setValue(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof SessionExpiredError) return;
        if (isNoAdvisorError(err)) {
          toast.error(CONFLICT_COPY.noAdvisor);
          return;
        }
        toast.error("Could not load your hours.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, demo]);

  function openEdit() {
    setDraft(value);
    setEditOpen(true);
  }

  function closeEdit() {
    setDraft(value);
    setEditOpen(false);
  }

  function toggleDraftDay(day: Weekday) {
    setDraft((prev) => {
      const has = prev.daysAvailable.includes(day);
      return {
        ...prev,
        daysAvailable: has
          ? prev.daysAvailable.filter((d) => d !== day)
          : [...prev.daysAvailable, day],
      };
    });
  }

  async function handleSave() {
    if (!enabled || saving || draft.daysAvailable.length === 0) return;
    setSaving(true);
    if (demo) {
      setValue(draft);
      toast.success("Availability saved.");
      setEditOpen(false);
      setSaving(false);
      return;
    }
    try {
      const next = await updateAvailability(draft);
      setValue(next);
      setDraft(next);
      toast.success("Availability saved.");
      setEditOpen(false);
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      if (isNoAdvisorError(err)) {
        toast.error(CONFLICT_COPY.noAdvisor);
        return;
      }
      toast.error("Could not save availability.");
    } finally {
      setSaving(false);
    }
  }

  const timezoneOptions = TIMEZONES.includes(value.timezone)
    ? TIMEZONES
    : [value.timezone, ...TIMEZONES];

  const draftTimezoneOptions = TIMEZONES.includes(draft.timezone)
    ? TIMEZONES
    : [draft.timezone, ...TIMEZONES];

  return (
    <>
      <DashCard className={appointmentsCardClass}>
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-4 border-b border-border/50 px-5 py-4">
            <div className="min-w-0">
              <p
                className="text-sm font-semibold tracking-tight"
                style={{ color: PRIMARY }}
              >
                Your hours
              </p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Bookable times are the overlap of these hours and your
                RM&apos;s, minus time already booked.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              disabled={!enabled || loading}
              onClick={openEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit hours
            </Button>
          </div>

          {loading ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              Loading hours...
            </p>
          ) : (
            <div className="space-y-4 px-5 py-4">
              <dl className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-10 sm:gap-y-3">
                <div className="min-w-0 sm:max-w-[min(100%,14rem)]">
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Timezone
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {value.timezone.replace(/_/g, " ")}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Hours
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {formatTimeLabel(value.hoursStart)} –{" "}
                    {formatTimeLabel(value.hoursEnd)}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Days
                </p>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {DAYS.map((day) => {
                    const on = value.daysAvailable.includes(day.id);
                    return (
                      <span
                        key={day.id}
                        className={cn(
                          "flex items-center justify-center rounded-md border py-1.5 text-center text-[11px] font-medium sm:rounded-full sm:py-1 sm:text-xs",
                          on
                            ? "border-transparent text-white"
                            : "border-border/60 bg-muted/20 text-muted-foreground",
                        )}
                        style={on ? { backgroundColor: PRIMARY } : undefined}
                      >
                        {day.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </DashCard>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) closeEdit();
          else setEditOpen(true);
        }}
      >
        <DialogContent className="border-muted/60 bg-background/95 backdrop-blur sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit your hours</DialogTitle>
            <DialogDescription>
              Set when you are generally available for appointments. Your RM
              will see the overlap with their calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="avail-tz">Timezone</Label>
              <Select
                value={draft.timezone}
                onValueChange={(tz) =>
                  setDraft((prev) => ({ ...prev, timezone: tz }))
                }
              >
                <SelectTrigger id="avail-tz" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {draftTimezoneOptions.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="avail-start">From</Label>
                <Select
                  value={draft.hoursStart}
                  onValueChange={(time) =>
                    setDraft((prev) => ({ ...prev, hoursStart: time }))
                  }
                >
                  <SelectTrigger id="avail-start" className="w-full">
                    <SelectValue />
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
              <div className="space-y-1.5">
                <Label htmlFor="avail-end">To</Label>
                <Select
                  value={draft.hoursEnd}
                  onValueChange={(time) =>
                    setDraft((prev) => ({ ...prev, hoursEnd: time }))
                  }
                >
                  <SelectTrigger id="avail-end" className="w-full">
                    <SelectValue />
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
            </div>

            <div className="space-y-1.5">
              <Label>Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const on = draft.daysAvailable.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDraftDay(day.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 active:scale-[0.97]",
                        on
                          ? "border-transparent text-white"
                          : "border-muted/60 bg-background/60 hover:bg-muted/30",
                      )}
                      style={on ? { backgroundColor: PRIMARY } : undefined}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
            <Button
              type="button"
              className="text-white"
              style={{ backgroundColor: PRIMARY }}
              disabled={saving || draft.daysAvailable.length === 0}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving..." : "Save hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

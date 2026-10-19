"use client";

import * as React from "react";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ThreadMessage } from "@/lib/book-api";
import { appointmentsCardClass } from "./appointments-ui";

const PRIMARY = "var(--brand-primary)";

function formatNameForPlaceholder(rmName: string): string {
  const first = rmName.split(/\s+/).filter(Boolean)[0];
  if (!first) return "Your RM";
  if (first.toLowerCase() === "your") return "Your RM";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toDateString();
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  items: ThreadMessage[];
  loading?: boolean;
  rmName: string;
  enabled?: boolean;
  sending?: boolean;
  body: string;
  onBodyChange: (value: string) => void;
  onSend: () => void;
  className?: string;
  minHeight?: string;
  /** Renders inside appointments-style parent card (no extra border/radius). */
  embedded?: boolean;
};

export function AdvisorMessageThread({
  items,
  loading = false,
  rmName,
  enabled = true,
  sending = false,
  body,
  onBodyChange,
  onSend,
  className,
  minHeight = "min-h-[420px]",
  embedded = false,
}: Props) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const canSend = enabled && !sending && body.trim().length > 0;

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items.length]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-card",
        embedded
          ? "h-full min-h-0 rounded-none border-0 shadow-none"
          : cn(appointmentsCardClass, "border border-border/50", minHeight),
        className,
      )}
    >
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 sm:px-6"
      >
        {loading && items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading messages...
          </p>
        ) : items.length === 0 ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 py-12 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Mail className="size-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Write to your advisor
            </p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Notes land with your relationship manager. Replies usually come back within 1–2 business days.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4"
              disabled={!enabled}
              onClick={() => composerRef.current?.focus()}
            >
              Write a message
            </Button>
          </div>
        ) : (
          items.map((msg, index) => {
            const mine = msg.author === "client";
            const prev = items[index - 1];
            const showDay =
              !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
            return (
              <React.Fragment
                key={msg.messageId || `${msg.createdAt}-${msg.body}`}
              >
                {showDay && msg.createdAt ? (
                  <p className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {formatDayLabel(msg.createdAt)}
                  </p>
                ) : null}
                <div
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed",
                      mine
                        ? "rounded-2xl rounded-br-md text-white"
                        : "rounded-2xl rounded-bl-md border border-border/50 bg-muted/40 text-foreground",
                    )}
                    style={mine ? { backgroundColor: PRIMARY } : undefined}
                  >
                    <p className="wrap-break-word whitespace-pre-wrap">
                      {msg.body}
                    </p>
                    {msg.createdAt ? (
                      <p
                        className={cn(
                          "mt-1.5 text-[10px] tabular-nums",
                          mine ? "text-white/70" : "text-muted-foreground",
                        )}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border/50 bg-muted/10 px-5 py-3 sm:px-6">
        <Textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          ref={composerRef}
          placeholder={`Message ${formatNameForPlaceholder(rmName)}…`}
          className="min-h-10 max-h-28 resize-none rounded-lg border-border/60 bg-background px-3 py-2.5 text-sm shadow-none"
          disabled={!enabled || sending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-lg text-white active:scale-[0.97]"
          style={{ backgroundColor: PRIMARY }}
          disabled={!canSend}
          onClick={onSend}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

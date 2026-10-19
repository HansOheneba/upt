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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  RequestTopic,
  RequestUrgency,
} from "@/components/dashboard/advisor/types";

type RequestDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  topic: RequestTopic;
  urgency: RequestUrgency;
  message: string;
  onTopicChange: (value: RequestTopic) => void;
  onUrgencyChange: (value: RequestUrgency) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
};

export function RequestDialog({
  open,
  onOpenChange,
  topic,
  urgency,
  message,
  onTopicChange,
  onUrgencyChange,
  onMessageChange,
  onSubmit,
}: RequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-muted/60 bg-background/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle>Request a Conversation</DialogTitle>
          <DialogDescription>
            This sends a structured request to your advisor. You’ll receive a
            response and proposed time windows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Topic</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["portfolio", "Portfolio"],
                    ["tax", "Tax / Planning"],
                    ["goals", "Goals"],
                    ["other", "Other"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onTopicChange(k)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      topic === k
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-muted/60 bg-background/60 hover:bg-muted/30",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Urgency</div>
              <div className="mt-2 flex gap-2">
                {(
                  [
                    ["standard", "Standard"],
                    ["urgent", "Urgent"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onUrgencyChange(k)}
                    className={cn(
                      "flex-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                      urgency === k
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-muted/60 bg-background/60 hover:bg-muted/30",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Use urgent for time-sensitive decisions only.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-muted/60 bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">Message</div>
            <Textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Describe what you want to discuss, and include any context or constraints."
              className="mt-2 min-h-[120px] bg-background/60"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              Tip: include “what decision you’re trying to make” and “by when”.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={message.trim().length < 10}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

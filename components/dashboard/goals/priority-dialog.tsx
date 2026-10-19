"use client";

import * as React from "react";
import Sortable from "sortablejs";
import { GripVertical, Tag } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/lib/client-data";

interface PriorityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
  onSave: (reordered: Goal[]) => void;
}

export function PriorityDialog({
  open,
  onOpenChange,
  goals,
  onSave,
}: PriorityDialogProps) {
  const [ordered, setOrdered] = React.useState<Goal[]>([]);
  const sortableRef = React.useRef<Sortable | null>(null);

  // Re-seed when dialog opens
  React.useEffect(() => {
    if (open) {
      setOrdered([...goals].sort((a, b) => a.priority - b.priority));
    }
  }, [open, goals]);

  // Callback ref - fires the moment the <ul> actually mounts in the portal DOM.
  // A plain useEffect([open]) fires before the portal renders, so listRef.current
  // would be null. The callback ref pattern guarantees the node is real.
  const listCallbackRef = React.useCallback((node: HTMLUListElement | null) => {
    if (sortableRef.current) {
      sortableRef.current.destroy();
      sortableRef.current = null;
    }
    if (!node) return;

    sortableRef.current = Sortable.create(node, {
      animation: 150,
      handle: "[data-drag-handle]",
      dragClass: "opacity-40",
      ghostClass: "opacity-30",
      onEnd(evt) {
        const { oldIndex, newIndex } = evt;
        if (
          oldIndex === undefined ||
          newIndex === undefined ||
          oldIndex === newIndex
        )
          return;

        setOrdered((prev) => {
          const next = [...prev];
          const [moved] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, moved);
          return next;
        });
      },
    });
  }, []);

  function handleSave() {
    // Assign priority = position index + 1
    const withPriority = ordered.map((g, i) => ({ ...g, priority: i + 1 }));
    onSave(withPriority);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Goal Priority</DialogTitle>
          <DialogDescription>
            Drag the grip handle to reorder. The top goal becomes
            priority&nbsp;1.
          </DialogDescription>
        </DialogHeader>

        <ul
          ref={listCallbackRef}
          className="divide-y divide-border rounded-md border"
        >
          {ordered.map((goal, index) => (
            <li
              key={goal.id}
              data-id={goal.id}
              className="flex items-center gap-3 px-3 py-3 select-none"
            >
              {/* Position badge */}
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>

              {/* Goal info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{goal.title}</p>
                <p className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {goal.category}
                </p>
              </div>

              {/* Drag handle */}
              <span
                data-drag-handle
                className="cursor-grab text-muted-foreground active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

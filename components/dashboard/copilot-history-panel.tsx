"use client";

import { SquarePen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredChat } from "@/lib/copilot-history";
import { cn } from "@/lib/utils";

const GROUP_ORDER = ["Today", "Yesterday", "Previous 7 days", "Older"] as const;

function chatGroup(iso: string): (typeof GROUP_ORDER)[number] {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Older";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diff = (start.getTime() - day.getTime()) / 86_400_000;
  if (diff < 1) return "Today";
  if (diff < 2) return "Yesterday";
  if (diff < 7) return "Previous 7 days";
  return "Older";
}

type CopilotHistoryPanelProps = {
  chats: StoredChat[];
  activeId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CopilotHistoryPanel({
  chats,
  activeId,
  onNew,
  onOpen,
  onDelete,
}: CopilotHistoryPanelProps) {
  const ordered = [...chats].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const groups = GROUP_ORDER.map((label) => ({
    label,
    chats: ordered.filter((chat) => chatGroup(chat.updatedAt) === label),
  })).filter((group) => group.chats.length > 0);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="shrink-0 p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={onNew}
        >
          <SquarePen />
          New chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">
            Your conversations show up here.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.label}>
                <p className="px-2 pb-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.chats.map((chat) => {
                    const selected = chat.id === activeId;
                    return (
                      <li key={chat.id}>
                        <div
                          className={cn(
                            "group flex items-center rounded-md",
                            selected ? "bg-muted" : "hover:bg-muted/70",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onOpen(chat.id)}
                            className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm"
                            aria-current={selected ? "true" : undefined}
                          >
                            {chat.title}
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${chat.title}`}
                            onClick={() => onDelete(chat.id)}
                            className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { useAdvisoryMessages } from "@/hooks/useAdvisoryMessages";
import { AdvisorMessageThread } from "./advisor-message-thread";
import type { ThreadMessage } from "@/lib/book-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabled: boolean;
  rmName: string;
  demoItems?: ThreadMessage[];
};

export function AdvisorMessagesDrawer({
  open,
  onOpenChange,
  enabled,
  rmName,
}: Props) {
  const { items, loading, sending, body, setBody, send } = useAdvisoryMessages({
    enabled,
    active: open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/50 px-5 py-4 pr-12">
          <p className={dashboardTheme.sectionLabel}>Messages</p>
          <SheetTitle className="mt-1 text-base font-semibold tracking-tight text-foreground">
            {rmName}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Relationship Manager · Usually replies within 1 - 2 business days
          </SheetDescription>
        </SheetHeader>

        <AdvisorMessageThread
          embedded
          items={items}
          loading={loading}
          rmName={rmName}
          enabled={enabled}
          sending={sending}
          body={body}
          onBodyChange={setBody}
          onSend={() => void send()}
          className="min-h-0 flex-1"
          minHeight="min-h-0"
        />
      </SheetContent>
    </Sheet>
  );
}

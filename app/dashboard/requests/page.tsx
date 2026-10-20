"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { formatPensionDate } from "@/lib/pension/metrics";
import type { PensionRequest } from "@/lib/pension/types";
import { usePensionStore } from "@/store/pensionStore";

const VALIDATION_ERROR = "Add a subject and a message.";
const SUBMIT_ERROR = "We could not send your request. Try again.";

const STATUS_LABEL: Record<PensionRequest["status"], string> = {
  open: "Open",
  replied: "Replied",
};

export default function RequestsPage() {
  const ready = usePensionReady();
  const requests = usePensionStore((state) => state.requests);
  const loadError = usePensionStore((state) => state.loadError);
  const reload = usePensionStore((state) => state.reload);
  const addRequest = usePensionStore((state) => state.addRequest);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selected = requests.find((request) => request.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selected, selectedId]);

  function openForm() {
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (submittingRef.current) return;
    setFormOpen(false);
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!subject.trim() || !body.trim()) {
      setError(VALIDATION_ERROR);
      if (!subject.trim()) subjectRef.current?.focus();
      else bodyRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const saved = addRequest({ subject, body });
      if (!saved) {
        setError(SUBMIT_ERROR);
        return;
      }
      setSubject("");
      setBody("");
      setFormOpen(false);
      toast.success("Request sent. We'll reply here, and by SMS and email.");
    } catch {
      setError(SUBMIT_ERROR);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <PensionPage>
      <PensionPageHeader
        title="Requests"
        description="Send a question to our team and track responses to your requests."
        action={
          ready ? (
            <Button type="button" onClick={openForm}>
              <Plus />
              New request
            </Button>
          ) : null
        }
      />

      {!ready ? (
        <RequestsLoading />
      ) : loadError ? (
        <DashboardEmptyState
          icon={<AlertCircle />}
          title="We could not load your requests"
          description="Try loading your requests again."
          action={{ label: "Try again", onClick: reload }}
        />
      ) : requests.length === 0 ? (
        <DashboardEmptyState
          icon={<MessageCircle />}
          title="No requests yet"
          description="Have a question about your pension? Send a request to our team and track the response here."
          action={{
            label: "New request",
            icon: <Plus />,
            onClick: openForm,
          }}
        />
      ) : (
        <section aria-labelledby="request-history-heading">
          <h2 id="request-history-heading" className="sr-only">
            Your requests
          </h2>
          <ul className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                onView={() => setSelectedId(request.id)}
              />
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(next) => {
          if (next) setFormOpen(true);
          else closeForm();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!submitting}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            subjectRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="normal-case">New request</DialogTitle>
            <DialogDescription>
              Include a subject and the question you want answered.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="req-subject">Subject</Label>
              <Input
                id="req-subject"
                ref={subjectRef}
                value={subject}
                disabled={submitting}
                aria-invalid={error === VALIDATION_ERROR && !subject.trim()}
                onChange={(event) => {
                  setSubject(event.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-body">Message</Label>
              <Textarea
                id="req-body"
                ref={bodyRef}
                value={body}
                rows={4}
                disabled={submitting}
                aria-invalid={error === VALIDATION_ERROR && !body.trim()}
                onChange={(event) => {
                  setBody(event.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending
                  </>
                ) : (
                  "Submit request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet
        open={selected != null}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
      >
        <SheetContent side="right" className="w-full gap-0 overflow-hidden sm:max-w-md">
          {selected ? <RequestConversation request={selected} /> : null}
        </SheetContent>
      </Sheet>
    </PensionPage>
  );
}

function RequestRow({
  request,
  onView,
}: {
  request: PensionRequest;
  onView: () => void;
}) {
  const submitted = submittedLabel(request.createdAt);
  const subject = request.subject.trim() || "Request";
  const preview = requestPreview(request);

  return (
    <li className="border-b border-border/70 last:border-b-0">
      <div className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium tracking-tight">{subject}</h3>
              {submitted ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <time dateTime={request.createdAt}>{submitted}</time>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">Date unavailable</p>
              )}
            </div>
            <RequestStatusBadge status={request.status} />
          </div>
          {preview ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {preview}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 self-start sm:self-center"
          aria-haspopup="dialog"
          aria-label={`View conversation for ${subject}`}
          onClick={onView}
        >
          View conversation
        </Button>
      </div>
    </li>
  );
}

function RequestConversation({ request }: { request: PensionRequest }) {
  const submitted = submittedLabel(request.createdAt);
  const replied = request.repliedAt ? submittedLabel(request.repliedAt) : null;
  const reply = request.reply?.trim() ?? "";
  const subject = request.subject.trim() || "Request";

  return (
    <>
      <SheetHeader className="border-b border-border/70 px-6 py-5 pr-12">
        <p className={dashboardTheme.sectionLabel}>Request</p>
        <SheetTitle className="mt-2 text-xl font-medium normal-case tracking-tight">
          {subject}
        </SheetTitle>
        <SheetDescription>
          {submitted ? `Submitted ${submitted}` : "Submission date unavailable"}
        </SheetDescription>
        <div className="mt-2">
          <RequestStatusBadge status={request.status} />
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <article className="rounded-lg border border-border/70 px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">
            You{submitted ? ` · ${submitted}` : ""}
          </p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
            {request.body.trim() || "No message was included."}
          </p>
        </article>

        {reply ? (
          <article className="rounded-lg bg-muted/60 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              United Pension Trustees{replied ? ` · ${replied}` : ""}
            </p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{reply}</p>
          </article>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {request.status === "replied"
              ? "No reply text is available on this request."
              : "Our team has not replied yet."}
          </p>
        )}
      </div>
    </>
  );
}

function RequestStatusBadge({ status }: { status: PensionRequest["status"] }) {
  const label = STATUS_LABEL[status] ?? "Open";
  return (
    <Badge variant={status === "replied" ? "secondary" : "outline"}>{label}</Badge>
  );
}

function RequestsLoading() {
  return (
    <div
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading requests</span>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="space-y-2 border-b border-border/70 px-4 py-3.5 last:border-b-0"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}

function submittedLabel(iso: string): string | null {
  if (!iso) return null;
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatPensionDate(iso);
}

function requestPreview(request: PensionRequest): string {
  return request.reply?.trim() || request.body?.trim() || "";
}

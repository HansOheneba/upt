"use client";

import { useRef, useState } from "react";
import { Mail } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { formatPensionDate } from "@/lib/pension/metrics";
import { usePensionStore } from "@/store/pensionStore";

const CHANNEL: Record<string, string> = {
  sms: "SMS",
  email: "Email",
  app: "In the app",
};

export default function RequestsPage() {
  const ready = usePensionReady();
  const requests = usePensionStore((state) => state.requests);
  const addRequest = usePensionStore((state) => state.addRequest);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError("Add a subject and a message.");
      return;
    }
    addRequest({ subject, body });
    setSubject("");
    setBody("");
    setError(null);
  }

  return (
    <PensionPage>
      <PensionPageHeader
        title="Requests"
        description="Questions live next to your pension. Replies also go out by SMS and email, which is how My Own Pension already reaches members."
      />

      <DashCard>
        <CardHeader>
          <CardTitle>New request</CardTitle>
          <CardDescription>
            Send it from here. The reply comes back in the app, and by SMS and email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="req-subject">Subject</Label>
              <Input
                id="req-subject"
                ref={subjectRef}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-body">Message</Label>
              <Textarea
                id="req-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit">Send request</Button>
          </form>
        </CardContent>
      </DashCard>

      {!ready ? (
        <div className="h-24" />
      ) : requests.length === 0 ? (
        <DashboardEmptyState
          icon={<Mail />}
          title="Ask United Pension Trustees"
          description="Questions about your pot, a payment, or a withdrawal are answered here."
          action={{
            label: "Write a request",
            onClick: () => subjectRef.current?.focus(),
          }}
        />
      ) : (
        requests.map((request) => (
          <DashCard key={request.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{request.subject}</CardTitle>
                  <CardDescription>
                    {formatPensionDate(request.createdAt)} · {CHANNEL[request.channel]}
                  </CardDescription>
                </div>
                <Badge variant={request.status === "replied" ? "default" : "outline"}>
                  {request.status === "replied" ? "Replied" : "Open"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{request.body}</p>
              {request.reply ? (
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    United Pension Trustees
                    {request.repliedAt ? ` · ${formatPensionDate(request.repliedAt)}` : ""}
                  </p>
                  <p className="mt-1">{request.reply}</p>
                </div>
              ) : null}
            </CardContent>
          </DashCard>
        ))
      )}
    </PensionPage>
  );
}

"use client";

import {
  FileText,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Lightbulb,
} from "lucide-react";

import { AvailabilityPill } from "@/components/dashboard/advisor/availability-pill";
import { SoftKpi } from "@/components/dashboard/advisor/soft-kpi";
import { Advisor } from "@/components/dashboard/advisor/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { Separator } from "@/components/ui/separator";

type AdvisorProfileCardProps = {
  advisor: Advisor;
  onRequestConversation: () => void;
};

export function AdvisorProfileCard({
  advisor,
  onRequestConversation,
}: AdvisorProfileCardProps) {
  return (
    <DashCard>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-xl font-semibold">
            {advisor.initials}
          </div>

          <div className="mt-4 text-lg font-semibold tracking-tight">
            {advisor.name}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {advisor.title}
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {advisor.credentials.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>

          <div className="mt-4">
            <AvailabilityPill value={advisor.availability} />
          </div>

          <Separator className="my-5" />

          <div className="w-full space-y-3 text-left">
            <div className="text-sm font-semibold tracking-tight">
              Advisor bio
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {advisor.bio}
            </p>

            <div className="mt-4 text-sm font-semibold tracking-tight">
              Specialties
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {advisor.specialties.map((s) => (
                <Badge key={s} variant="outline" className="bg-background/60">
                  {s}
                </Badge>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-muted/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
                Approach
              </div>
              <div className="mt-2 text-sm text-foreground">
                {advisor.philosophy}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <SoftKpi
                icon={<MapPin className="h-4 w-4" />}
                label="Based in"
                value={advisor.location}
              />
              <SoftKpi
                icon={<Mail className="h-4 w-4" />}
                label="Secure email"
                value={advisor.email}
              />
              <SoftKpi
                icon={<Phone className="h-4 w-4" />}
                label="Office line"
                value={advisor.phone}
              />
            </div>

            <div className="mt-5 space-y-2">
              <Button
                onClick={onRequestConversation}
                className="w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90 gap-2"
              >
                <MessageSquareText className="h-4 w-4" />
                Request a conversation
              </Button>

              <Button variant="secondary" className="w-full rounded-2xl gap-2">
                <FileText className="h-4 w-4" />
                View engagement summary
              </Button>

              <p className="text-xs text-muted-foreground">
                Requests are triaged. Standard requests typically receive a
                response within 1-2 business days.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Button } from "@/components/ui/button";

interface LockedFeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  hasAccess: boolean;
  onOpen: () => void;
  onUpgrade: () => void;
}

export function LockedFeatureCard({
  title,
  description,
  icon,
  hasAccess,
  onOpen,
  onUpgrade,
}: LockedFeatureCardProps) {
  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{icon}</div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open ${title}`}
            onClick={() => {
              if (hasAccess) onOpen();
              else onUpgrade();
            }}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>

        {hasAccess ? (
          <Button className="w-full justify-between" onClick={onOpen}>
            Open <ArrowUpRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="w-full justify-between"
            onClick={onUpgrade}
            style={{ background: "#0B102A", boxShadow: "none" }}
          >
            Upgrade to Pro <ArrowUpRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}

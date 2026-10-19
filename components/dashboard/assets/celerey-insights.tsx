import { Shield, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InsightTone = "warn" | "good" | "info";

export type Insight = {
  id: string;
  title: string;
  description: string;
  tone: InsightTone;
};

function InsightIcon({ tone }: { tone: InsightTone }) {
  if (tone === "warn") return <AlertTriangle className="h-4 w-4" />;
  if (tone === "good") return <TrendingUp className="h-4 w-4" />;
  return <Shield className="h-4 w-4" />;
}

function insightClasses(tone: InsightTone): string {
  if (tone === "warn")
    return "bg-amber-50/60 border-amber-200/60 text-amber-900";
  if (tone === "good")
    return "bg-emerald-50/60 border-emerald-200/60 text-emerald-900";
  return "bg-muted/30 border-muted/60";
}

export function CelereyInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <DashCard>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          Celerey portfolio insights
        </CardTitle>
        <Badge variant="secondary" className="gap-1 shrink-0">
          <Lightbulb className="h-3.5 w-3.5" />
          From your data
        </Badge>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {insights.map((i) => (
          <div
            key={i.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              insightClasses(i.tone),
            )}
          >
            <div className="mt-0.5 rounded-lg bg-background/60 p-2 shrink-0">
              <InsightIcon tone={i.tone} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-sm font-semibold">{i.title}</div>
              <div className="text-sm text-muted-foreground">
                {i.description}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </DashCard>
  );
}

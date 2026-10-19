import { Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { DashCard, CardContent, CardHeader, CardTitle } from "@/components/dashboard/dash-card";
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

export function AIInsights({ insights }: { insights: Insight[] }) {
  return (
    <DashCard>
      <CardHeader>
        <CardTitle className="text-base">AI Portfolio Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((i) => (
          <div
            key={i.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              insightClasses(i.tone),
            )}
          >
            <div className="mt-0.5 rounded-lg bg-background/60 p-2">
              <InsightIcon tone={i.tone} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold capitalize">{i.title}</div>
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

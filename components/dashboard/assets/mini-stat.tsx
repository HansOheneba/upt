import { DashCard, CardContent } from "@/components/dashboard/dash-card";

export function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <DashCard>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">
          {value}
        </div>
        {hint ? (
          <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </DashCard>
  );
}

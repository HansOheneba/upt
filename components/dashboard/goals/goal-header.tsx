import { Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardTheme } from "@/lib/dashboard-theme";

export function GoalHeader({
  onAddGoal,
  onManageGoals,
  hasPrioritizableGoals,
}: {
  onAddGoal: () => void;
  onManageGoals: () => void;
  hasPrioritizableGoals: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <h1 className={dashboardTheme.pageTitle}>Goals & Life Planning</h1>
        <p className={`mt-1.5 ${dashboardTheme.pageDescription}`}>
          Track your progress toward the milestones that matter most.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {hasPrioritizableGoals && (
          <Button variant="outline" onClick={onManageGoals}>
            <SlidersHorizontal className="h-4 w-4" />
            Manage goals
          </Button>
        )}
        <Button onClick={onAddGoal} data-tour="primary-action">
          <Plus className="h-4 w-4" />
          Add goal
        </Button>
      </div>
    </div>
  );
}

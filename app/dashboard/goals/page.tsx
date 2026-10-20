"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { useFinancialStore } from "@/store/financialStore";
import { blockRecordCreate } from "@/lib/record-limits";
import { usePageData } from "@/hooks/usePageData";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  deleteGoal as apiDeleteGoal,
  reorderGoalPriorities,
} from "@/lib/dashboard-api";
import { GoalHeader } from "@/components/dashboard/goals/goal-header";
import { GoalFilterTabs } from "@/components/dashboard/goals/goal-filter-tabs";
import { GoalCard } from "@/components/dashboard/goals/goal-card";
import { GoalProgressHero } from "@/components/dashboard/goals/goal-progress-hero";
import { GoalTimeline } from "@/components/dashboard/goals/goal-timeline";
import { GoalInsight } from "@/components/dashboard/goals/goal-insight";
import { GoalPlanSummary } from "@/components/dashboard/goals/scenario-card";
import { DeleteGoalDialog } from "@/components/dashboard/goals/delete-goal-dialog";
import { PriorityDialog } from "@/components/dashboard/goals/priority-dialog";
import {
  enrichGoalsWithCalculations,
  sortGoals,
} from "@/components/dashboard/goals/utils";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { PensionTargetDialog } from "@/components/pension/pension-target";
import { PENSION_GOAL_ID, withPensionGoalFirst } from "@/lib/pension/as-goal";
import { Target } from "lucide-react";
import { useTourDemoData } from "@/hooks/useTourDemo";
import { TOUR_DEMO_GOALS } from "@/lib/tour-demo-data";
import type {
  Goal,
  EnrichedGoal,
  FilterType,
  GoalSort,
} from "@/components/dashboard/goals/types";

export default function GoalsDashboard() {
  const router = useRouter();
  const { loading } = usePageData("goals");
  const storeGoals = useFinancialStore((s) => s.goals);

  const [goals, setGoals] = React.useState<Goal[]>(() =>
    [...storeGoals].sort((a, b) => a.priority - b.priority),
  );

  // Sync whenever the store is updated by the fetch
  React.useEffect(() => {
    setGoals([...storeGoals].sort((a, b) => a.priority - b.priority));
  }, [storeGoals]);

  const { data: displayGoals } = useTourDemoData(
    goals,
    TOUR_DEMO_GOALS,
  );

  const [filter, setFilter] = React.useState<FilterType>("active");
  const [sort, setSort] = React.useState<GoalSort>("priority");

  // Enrich goals with calculated values based on cash flow
  const enrichedGoals = React.useMemo<EnrichedGoal[]>(() => {
    return enrichGoalsWithCalculations(displayGoals);
  }, [displayGoals]);

  // Filter goals based on selected filter
  const filteredGoals = React.useMemo(() => {
    const visible =
      filter === "all"
        ? enrichedGoals
        : filter === "active"
          ? enrichedGoals.filter((goal) => !goal.completed)
          : enrichedGoals.filter((goal) => goal.completed);
    return sortGoals(visible, sort);
  }, [enrichedGoals, filter, sort]);

  // delete confirm dialog state
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<EnrichedGoal | null>(
    null,
  );

  // priority dialog state
  const [priorityOpen, setPriorityOpen] = React.useState(false);

  const goToAddGoal = (): void => {
    if (blockRecordCreate("goals")) return;
    router.push("/dashboard/goals/new");
  };

  const [pensionTargetOpen, setPensionTargetOpen] = React.useState(false);

  React.useEffect(() => {
    if (window.location.hash !== "#pension") return;
    setPensionTargetOpen(true);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);

  const goToGoal = (goalId: string, hash?: string): void => {
    if (goalId === PENSION_GOAL_ID) {
      setPensionTargetOpen(true);
      return;
    }
    router.push(
      `/dashboard/goals/${goalId}/edit${hash ? `#${hash}` : ""}`,
    );
  };

  const requestDelete = (goal: EnrichedGoal): void => {
    if (goal.id === PENSION_GOAL_ID) {
      toast("Your pension target stays as a goal. Edit it to change the amount or retirement age.");
      return;
    }
    setPendingDelete(goal);
    setDeleteOpen(true);
  };

  const confirmDelete = (): void => {
    if (!pendingDelete) return;
    const name = pendingDelete.title;
    setGoals((prev) => prev.filter((g) => g.id !== pendingDelete.id));
    useFinancialStore.getState().removeGoal(pendingDelete.id);
    apiDeleteGoal(pendingDelete.id).catch(() => {
      toast.error(`Failed to delete "${name}". Please try again.`);
    });
    toast.success(`"${name}" deleted.`);
    setDeleteOpen(false);
    setPendingDelete(null);
  };

  const cancelDelete = (): void => {
    setPendingDelete(null);
    setDeleteOpen(false);
  };

  const handlePrioritySave = (reordered: Goal[]) => {
    const pension =
      reordered.find((goal) => goal.id === PENSION_GOAL_ID) ??
      goals.find((goal) => goal.id === PENSION_GOAL_ID) ??
      null;
    const next = pension ? withPensionGoalFirst(reordered, pension) : reordered;
    setGoals(next);
    useFinancialStore.getState().setGoals(next);
    reorderGoalPriorities(
      next.map((g) => ({ goal_id: g.id, priority: g.priority })),
    )
      .then(() => toast.success("Priorities saved."))
      .catch(() => toast.error("Failed to save priorities. Please try again."));
  };

  return (
    // Outer wrapper is just the motion fade; the dashboard layout already
    // provides the page background (dashboardTheme.surface). The inner div
    // uses the shared pageContainer token so spacing matches every other tab.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={dashboardTheme.pageContainer}>
        {/* Header */}
        <GoalHeader
          onAddGoal={goToAddGoal}
          onManageGoals={() => setPriorityOpen(true)}
          hasPrioritizableGoals={goals.length > 1}
        />

        <GoalProgressHero goals={enrichedGoals} loading={loading} />

        <GoalFilterTabs
          filter={filter}
          setFilter={setFilter}
          sort={sort}
          setSort={setSort}
          goals={enrichedGoals}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-xl" />
            ))
          ) : filteredGoals.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3">
              <DashboardEmptyState
                icon={<Target />}
                title={goals.length === 0 ? "Give the plan a target" : "Nothing matches this filter"}
                description={
                  goals.length === 0
                    ? "Add a goal with an amount and a date. Progress, the monthly amount, and the timeline build from that."
                    : "Switch the filter, or add a goal that belongs in this view."
                }
                action={{
                  label: "Add a goal",
                  onClick: goToAddGoal,
                }}
              />
            </div>
          ) : (
            filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onView={(id) => goToGoal(id)}
                onEdit={(id) => goToGoal(id)}
                onAdjustContribution={(id) => goToGoal(id, "current")}
                onChangeTargetDate={(id) => goToGoal(id, "targetDate")}
                onRequestDelete={requestDelete}
              />
            ))
          )}
        </div>

        {!loading && (
          <div className="grid items-start gap-3 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <GoalTimeline goals={enrichedGoals} />
            </div>
            <div className="space-y-8 lg:col-span-2">
              <GoalInsight goals={enrichedGoals} />
              <GoalPlanSummary goals={enrichedGoals} />
            </div>
          </div>
        )}
      </div>

      <PensionTargetDialog
        open={pensionTargetOpen}
        onOpenChange={setPensionTargetOpen}
      />

      {/* Priority Dialog */}
      <PriorityDialog
        open={priorityOpen}
        onOpenChange={setPriorityOpen}
        goals={goals}
        onSave={handlePrioritySave}
      />

      {/* Delete Confirmation */}
      <DeleteGoalDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pendingDelete={pendingDelete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </motion.div>
  );
}

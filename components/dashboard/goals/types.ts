import type {
  Goal,
  Scenario,
  GoalCategory,
  GoalsMeta,
  ApiError,
} from "@/lib/client-data";

export type { Goal };
export type { Scenario };
export type { GoalCategory };
export type { GoalsMeta };
export type { ApiError };
export type ScenarioId = string;
export type FilterType = "all" | "active" | "completed";
export type GoalSort = "priority" | "target-date" | "progress";

/**
 * EnrichedGoal is now identical to Goal because monthlyContributionNeeded
 * and probability come from the backend (stored on the Goal itself).
 */
export type EnrichedGoal = Goal;

export interface GoalsMeta {
  totalMonthlyNeeded: number;
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
}

export const EMPTY_GOALS_META: GoalsMeta = {
  totalMonthlyNeeded: 0,
  totalGoals: 0,
  completedGoals: 0,
  activeGoals: 0,
};

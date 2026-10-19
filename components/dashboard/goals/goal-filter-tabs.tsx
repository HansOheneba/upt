import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnrichedGoal, FilterType, type GoalSort } from "./types";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
];

export function GoalFilterTabs({
  filter,
  setFilter,
  sort,
  setSort,
  goals,
}: {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  sort: GoalSort;
  setSort: (sort: GoalSort) => void;
  goals: EnrichedGoal[];
}) {
  const activeCount = goals.filter((goal) => !goal.completed).length;
  const completedCount = goals.filter((goal) => goal.completed).length;
  const counts: Record<FilterType, number> = {
    all: goals.length,
    active: activeCount,
    completed: completedCount,
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        role="radiogroup"
        aria-label="Filter goals"
        className="inline-flex w-fit rounded-lg bg-muted/70 p-1"
      >
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-card text-foreground ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {counts[item.id]}
              </span>
            </button>
          );
        })}
      </div>

      <Select value={sort} onValueChange={(value) => setSort(value as GoalSort)}>
        <SelectTrigger size="sm" aria-label="Sort goals" className="w-[160px]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="target-date">Target date</SelectItem>
          <SelectItem value="progress">Progress</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

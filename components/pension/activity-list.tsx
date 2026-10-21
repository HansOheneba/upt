import Link from "next/link";
import { formatPensionDate } from "@/lib/pension/metrics";
import type { ActivityItem } from "@/lib/pension/portfolio";

export function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="divide-y divide-foreground/5">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex flex-col gap-1 rounded-md py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.schemeName}
                {" · "}
                <time dateTime={item.at}>{formatPensionDate(item.at)}</time>
              </p>
            </div>
            <div className="shrink-0 text-sm sm:text-right">
              <p className="tabular-nums">{item.detail}</p>
              <p className="text-xs text-muted-foreground">
                {item.tone === "complete" ? "Completed" : "In progress"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

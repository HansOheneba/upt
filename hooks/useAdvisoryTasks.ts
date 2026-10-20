"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useLocalSampleData } from "@/hooks/useLocalSampleData";
import { usesLocalSampleData } from "@/lib/demo-mode";
import { fetchTasks, updateTaskStatus, type ClientTask } from "@/lib/book-api";
import { SessionExpiredError } from "@/lib/dashboard-api";
import { isOfflineSession } from "@/lib/session-expired";
import { mapTasks } from "@/lib/advisory-map";
import { MOCK_TASKS } from "@/lib/advisory-mock";
import type { ActionItem } from "@/components/dashboard/advisor/types";

export function useAdvisoryTasks(options?: {
  enabled?: boolean;
  overviewFallback?: ClientTask[];
}): {
  items: ActionItem[];
  loading: boolean;
  error: string | null;
  toggleItem: (id: string) => Promise<void>;
  reload: () => void;
} {
  const demoMode = useLocalSampleData();
  const enabled = options?.enabled ?? true;
  const overviewFallback = options?.overviewFallback;

  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useLayoutEffect(() => {
    if (demoMode || usesLocalSampleData()) {
      setItems(MOCK_TASKS);
      setLoading(false);
      setError(null);
      return;
    }
    if (isOfflineSession()) {
      setItems([]);
      setLoading(false);
      setError(null);
    }
  }, [demoMode]);

  useEffect(() => {
    if (!enabled || demoMode || usesLocalSampleData() || isOfflineSession()) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTasks("all")
      .then((tasks) => {
        if (cancelled) return;
        if (tasks.length > 0) {
          setItems(mapTasks(tasks));
          return;
        }
        if (overviewFallback && overviewFallback.length > 0) {
          setItems(mapTasks(overviewFallback));
          return;
        }
        setItems([]);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof SessionExpiredError) return;
        if (overviewFallback && overviewFallback.length > 0) {
          setItems(mapTasks(overviewFallback));
          return;
        }
        setError(
          err instanceof Error ? err.message : "Could not load tasks.",
        );
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode, enabled, overviewFallback, tick]);

  const toggleItem = useCallback(
    async (id: string) => {
      let current: ActionItem | undefined;
      setItems((prev) => {
        current = prev.find((item) => item.id === id);
        if (!current) return prev;
        return prev.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item,
        );
      });
      if (!current) return;

      const nextStatus = current.done ? "open" : "done";
      if (demoMode) return;

      try {
        await updateTaskStatus(id, nextStatus);
      } catch (err) {
        const priorDone = current.done;
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, done: priorDone } : item,
          ),
        );
        if (err instanceof SessionExpiredError) return;
        throw err;
      }
    },
    [demoMode],
  );

  return { items, loading, error, toggleItem, reload };
}

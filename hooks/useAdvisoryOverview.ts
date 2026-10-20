"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useLocalSampleData } from "@/hooks/useLocalSampleData";
import { usesLocalSampleData } from "@/lib/demo-mode";
import {
  fetchAdvisoryOverview,
  type AdvisoryOverview,
} from "@/lib/book-api";
import { SessionExpiredError } from "@/lib/dashboard-api";
import { isOfflineSession } from "@/lib/session-expired";

export function useAdvisoryOverview(): {
  loading: boolean;
  noAdvisor: boolean;
  overview: AdvisoryOverview | null;
  error: string | null;
  reload: () => void;
} {
  const localSample = useLocalSampleData();
  const [loading, setLoading] = useState(true);
  const [noAdvisor, setNoAdvisor] = useState(false);
  const [overview, setOverview] = useState<AdvisoryOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useLayoutEffect(() => {
    if (localSample || usesLocalSampleData()) {
      setLoading(false);
      setNoAdvisor(false);
      setOverview(null);
      setError(null);
      return;
    }
    if (isOfflineSession()) {
      setLoading(false);
      setNoAdvisor(true);
      setOverview(null);
      setError(null);
    }
  }, [localSample]);

  useEffect(() => {
    if (usesLocalSampleData() || isOfflineSession()) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAdvisoryOverview()
      .then((result) => {
        if (cancelled) return;
        if (result.kind === "no_advisor") {
          setNoAdvisor(true);
          setOverview(null);
          return;
        }
        setNoAdvisor(false);
        setOverview(result.overview);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof SessionExpiredError) return;
        setError(
          err instanceof Error ? err.message : "Could not load advisory data.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [localSample, tick]);

  return { loading, noAdvisor, overview, error, reload };
}

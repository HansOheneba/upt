"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocalSampleData } from "@/hooks/useLocalSampleData";
import { usesLocalSampleData } from "@/lib/demo-mode";
import {
  CONFLICT_COPY,
  fetchMessageThread,
  isNoAdvisorError,
  markThreadRead,
  sendMessage,
  type ThreadMessage,
} from "@/lib/book-api";
import { SessionExpiredError } from "@/lib/dashboard-api";
import { isOfflineSession } from "@/lib/session-expired";
import { MOCK_MESSAGES } from "@/lib/advisory-mock";

export function useAdvisoryMessages(options: {
  enabled: boolean;
  active: boolean;
}): {
  items: ThreadMessage[];
  loading: boolean;
  sending: boolean;
  body: string;
  setBody: (value: string) => void;
  send: () => Promise<void>;
  reload: () => void;
} {
  const demoMode = useLocalSampleData();
  const { enabled, active } = options;

  const [items, setItems] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [tick, setTick] = useState(0);
  const loadedRef = useRef(false);

  const reload = useCallback(() => {
    loadedRef.current = false;
    setTick((n) => n + 1);
  }, []);

  const load = useCallback(async () => {
    if (!enabled || demoMode || usesLocalSampleData() || isOfflineSession()) return;
    setLoading(true);
    try {
      const thread = await fetchMessageThread(1, 50);
      setItems(thread.items.filter((m) => m.author !== "note"));
      await markThreadRead();
      loadedRef.current = true;
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      if (isNoAdvisorError(err)) {
        toast.error(CONFLICT_COPY.noAdvisor);
        return;
      }
      toast.error("Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [enabled, demoMode]);

  useLayoutEffect(() => {
    if (demoMode || usesLocalSampleData()) {
      setItems(MOCK_MESSAGES);
      setLoading(false);
      return;
    }
    if (isOfflineSession()) {
      setItems([]);
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    if (!active || !enabled || demoMode || usesLocalSampleData() || isOfflineSession()) return;
    if (loadedRef.current) return;
    void load();
  }, [active, enabled, demoMode, load, tick]);

  const send = useCallback(async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);

    if (demoMode) {
      setItems((prev) => [
        ...prev,
        {
          messageId: `local-${Date.now()}`,
          author: "client",
          body: text,
          createdAt: new Date().toISOString(),
        },
      ]);
      setBody("");
      setSending(false);
      return;
    }

    try {
      const sent = await sendMessage(text);
      setBody("");
      if (sent && sent.author !== "note") {
        setItems((prev) => [...prev, sent]);
      } else {
        await load();
      }
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      if (isNoAdvisorError(err)) {
        toast.error(CONFLICT_COPY.noAdvisor);
        return;
      }
      toast.error("Could not send message.");
    } finally {
      setSending(false);
    }
  }, [body, demoMode, load, sending]);

  return { items, loading, sending, body, setBody, send, reload };
}

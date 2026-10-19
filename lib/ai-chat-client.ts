import type { FinancialSnapshot } from "@/lib/celerey-ai-local";
import { brand } from "@/lib/tenant";

export type AiChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type AiChatErrorResponse = {
  error?: string;
};

export async function streamAiChatReply(params: {
  messages: AiChatTurn[];
  snapshot: FinancialSnapshot;
  isDemo: boolean;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
}): Promise<string> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: params.messages,
      snapshot: params.snapshot,
      isDemo: params.isDemo,
    }),
    signal: params.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as AiChatErrorResponse;
    throw new Error(data.error ?? `Could not reach ${brand.aiAssistantName}.`);
  }

  if (!contentType.includes("text/event-stream") || !response.body) {
    throw new Error(`${brand.aiAssistantName} returned an unexpected response.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event.trim();
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as { delta?: string };
          if (parsed.delta) {
            full += parsed.delta;
            params.onDelta(full);
          }
        } catch {
          // Skip malformed SSE chunks.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const reply = full.trim();
  if (!reply) {
    throw new Error(`${brand.aiAssistantName} returned an empty response.`);
  }

  return reply;
}

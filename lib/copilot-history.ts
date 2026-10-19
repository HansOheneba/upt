"use client";

import * as React from "react";

export type StoredMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
  timestamp: string;
};

export type StoredChat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
};

type HistoryFile = {
  activeId: string | null;
  chats: StoredChat[];
};

const MAX_CHATS = 40;

function storageKey(scope: string) {
  return `celerey-copilot-history:${scope}`;
}

export function chatTitleFromMessage(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  if (clean.length <= 48) return clean;
  const slice = clean.slice(0, 48);
  const space = slice.lastIndexOf(" ");
  const base = (space > 20 ? slice.slice(0, space) : slice).trim();
  return `${base}...`;
}

function isMessage(value: unknown): value is StoredMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as StoredMessage;
  return (
    typeof message.id === "string" &&
    (message.role === "ai" || message.role === "user") &&
    typeof message.text === "string" &&
    typeof message.timestamp === "string"
  );
}

function isChat(value: unknown): value is StoredChat {
  if (!value || typeof value !== "object") return false;
  const chat = value as StoredChat;
  return (
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    typeof chat.createdAt === "string" &&
    typeof chat.updatedAt === "string" &&
    Array.isArray(chat.messages) &&
    chat.messages.every(isMessage)
  );
}

export function loadCopilotHistory(scope: string): HistoryFile {
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return { activeId: null, chats: [] };
    const parsed = JSON.parse(raw) as Partial<HistoryFile>;
    const chats = Array.isArray(parsed.chats) ? parsed.chats.filter(isChat) : [];
    const activeId =
      typeof parsed.activeId === "string" &&
      chats.some((chat) => chat.id === parsed.activeId)
        ? parsed.activeId
        : null;
    return { activeId, chats };
  } catch {
    return { activeId: null, chats: [] };
  }
}

export function saveCopilotHistory(scope: string, history: HistoryFile) {
  try {
    window.localStorage.setItem(
      storageKey(scope),
      JSON.stringify({
        activeId: history.activeId,
        chats: history.chats.slice(0, MAX_CHATS),
      }),
    );
  } catch {
    // Storage can be full or blocked. The open chat still works for this visit.
  }
}

export function useCopilotHistory(scope: string | null) {
  const [chats, setChats] = React.useState<StoredChat[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const chatsRef = React.useRef<StoredChat[]>([]);
  const activeIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!scope) return;
    const stored = loadCopilotHistory(scope);
    chatsRef.current = stored.chats;
    activeIdRef.current = stored.activeId;
    setChats(stored.chats);
    setActiveId(stored.activeId);
    setReady(true);
  }, [scope]);

  const write = React.useCallback(
    (nextActiveId: string | null, nextChats: StoredChat[]) => {
      if (!scope) return;
      const chats = nextChats.slice(0, MAX_CHATS);
      chatsRef.current = chats;
      activeIdRef.current = nextActiveId;
      setChats(chats);
      setActiveId(nextActiveId);
      saveCopilotHistory(scope, { activeId: nextActiveId, chats });
    },
    [scope],
  );

  return { chats, activeId, ready, chatsRef, activeIdRef, write };
}

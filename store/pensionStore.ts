"use client";

import { create } from "zustand";
import { pensionStorageKey } from "@/lib/local-view";
import {
  DEMO_MEMBER,
  PREVIEW_REQUESTS,
  PREVIEW_WITHDRAWALS,
  PREVIEW_CONTRIBUTIONS,
  emptyMember,
  type JoinInput,
  memberFromJoin,
} from "@/lib/pension/demo-data";
import type {
  PensionRequest,
  PensionSnapshot,
  Withdrawal,
} from "@/lib/pension/types";
import { WITHDRAWAL_LOAD_ERROR } from "@/lib/pension/withdrawals";

const EMPTY: PensionSnapshot = {
  member: null,
  contributions: [],
  withdrawals: [],
  requests: [],
};

function readSnapshot(): { snapshot: PensionSnapshot; error: string | null } {
  if (typeof window === "undefined") return { snapshot: EMPTY, error: null };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(pensionStorageKey());
  } catch {
    return { snapshot: EMPTY, error: WITHDRAWAL_LOAD_ERROR };
  }
  if (!raw) return { snapshot: EMPTY, error: null };
  try {
    const parsed = JSON.parse(raw) as PensionSnapshot;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { snapshot: EMPTY, error: WITHDRAWAL_LOAD_ERROR };
    }
    if ("withdrawals" in parsed && parsed.withdrawals != null && !Array.isArray(parsed.withdrawals)) {
      return { snapshot: EMPTY, error: WITHDRAWAL_LOAD_ERROR };
    }
    return {
      error: null,
      snapshot: {
        member: parsed.member ?? null,
        contributions: Array.isArray(parsed.contributions) ? parsed.contributions : [],
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      },
    };
  } catch {
    return { snapshot: EMPTY, error: WITHDRAWAL_LOAD_ERROR };
  }
}

function writeSnapshot(snapshot: PensionSnapshot): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(pensionStorageKey(), JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export type NewWithdrawal = Omit<Withdrawal, "id" | "submittedAt" | "status">;

type PensionStore = PensionSnapshot & {
  hydrated: boolean;
  loadError: string | null;
  hydrate: () => void;
  reload: () => void;
  loadPreview: () => void;
  loadEmpty: (email: string) => void;
  loadJoined: (input: JoinInput) => void;
  /** Drops the in-memory snapshot. The saved local view stays on disk. */
  clear: () => void;
  addWithdrawal: (input: NewWithdrawal) => void;
  addRequest: (input: { subject: string; body: string }) => boolean;
  updateTargets: (input: { targetPot: number; retirementAge: number }) => void;
};

function commit(
  set: (partial: Partial<PensionStore>) => void,
  snapshot: PensionSnapshot,
): void {
  writeSnapshot(snapshot);
  set({ ...snapshot, hydrated: true, loadError: null });
}

export const usePensionStore = create<PensionStore>((set, get) => ({
  ...EMPTY,
  hydrated: false,
  loadError: null,

  hydrate: () => {
    if (get().hydrated && get().member) return;
    const { snapshot, error } = readSnapshot();
    set({ ...snapshot, hydrated: true, loadError: error });
  },

  reload: () => {
    const { snapshot, error } = readSnapshot();
    set({ ...snapshot, hydrated: true, loadError: error });
  },

  loadPreview: () => {
    commit(set, {
      member: DEMO_MEMBER,
      contributions: PREVIEW_CONTRIBUTIONS,
      withdrawals: PREVIEW_WITHDRAWALS,
      requests: PREVIEW_REQUESTS,
    });
  },

  loadEmpty: (email) => {
    commit(set, {
      member: emptyMember(email),
      contributions: [],
      withdrawals: [],
      requests: [],
    });
  },

  loadJoined: (input) => {
    const member = memberFromJoin(input);
    commit(set, {
      member,
      contributions: [],
      withdrawals: [],
      requests: [],
    });
  },

  clear: () => {
    set({ ...EMPTY, hydrated: true, loadError: null });
  },

  addWithdrawal: (input) => {
    const withdrawal: Withdrawal = {
      ...input,
      id: `wd-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: "received",
    };
    const next: PensionSnapshot = {
      member: get().member,
      contributions: get().contributions,
      withdrawals: [withdrawal, ...get().withdrawals],
      requests: get().requests,
    };
    commit(set, next);
  },

  updateTargets: ({ targetPot, retirementAge }) => {
    const member = get().member;
    if (!member) return;
    commit(set, {
      member: { ...member, targetPot, retirementAge },
      contributions: get().contributions,
      withdrawals: get().withdrawals,
      requests: get().requests,
    });
  },

  addRequest: ({ subject, body }) => {
    const request: PensionRequest = {
      id: `req-${Date.now()}`,
      subject: subject.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString(),
      channel: "app",
      status: "open",
    };
    const next: PensionSnapshot = {
      member: get().member,
      contributions: get().contributions,
      withdrawals: get().withdrawals,
      requests: [request, ...get().requests],
    };
    if (!writeSnapshot(next)) return false;
    set({ ...next, hydrated: true, loadError: null });
    return true;
  },
}));

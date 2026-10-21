"use client";

import { create } from "zustand";
import { pensionStorageKey } from "@/lib/local-view";
import {
  emptySnapshot,
  joinedSnapshot,
  previewSnapshot,
  type JoinInput,
} from "@/lib/pension/demo-data";
import { normalizeSnapshot } from "@/lib/pension/migrate";
import { personalMembership, withdrawalPot } from "@/lib/pension/portfolio";
import type {
  PensionRequest,
  PensionSnapshot,
  Withdrawal,
} from "@/lib/pension/types";
import {
  WITHDRAWAL_LOAD_ERROR,
  WITHDRAWAL_SAVE_ERROR,
  submitWithdrawal,
  type WithdrawalDraft,
} from "@/lib/pension/withdrawals";

const EMPTY: PensionSnapshot = {
  member: null,
  memberships: [],
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
    const parsed = JSON.parse(raw) as unknown;
    const snapshot = normalizeSnapshot(parsed);
    if (!snapshot) return { snapshot: EMPTY, error: WITHDRAWAL_LOAD_ERROR };
    return { snapshot, error: null };
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

export type NewWithdrawal = WithdrawalDraft;

export type WithdrawalSaveResult =
  | { ok: true; withdrawal: Withdrawal }
  | { ok: false; error: string };

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
  addWithdrawal: (input: NewWithdrawal) => WithdrawalSaveResult;
  addRequest: (input: { subject: string; body: string; membershipId: string }) => boolean;
  updateTargets: (input: { targetPot: number; retirementAge: number }) => void;
};

function commit(
  set: (partial: Partial<PensionStore>) => void,
  snapshot: PensionSnapshot,
): void {
  writeSnapshot(snapshot);
  set({ ...snapshot, hydrated: true, loadError: null });
}

function currentSnapshot(get: () => PensionStore): PensionSnapshot {
  return {
    member: get().member,
    memberships: get().memberships,
    contributions: get().contributions,
    withdrawals: get().withdrawals,
    requests: get().requests,
  };
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
    commit(set, previewSnapshot());
  },

  loadEmpty: (email) => {
    commit(set, emptySnapshot(email));
  },

  loadJoined: (input) => {
    commit(set, joinedSnapshot(input));
  },

  clear: () => {
    set({ ...EMPTY, hydrated: true, loadError: null });
  },

  addWithdrawal: (input) => {
    const current = currentSnapshot(get);
    const result = submitWithdrawal(current, input, new Date(), (membership) =>
      withdrawalPot(membership, current.contributions, current.withdrawals),
    );
    if (!result.ok) return result;
    if (result.duplicate) return { ok: true, withdrawal: result.withdrawal };
    const next: PensionSnapshot = {
      ...current,
      withdrawals: [result.withdrawal, ...current.withdrawals],
    };
    if (!writeSnapshot(next)) return { ok: false, error: WITHDRAWAL_SAVE_ERROR };
    set({ ...next, hydrated: true, loadError: null });
    return { ok: true, withdrawal: result.withdrawal };
  },

  updateTargets: ({ targetPot, retirementAge }) => {
    const current = currentSnapshot(get);
    const personal = personalMembership(current.memberships);
    if (!current.member || !personal) return;
    commit(set, {
      ...current,
      memberships: current.memberships.map((membership) =>
        membership.id === personal.id
          ? { ...membership, targetPot, retirementAge }
          : membership,
      ),
    });
  },

  addRequest: ({ subject, body, membershipId }) => {
    const request: PensionRequest = {
      id: `req-${Date.now()}`,
      membershipId,
      subject: subject.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString(),
      channel: "app",
      status: "open",
    };
    const current = currentSnapshot(get);
    const next: PensionSnapshot = {
      ...current,
      requests: [request, ...current.requests],
    };
    if (!writeSnapshot(next)) return false;
    set({ ...next, hydrated: true, loadError: null });
    return true;
  },
}));

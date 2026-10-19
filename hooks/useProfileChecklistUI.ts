"use client";

import React from "react";
import { useFinancialStore } from "@/store/financialStore";
import {
  buildProfileChecklist,
  type ProfileChecklistItem,
  type ProfileStoreSnapshot,
} from "@/lib/profile-checklist";
import { getChecklistIcon } from "@/lib/profile-checklist-icons";

export type ProfileChecklistUIItem = ProfileChecklistItem & {
  icon: React.ReactNode;
  onAction?: () => void;
};

export function toProfileStoreSnapshot(
  state: ReturnType<typeof useFinancialStore.getState>,
): ProfileStoreSnapshot {
  return {
    user: state.user,
    incomeRows: state.incomeRows,
    expenseCategories: state.expenseCategories,
    goals: state.goals,
    retirement: state.retirement,
    liabilities: state.liabilities,
    propertyAssets: state.propertyAssets,
    emergencyFund: state.emergencyFund,
    holdings: state.holdings,
    accounts: state.accounts,
    insurancePolicies: state.insurancePolicies,
    riskAssessment: state.riskAssessment ?? null,
  };
}

type Options = {
  iconClass?: string;
  onRiskQuiz?: () => void;
};

export function useProfileChecklistUI(options: Options = {}) {
  const iconClass = options.iconClass ?? "h-3.5 w-3.5";
  const store = useFinancialStore();

  const snapshot = React.useMemo(
    () => toProfileStoreSnapshot(store),
    [
      store.user,
      store.incomeRows,
      store.expenseCategories,
      store.goals,
      store.retirement,
      store.liabilities,
      store.propertyAssets,
      store.emergencyFund,
      store.holdings,
      store.accounts,
      store.insurancePolicies,
      store.riskAssessment,
    ],
  );

  const { basics, completePicture } = React.useMemo(
    () => buildProfileChecklist(snapshot),
    [snapshot],
  );

  const toUIItem = React.useCallback(
    (item: ProfileChecklistItem): ProfileChecklistUIItem => {
      if (item.id === "risk-assessment" && options.onRiskQuiz) {
        return {
          ...item,
          href: undefined,
          onAction: options.onRiskQuiz,
          icon: getChecklistIcon(item.id, iconClass),
        };
      }
      return {
        ...item,
        icon: getChecklistIcon(item.id, iconClass),
      };
    },
    [iconClass, options.onRiskQuiz],
  );

  const basicsItems = React.useMemo(
    () => basics.map(toUIItem),
    [basics, toUIItem],
  );
  const completePictureItems = React.useMemo(
    () => completePicture.map(toUIItem),
    [completePicture, toUIItem],
  );

  const totalItems = basicsItems.length + completePictureItems.length;
  const completedItems =
    basicsItems.filter((i) => i.completed).length +
    completePictureItems.filter((i) => i.completed).length;

  return {
    basicsItems,
    completePictureItems,
    totalItems,
    completedItems,
    score: store.profileCompletionScore,
  };
}

import { useEffect } from "react";
import { useFinancialStore } from "@/store/financialStore";

export function useMonthlySnapshot(): void {
  useEffect(() => {
    const store = useFinancialStore.getState();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const income = store.incomeRows.reduce((s, i) => s + i.amount, 0);
    const expenses = store.expenseCategories.reduce((s, e) => s + e.amount, 0);
    if (income === 0 && expenses === 0) return;
    store.addCashFlowPoint({ month: currentMonth, income, expenses });
  }, []);
}
